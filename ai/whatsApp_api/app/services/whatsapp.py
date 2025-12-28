"""
WhatsApp Cloud API Service.
Handles sending messages via the official Meta WhatsApp Cloud API.
"""

import httpx
import logging
from typing import Optional, List, Dict, Any

from app.config import get_settings
from app.models import (
    WhatsAppWebhookPayload,
    IncomingMessage,
    WhatsAppSendTextMessage,
    WhatsAppSendTextBody,
    WhatsAppSendInteractiveMessage,
    WhatsAppInteractiveContent,
    WhatsAppInteractiveBody,
    WhatsAppInteractiveAction,
    WhatsAppInteractiveButton,
    WhatsAppButtonReply
)

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for interacting with WhatsApp Cloud API."""
    
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={
                    "Authorization": f"Bearer {self.settings.whatsapp_access_token}",
                    "Content-Type": "application/json"
                }
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    def parse_incoming_message(self, payload: dict) -> Optional[IncomingMessage]:
        """
        Parse incoming WhatsApp webhook payload and extract message details.
        
        Args:
            payload: Raw webhook payload from WhatsApp.
            
        Returns:
            IncomingMessage if a text message is found, None otherwise.
        """
        try:
            webhook_data = WhatsAppWebhookPayload(**payload)
            
            for entry in webhook_data.entry:
                for change in entry.changes:
                    if change.value.messages:
                        for message in change.value.messages:
                            # Only process text messages
                            if message.type == "text" and message.text:
                                return IncomingMessage(
                                    phone_number=message.from_,
                                    message=message.text.body,
                                    message_id=message.id,
                                    timestamp=message.timestamp
                                )
            
            logger.debug("No text message found in webhook payload")
            return None
            
        except Exception as e:
            logger.error(f"Error parsing webhook payload: {e}")
            return None
    
    async def send_text_message(self, phone_number: str, message: str) -> bool:
        """
        Send a text message via WhatsApp Cloud API.
        
        Args:
            phone_number: Recipient's phone number (without + prefix).
            message: Text message to send.
            
        Returns:
            True if message sent successfully, False otherwise.
        """
        url = f"{self.settings.whatsapp_api_base_url}/messages"
        
        payload = WhatsAppSendTextMessage(
            to=phone_number,
            text=WhatsAppSendTextBody(body=message)
        )
        
        try:
            response = await self.client.post(url, json=payload.model_dump())
            
            if response.status_code == 200:
                logger.info(f"Message sent successfully to {phone_number}")
                return True
            else:
                logger.error(f"Failed to send message: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {e}")
            return False
    
    async def send_interactive_message(
        self, 
        phone_number: str, 
        message: str,
        buttons: List[Dict[str, str]]
    ) -> bool:
        """
        Send an interactive message with buttons via WhatsApp Cloud API.
        
        Args:
            phone_number: Recipient's phone number (without + prefix).
            message: Text message body.
            buttons: List of button dictionaries with 'id' and 'title' keys.
            
        Returns:
            True if message sent successfully, False otherwise.
        """
        url = f"{self.settings.whatsapp_api_base_url}/messages"
        
        # Convert button dicts to WhatsApp button format (max 3 buttons)
        wa_buttons = []
        for btn in buttons[:3]:  # WhatsApp limits to 3 buttons
            wa_buttons.append(
                WhatsAppInteractiveButton(
                    reply=WhatsAppButtonReply(
                        id=btn.get("id", btn.get("title", "btn")),
                        title=btn.get("title", "Button")[:20]  # Max 20 chars
                    )
                )
            )
        
        payload = WhatsAppSendInteractiveMessage(
            to=phone_number,
            interactive=WhatsAppInteractiveContent(
                body=WhatsAppInteractiveBody(text=message),
                action=WhatsAppInteractiveAction(buttons=wa_buttons)
            )
        )
        
        try:
            response = await self.client.post(url, json=payload.model_dump())
            
            if response.status_code == 200:
                logger.info(f"Interactive message sent successfully to {phone_number}")
                return True
            else:
                logger.error(f"Failed to send interactive message: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending WhatsApp interactive message: {e}")
            return False


# Singleton instance
_whatsapp_service: Optional[WhatsAppService] = None


def get_whatsapp_service() -> WhatsAppService:
    """Get singleton WhatsApp service instance."""
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service
