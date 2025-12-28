"""
Customer Chatbot API Service.
Handles communication with the AI chatbot service.
"""

import httpx
import logging
from typing import Optional

from app.config import get_settings
from app.models import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)


class ChatbotService:
    """Service for interacting with Customer Chatbot API."""
    
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=60.0,  # AI processing may take time
                headers={"Content-Type": "application/json"}
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    async def send_message(self, phone_number: str, message: str) -> Optional[ChatResponse]:
        """
        Send a message to the Customer Chatbot API and get the AI response.
        
        Args:
            phone_number: Customer's phone number.
            message: Message text from the customer.
            
        Returns:
            ChatResponse with AI-generated reply, or None if request failed.
        """
        url = f"{self.settings.chatbot_api_url}/api/webhook/chat"
        
        payload = ChatRequest(
            phone_number=phone_number,
            message=message
        )
        
        try:
            logger.info(f"Sending message to chatbot API for {phone_number}")
            logger.debug(f"Request: {payload.model_dump_json()}")
            
            response = await self.client.post(url, json=payload.model_dump())
            
            if response.status_code == 200:
                response_data = response.json()
                chat_response = ChatResponse(**response_data)
                logger.info(f"Received chatbot response for {phone_number}")
                logger.debug(f"Response: {chat_response.model_dump_json()}")
                return chat_response
            else:
                logger.error(f"Chatbot API error: {response.status_code} - {response.text}")
                return None
                
        except httpx.TimeoutException:
            logger.error(f"Timeout calling chatbot API for {phone_number}")
            return None
        except Exception as e:
            logger.error(f"Error calling chatbot API: {e}")
            return None
    
    async def health_check(self) -> bool:
        """
        Check if the chatbot service is healthy.
        
        Returns:
            True if chatbot service is responding, False otherwise.
        """
        url = f"{self.settings.chatbot_api_url}/health"
        
        try:
            response = await self.client.get(url, timeout=5.0)
            return response.status_code == 200
        except Exception:
            return False


# Singleton instance
_chatbot_service: Optional[ChatbotService] = None


def get_chatbot_service() -> ChatbotService:
    """Get singleton Chatbot service instance."""
    global _chatbot_service
    if _chatbot_service is None:
        _chatbot_service = ChatbotService()
    return _chatbot_service
