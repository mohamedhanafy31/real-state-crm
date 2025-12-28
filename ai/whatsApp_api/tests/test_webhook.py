"""
Tests for WhatsApp webhook endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.config import Settings


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_settings():
    """Mock settings with test values."""
    return Settings(
        whatsapp_verify_token="test_token",
        whatsapp_access_token="test_access",
        whatsapp_phone_number_id="123456789",
        chatbot_api_url="http://localhost:8000"
    )


class TestWebhookVerification:
    """Tests for webhook verification endpoint."""
    
    def test_verify_webhook_success(self, client, mock_settings):
        """Test successful webhook verification."""
        with patch("app.api.routes.webhook.get_settings", return_value=mock_settings):
            response = client.get(
                "/webhook",
                params={
                    "hub.mode": "subscribe",
                    "hub.verify_token": "test_token",
                    "hub.challenge": "challenge123"
                }
            )
        
        assert response.status_code == 200
        assert response.text == "challenge123"
    
    def test_verify_webhook_invalid_token(self, client, mock_settings):
        """Test webhook verification with invalid token."""
        with patch("app.api.routes.webhook.get_settings", return_value=mock_settings):
            response = client.get(
                "/webhook",
                params={
                    "hub.mode": "subscribe",
                    "hub.verify_token": "wrong_token",
                    "hub.challenge": "challenge123"
                }
            )
        
        assert response.status_code == 403
    
    def test_verify_webhook_invalid_mode(self, client, mock_settings):
        """Test webhook verification with invalid mode."""
        with patch("app.api.routes.webhook.get_settings", return_value=mock_settings):
            response = client.get(
                "/webhook",
                params={
                    "hub.mode": "invalid",
                    "hub.verify_token": "test_token",
                    "hub.challenge": "challenge123"
                }
            )
        
        assert response.status_code == 403


class TestWebhookReceive:
    """Tests for webhook message receiving endpoint."""
    
    def test_receive_empty_payload(self, client):
        """Test receiving webhook with no messages."""
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
                        }
                    },
                    "field": "messages"
                }]
            }]
        }
        
        response = client.post("/webhook", json=payload)
        
        assert response.status_code == 200
        assert response.json()["status"] == "received"
    
    def test_receive_text_message(self, client):
        """Test receiving a text message."""
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
                            "text": {"body": "Hello!"}
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        
        # Mock both services
        with patch("app.api.routes.webhook.get_chatbot_service") as mock_chatbot, \
             patch("app.api.routes.webhook.get_whatsapp_service") as mock_whatsapp:
            
            # Setup chatbot mock
            mock_chatbot_instance = AsyncMock()
            mock_chatbot_instance.send_message.return_value = AsyncMock(
                phone_number="201234567890",
                response="Hello! How can I help?",
                intent="greeting",
                confirmation_buttons=None,
                timestamp="2025-01-01T00:00:00"
            )
            mock_chatbot.return_value = mock_chatbot_instance
            
            # Setup whatsapp mock
            mock_whatsapp_instance = AsyncMock()
            mock_whatsapp_instance.parse_incoming_message.return_value = AsyncMock(
                phone_number="201234567890",
                message="Hello!",
                message_id="msg123",
                timestamp="1234567890"
            )
            mock_whatsapp_instance.send_text_message.return_value = True
            mock_whatsapp.return_value = mock_whatsapp_instance
            
            response = client.post("/webhook", json=payload)
        
        assert response.status_code == 200


class TestHealthCheck:
    """Tests for health check endpoints."""
    
    def test_root_health_check(self, client):
        """Test root endpoint returns healthy status."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "whatsapp-orchestrator"
    
    def test_health_endpoint(self, client):
        """Test /health endpoint."""
        with patch("app.main.get_chatbot_service") as mock_service:
            mock_instance = AsyncMock()
            mock_instance.health_check.return_value = True
            mock_service.return_value = mock_instance
            
            response = client.get("/health")
        
        assert response.status_code == 200
        assert response.json()["status"] in ["healthy", "degraded"]
