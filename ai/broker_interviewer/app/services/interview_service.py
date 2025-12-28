"""
Interview orchestration service.
Main logic for conducting the AI interview.
"""

import random
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.llm import get_llm_service, LLMService
from app.core.prompts import INTERVIEW_SYSTEM_PROMPT
from app.models.interview_phases import INTERVIEW_PHASES, get_phase
from app.services.scoring_service import get_scoring_service, ScoringService, normalize_red_flag
from app.utils.logging_config import log_interview_event

logger = logging.getLogger(__name__)
interview_logger = logging.getLogger('interview')


class InterviewService:
    """Service for orchestrating broker interviews."""
    
    def __init__(self):
        self.llm: LLMService = get_llm_service()
        self.scoring: ScoringService = get_scoring_service()
        
    def _select_phase_questions(self, phase_number: int) -> List[Dict]:
        """Select questions for a phase (random selection for some phases)."""
        phase = get_phase(phase_number)
        questions = phase["questions"]
        
        # Check if this phase requires random selection
        random_select = phase.get("random_select")
        if random_select:
            # Randomly select subset of questions
            return random.sample(questions, min(random_select, len(questions)))
        
        return questions
        
    def _build_system_prompt(
        self,
        phase_number: int,
        conversation_history: List[Dict]
    ) -> str:
        """Build system prompt for current phase."""
        phase = get_phase(phase_number)
        questions = self._select_phase_questions(phase_number)
        
        # Format questions for prompt
        questions_text = "\n".join([
            f"- {q['text_ar']} / {q['text_en']}"
            for q in questions
        ])
        
        # Format conversation history
        history_text = "\n".join([
            f"{msg.get('role', 'user').upper()}: {msg.get('content', '')}"
            for msg in conversation_history[-10:]  # Last 10 messages
        ]) if conversation_history else "No previous messages"
        
        return INTERVIEW_SYSTEM_PROMPT.format(
            phase_name=phase["name"],
            phase_number=phase_number,
            max_score=phase["max_score"],
            phase_questions=questions_text,
            conversation_history=history_text
        )
        
    async def start_interview(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Start or resume an interview session.
        
        Args:
            session_state: Current session state from backend
            
        Returns:
            First question and updated state
        """
        session_id = session_state.get("sessionId", 0)
        phase_number = session_state.get("currentPhase", 1)
        conversation_context = session_state.get("conversationContext", [])
        
        log_interview_event(
            session_id=session_id,
            event_type="START",
            phase=phase_number,
            message=f"Starting interview at phase {phase_number}"
        )
        
        phase = get_phase(phase_number)
        questions = self._select_phase_questions(phase_number)
        
        interview_logger.debug(f"[Session:{session_id}] Selected {len(questions)} questions for phase {phase_number}")
        
        # Get first question
        first_question = questions[0]
        question_text = first_question["text_ar"]  # Default to Arabic
        
        # Add greeting for new interviews
        if not conversation_context:
            greeting = "أهلاً بيك في المقابلة! أنا هسألك كام سؤال عشان نتعرف على خبرتك في السمسرة العقارية. يلا نبدأ..."
            question_text = f"{greeting}\n\n{question_text}"
            interview_logger.info(f"[Session:{session_id}] New interview started")
            
        # Update conversation context
        conversation_context.append({
            "role": "assistant",
            "content": question_text,
            "timestamp": datetime.now().isoformat(),
            "phase": phase_number,
            "question_key": first_question["key"]
        })
        
        interview_logger.info(f"[Session:{session_id}] Sent question: {first_question['key']}")
        
        return {
            "message": question_text,
            "phase": phase_number,
            "phase_name": phase["name"],
            "question_index": 0,
            "total_questions": len(questions),
            "conversation_context": conversation_context
        }
        
    async def process_response(
        self,
        session_state: Dict[str, Any],
        applicant_response: str
    ) -> Dict[str, Any]:
        """
        Process applicant's response and get next question or complete interview.
        
        Args:
            session_state: Current session state
            applicant_response: Applicant's answer text
            
        Returns:
            Next question, phase completion, or interview completion
        """
        phase_number = session_state.get("currentPhase", 1)
        question_index = session_state.get("phaseQuestionIndex", 0)
        conversation_context = session_state.get("conversationContext", [])
        
        phase = get_phase(phase_number)
        questions = self._select_phase_questions(phase_number)
        
        # Add applicant's response to context
        conversation_context.append({
            "role": "user",
            "content": applicant_response,
            "timestamp": datetime.now().isoformat()
        })
        
        # Evaluate response
        current_question = questions[question_index] if question_index < len(questions) else questions[-1]
        evaluation = await self.llm.evaluate_response(
            applicant_response=applicant_response,
            question=current_question["text_ar"],
            phase_name=phase["name"],
            success_criteria=phase["success_criteria"],
            red_flags=phase["red_flags"]
        )
        
        logger.info(f"Response evaluation: score={evaluation.get('score')}, flags={evaluation.get('detected_red_flags', [])}")
        
        # Check if moving to next question or next phase
        next_question_index = question_index + 1
        phase_complete = next_question_index >= len(questions)
        
        result = {
            "evaluation": evaluation,
            "score": evaluation.get("score", 5),
            "detected_red_flags": [
                normalize_red_flag(f) for f in evaluation.get("detected_red_flags", [])
            ],
            "phase": phase_number,
            "phase_name": phase["name"],
            "phase_complete": phase_complete
        }
        
        if phase_complete:
            # Calculate phase score
            # For simplicity, use the last evaluation score scaled to phase max
            phase_score = self.scoring.calculate_phase_score(
                phase_number,
                [evaluation.get("score", 5)],  # Would normally aggregate all Q scores
                phase["max_score"]
            )
            result["phase_score"] = phase_score
            
            # Check if interview complete
            if phase_number >= 6:
                result["interview_complete"] = True
            else:
                # Move to next phase
                next_phase = phase_number + 1
                next_phase_data = get_phase(next_phase)
                next_questions = self._select_phase_questions(next_phase)
                
                next_question_text = f"ممتاز! خلصنا المرحلة دي. دلوقتي هنتكلم عن {next_phase_data['name_ar']}.\n\n{next_questions[0]['text_ar']}"
                
                conversation_context.append({
                    "role": "assistant",
                    "content": next_question_text,
                    "timestamp": datetime.now().isoformat(),
                    "phase": next_phase,
                    "question_key": next_questions[0]["key"]
                })
                
                result["message"] = next_question_text
                result["next_phase"] = next_phase
                result["next_question_index"] = 0
        else:
            # Next question in same phase
            next_question = questions[next_question_index]
            
            # Generate contextual follow-up or use predefined question
            next_question_text = next_question["text_ar"]
            
            conversation_context.append({
                "role": "assistant",
                "content": next_question_text,
                "timestamp": datetime.now().isoformat(),
                "phase": phase_number,
                "question_key": next_question["key"]
            })
            
            result["message"] = next_question_text
            result["next_question_index"] = next_question_index
            
        result["conversation_context"] = conversation_context
        return result
        
    def generate_final_summary(
        self,
        phase_scores: Dict[str, float],
        red_flags: List[str],
        result: str
    ) -> str:
        """Generate final interview summary for the applicant."""
        breakdown = self.scoring.generate_score_breakdown(phase_scores, red_flags)
        
        if result == "approved":
            summary = f"""🎉 مبروك! اجتزت المقابلة بنجاح!

📊 نتيجتك النهائية: {breakdown['adjusted_score']}/100
✅ الحد الأدنى للنجاح: {breakdown['pass_threshold']}

تم قبولك كوسيط في المنصة. يمكنك الآن تسجيل الدخول والبدء في العمل.
حظ سعيد! 🏠"""
        else:
            summary = f"""😔 للأسف، لم تتمكن من اجتياز المقابلة.

📊 نتيجتك: {breakdown['adjusted_score']}/100
⚠️ الحد الأدنى المطلوب: {breakdown['pass_threshold']}

نقدر وقتك ومجهودك. للأسف لا يمكن إعادة المقابلة.
نتمنى لك التوفيق في المستقبل."""
            
        return summary


# Singleton instance
_interview_service: Optional[InterviewService] = None


def get_interview_service() -> InterviewService:
    """Get or create interview service singleton."""
    global _interview_service
    if _interview_service is None:
        _interview_service = InterviewService()
    return _interview_service
