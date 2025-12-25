"""
Pydantic models for API request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class WebhookMessage(BaseModel):
    """Incoming WhatsApp webhook message."""
    phone_number: str = Field(..., description="Customer phone number")
    message: str = Field(..., description="Message content")
    message_id: Optional[str] = Field(None, description="WhatsApp message ID")
    timestamp: Optional[str] = Field(None, description="Message timestamp")


class ChatRequest(BaseModel):
    """Direct chat request for testing."""
    phone_number: str = Field(..., description="Customer phone number")
    message: str = Field(..., description="Message content")


class ChatResponse(BaseModel):
    """Chat response from the bot."""
    phone_number: str
    response: str
    intent: Optional[str] = None
    extracted_requirements: Optional[Dict[str, Any]] = None
    is_complete: Optional[bool] = None
    confirmation_buttons: Optional[List[Dict[str, str]]] = None
    should_ask_clarification: Optional[bool] = None
    timestamp: str


class ConversationHistory(BaseModel):
    """Conversation history response."""
    phone_number: str
    messages: List[Dict[str, Any]]
    total_count: int


class HealthCheck(BaseModel):
    """Health check response."""
    status: str = "healthy"
    timestamp: str
    version: str = "1.0.0"


class WhatsAppWebhookVerification(BaseModel):
    """WhatsApp webhook verification parameters."""
    hub_mode: str = Field(..., alias="hub.mode")
    hub_verify_token: str = Field(..., alias="hub.verify_token")
    hub_challenge: str = Field(..., alias="hub.challenge")
    
    class Config:
        populate_by_name = True


class WhatsAppIncomingMessage(BaseModel):
    """Parsed WhatsApp incoming message structure."""
    object: str
    entry: List[Dict[str, Any]]
