"""
Tests for WhatsApp and Chatbot services.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.services.whatsapp import WhatsAppService
from app.services.chatbot import ChatbotService
from app.models import IncomingMessage


class TestWhatsAppService:
    """Tests for WhatsApp service."""
    
    def test_parse_incoming_message_text(self):
        """Test parsing a valid text message."""
        service = WhatsAppService()
        
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "123",
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "1234567890",
                            "phone_number_id": "123456"
                        },
                        "messages": [{
                            "from": "201234567890",
                            "id": "msg123",
                            "timestamp": "1234567890",
                            "type": "text",
                            "text": {"body": "Test message"}
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        
        result = service.parse_incoming_message(payload)
        
        assert result is not None
        assert result.phone_number == "201234567890"
        assert result.message == "Test message"
        assert result.message_id == "msg123"
    
    def test_parse_incoming_message_no_text(self):
        """Test parsing a non-text message returns None."""
        service = WhatsAppService()
        
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "123",
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "1234567890",
                            "phone_number_id": "123456"
                        },
                        "messages": [{
                            "from": "201234567890",
                            "id": "msg123",
                            "timestamp": "1234567890",
                            "type": "image"
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        
        result = service.parse_incoming_message(payload)
        
        assert result is None
    
    def test_parse_incoming_message_status_update(self):
        """Test parsing a status update (no messages) returns None."""
        service = WhatsAppService()
        
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "123",
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "1234567890",
                            "phone_number_id": "123456"
                        },
                        "statuses": [{
                            "id": "status123",
                            "status": "delivered"
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        
        result = service.parse_incoming_message(payload)
        
        assert result is None
    
    def test_parse_incoming_message_invalid_payload(self):
        """Test parsing an invalid payload returns None."""
        service = WhatsAppService()
        
        result = service.parse_incoming_message({"invalid": "data"})
        
        assert result is None


class TestChatbotService:
    """Tests for Chatbot service."""
    
    @pytest.mark.asyncio
    async def test_send_message_success(self):
        """Test successful message to chatbot."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "phone_number": "201234567890",
            "response": "Hello! How can I help?",
            "intent": "greeting",
            "timestamp": "2025-01-01T00:00:00"
        }
        
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            service = ChatbotService()
            result = await service.send_message("201234567890", "Hello")
        
        assert result is not None
        assert result.response == "Hello! How can I help?"
    
    @pytest.mark.asyncio
    async def test_send_message_error(self):
        """Test chatbot API error returns None."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            service = ChatbotService()
            result = await service.send_message("201234567890", "Hello")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test health check when chatbot is healthy."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            service = ChatbotService()
            result = await service.health_check()
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self):
        """Test health check when chatbot is down."""
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, side_effect=Exception("Connection refused")):
            service = ChatbotService()
            result = await service.health_check()
        
        assert result is False
