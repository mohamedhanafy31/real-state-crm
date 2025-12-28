"""
Cohere LLM service for conducting interviews.
"""

import cohere
import json
import logging
from typing import Dict, Any, Optional

from app.config import settings
from app.utils.logging_config import log_llm_call
import time

logger = logging.getLogger(__name__)
llm_logger = logging.getLogger('llm')


class LLMService:
    """Service for interacting with Cohere LLM API."""
    
    def __init__(self):
        self.client: Optional[cohere.ClientV2] = None
        self.model = settings.COHERE_MODEL
        
    def initialize(self):
        """Initialize the Cohere client."""
        if not settings.COHERE_API_KEY:
            raise ValueError("COHERE_API_KEY environment variable is not set")
        
        self.client = cohere.ClientV2(api_key=settings.COHERE_API_KEY)
        logger.info(f"Cohere client initialized with model: {self.model}")
        
    def validate_connectivity(self):
        """Validate connection to Cohere API."""
        if not self.client:
            self.initialize()
            
        try:
            # Simple test message
            response = self.client.chat(
                model=self.model,
                messages=[
                    {"role": "user", "content": "Hello, respond with 'OK' only."}
                ],
                max_tokens=10
            )
            logger.info("Cohere API connectivity validated successfully")
            return True
        except Exception as e:
            logger.error(f"Cohere API validation failed: {e}")
            raise
            
    async def generate_interview_response(
        self,
        system_prompt: str,
        conversation_context: list,
        user_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate AI response for interview.
        
        Args:
            system_prompt: The system prompt defining interview behavior
            conversation_context: List of previous messages
            user_message: Optional new user message to add
            
        Returns:
            Parsed JSON response from the LLM
        """
        if not self.client:
            self.initialize()
            
        # Build messages list
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in conversation_context:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            messages.append({"role": role, "content": msg.get("content", "")})
            
        # Add new user message if provided
        if user_message:
            messages.append({"role": "user", "content": user_message})
            
        try:
            llm_logger.info(f"🤖 LLM CALL: generate_interview_response")
            llm_logger.info(f"   - Model: {self.model}")
            llm_logger.info(f"   - Messages count: {len(messages)}")
            llm_logger.debug(f"   - System prompt preview: {system_prompt[:200]}...")
            
            start_time = time.time()
            response = self.client.chat(
                model=self.model,
                messages=messages,
                temperature=0.3,  # Low temperature for consistent evaluations
                max_tokens=1000
            )
            duration_ms = (time.time() - start_time) * 1000
            
            llm_logger.info(f"   ✅ LLM response received in {duration_ms:.0f}ms")
            
            # Extract response text
            response_text = response.message.content[0].text if response.message.content else ""
            
            # Try to parse as JSON
            try:
                # Clean up response if it has markdown code blocks
                clean_text = response_text
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0]
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1].split("```")[0]
                    
                return json.loads(clean_text.strip())
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse LLM response as JSON: {response_text[:200]}")
                return {
                    "raw_response": response_text,
                    "parse_error": True,
                    "next_question": "Could you please clarify your previous answer?"
                }
                
        except Exception as e:
            logger.error(f"Error generating interview response: {e}")
            llm_logger.error(f"   ❌ LLM call failed: {e}")
            raise
            
    async def evaluate_response(
        self,
        applicant_response: str,
        question: str,
        phase_name: str,
        success_criteria: list,
        red_flags: list
    ) -> Dict[str, Any]:
        """
        Evaluate a single response from the applicant.
        
        Returns:
            Dict with score, notes, and detected red flags
        """
        prompt = f"""Evaluate this broker applicant's response.

## Question Asked:
{question}

## Applicant's Response:
{applicant_response}

## Phase: {phase_name}

## Success Criteria (what makes a good answer):
{chr(10).join(f'- {c}' for c in success_criteria)}

## Red Flags (warning signs to look for):
{chr(10).join(f'- {r}' for r in red_flags)}

Respond in JSON format:
{{
  "score": <1-10>,
  "notes": "<brief evaluation>",
  "detected_red_flags": ["<list of red flags, if any>"],
  "language": "<ar/en/mixed>"
}}
"""
        
        if not self.client:
            self.initialize()
        
        llm_logger.info("="*50)
        llm_logger.info(f"🔍 LLM CALL: evaluate_response")
        llm_logger.info(f"   - Model: {self.model}")
        llm_logger.info(f"   - Phase: {phase_name}")
        llm_logger.info(f"   - Question: {question[:100]}..." if len(question) > 100 else f"   - Question: {question}")
        llm_logger.info(f"   - Response: {applicant_response[:150]}..." if len(applicant_response) > 150 else f"   - Response: {applicant_response}")
        llm_logger.info(f"   - Success criteria count: {len(success_criteria)}")
        llm_logger.info(f"   - Red flags to check: {len(red_flags)}")
            
        try:
            start_time = time.time()
            response = self.client.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=500
            )
            duration_ms = (time.time() - start_time) * 1000
            
            llm_logger.info(f"   ✅ LLM evaluation received in {duration_ms:.0f}ms")
            
            response_text = response.message.content[0].text if response.message.content else "{}"
            
            # Parse JSON
            try:
                clean_text = response_text
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0]
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1].split("```")[0]
                parsed_result = json.loads(clean_text.strip())
                
                llm_logger.info(f"   📊 Evaluation result: score={parsed_result.get('score')}, flags={parsed_result.get('detected_red_flags', [])}")
                llm_logger.info("="*50)
                
                log_llm_call(
                    operation="evaluate_response",
                    model=self.model,
                    duration_ms=duration_ms,
                    success=True
                )
                
                return parsed_result
                
            except json.JSONDecodeError:
                llm_logger.warning(f"   ⚠️ Failed to parse LLM response as JSON")
                llm_logger.debug(f"   Raw response: {response_text[:300]}")
                return {"score": 5, "notes": "Evaluation parse error", "detected_red_flags": []}
                
        except Exception as e:
            logger.error(f"Error evaluating response: {e}")
            llm_logger.error(f"   ❌ LLM evaluation failed: {e}")
            log_llm_call(
                operation="evaluate_response",
                model=self.model,
                success=False,
                error=str(e)
            )
            return {"score": 0, "notes": f"Evaluation error: {e}", "detected_red_flags": []}


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create LLM service singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
