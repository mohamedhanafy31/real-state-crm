"""
Conversation service for managing chat interactions.
Orchestrates the LangGraph workflow execution.
"""

from typing import Dict, Any, Optional
from datetime import datetime

from app.graph.workflow import get_workflow
from app.graph.state import ConversationState
from app.core.vector_store import get_vector_store
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ConversationService:
    """Service for managing customer conversations."""
    
    def __init__(self):
        """Initialize the conversation service."""
        self.workflow = get_workflow()
    
    async def process_message(
        self,
        phone_number: str,
        message: str
    ) -> Dict[str, Any]:
        """Process an incoming message and generate a response.
        
        Args:
            phone_number: Customer phone number.
            message: Message content.
            
        Returns:
            Dictionary containing response and metadata.
        """
        # Initialize state
        initial_state: ConversationState = {
            "phone_number": phone_number,
            "user_message": message,
            "conversation_history": [],
            "retrieved_context": [],
            "intent": "unknown",
            "extracted_requirements": {},
            "missing_fields": [],
            "is_complete": False,
            "response": "",
            "should_ask_clarification": False,
            "clarification_question": None,
            "timestamp": datetime.now().isoformat(),
            "error": None
        }
        
        # Execute the workflow
        logger.info(f"Executing LangGraph workflow for {phone_number}")
        logger.info(f"Input Message: {message}")
        try:
            final_state = self.workflow.invoke(initial_state)
            logger.info(f"Workflow execution complete for {phone_number} - Intent: {final_state.get('intent')}, Complete: {final_state.get('is_complete')}")
            
            return {
                "phone_number": phone_number,
                "response": final_state.get("response", "عذراً، حدث خطأ. حاول مرة أخرى."),
                "intent": final_state.get("intent"),
                "extracted_requirements": final_state.get("extracted_requirements"),
                "is_complete": final_state.get("is_complete"),
                "confirmation_buttons": final_state.get("confirmation_buttons"),
                "should_ask_clarification": final_state.get("should_ask_clarification"),
                "timestamp": final_state.get("timestamp")
            }
        except Exception as e:
            logger.error(f"Error processing message for {phone_number}: {e}", exc_info=True)
            logger.debug(f"Failed message details - Phone: {phone_number}, Message: {message}, Initial State: {initial_state}")
            return {
                "phone_number": phone_number,
                "response": "عذراً، حدث خطأ في معالجة رسالتك. سيتواصل معك أحد موظفينا قريباً.",
                "intent": None,
                "extracted_requirements": None,
                "is_complete": False,
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
    
    def get_history(
        self,
        phone_number: str,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get conversation history for a phone number.
        
        Args:
            phone_number: Customer phone number.
            limit: Maximum number of messages.
            
        Returns:
            Dictionary containing conversation history.
        """
        vector_store = get_vector_store()
        messages = vector_store.get_conversation_history(
            phone_number=phone_number,
            limit=limit
        )
        
        return {
            "phone_number": phone_number,
            "messages": messages,
            "total_count": len(messages)
        }


# Singleton instance
_conversation_service = None


def get_conversation_service() -> ConversationService:
    """Get or create conversation service instance.
    
    Returns:
        ConversationService instance.
    """
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService()
    return _conversation_service
