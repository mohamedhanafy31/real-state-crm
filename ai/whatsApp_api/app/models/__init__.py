"""
Pydantic models for WhatsApp Orchestrator API schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============ Incoming WhatsApp Message Structures ============

class WhatsAppTextContent(BaseModel):
    """WhatsApp text message content."""
    body: str


class WhatsAppMessage(BaseModel):
    """Individual WhatsApp message in webhook payload."""
    from_: str = Field(..., alias="from")
    id: str
    timestamp: str
    type: str
    text: Optional[WhatsAppTextContent] = None
    
    class Config:
        populate_by_name = True


class WhatsAppContact(BaseModel):
    """WhatsApp contact information."""
    profile: Dict[str, str]
    wa_id: str


class WhatsAppMetadata(BaseModel):
    """WhatsApp message metadata."""
    display_phone_number: str
    phone_number_id: str


class WhatsAppValue(BaseModel):
    """WhatsApp webhook value payload."""
    messaging_product: str
    metadata: WhatsAppMetadata
    contacts: Optional[List[WhatsAppContact]] = None
    messages: Optional[List[WhatsAppMessage]] = None
    statuses: Optional[List[Dict[str, Any]]] = None


class WhatsAppChange(BaseModel):
    """WhatsApp webhook change event."""
    value: WhatsAppValue
    field: str


class WhatsAppEntry(BaseModel):
    """WhatsApp webhook entry."""
    id: str
    changes: List[WhatsAppChange]


class WhatsAppWebhookPayload(BaseModel):
    """Complete WhatsApp webhook payload structure."""
    object: str
    entry: List[WhatsAppEntry]


# ============ Parsed Message (Internal Use) ============

class IncomingMessage(BaseModel):
    """Parsed incoming message for internal processing."""
    phone_number: str
    message: str
    message_id: str
    timestamp: str


# ============ Chatbot API Schemas ============

class ChatRequest(BaseModel):
    """Request to Customer Chatbot API."""
    phone_number: str = Field(..., description="Customer phone number")
    message: str = Field(..., description="Message content")


class ChatResponse(BaseModel):
    """Response from Customer Chatbot API."""
    phone_number: str
    response: str
    intent: Optional[str] = None
    extracted_requirements: Optional[Dict[str, Any]] = None
    is_complete: Optional[bool] = None
    confirmation_buttons: Optional[List[Dict[str, str]]] = None
    should_ask_clarification: Optional[bool] = None
    timestamp: str


# ============ WhatsApp Send Message Schemas ============

class WhatsAppSendTextBody(BaseModel):
    """WhatsApp text message body for sending."""
    body: str


class WhatsAppSendTextMessage(BaseModel):
    """WhatsApp text message payload for sending."""
    messaging_product: str = "whatsapp"
    to: str
    type: str = "text"
    text: WhatsAppSendTextBody


class WhatsAppButtonReply(BaseModel):
    """WhatsApp interactive button reply."""
    id: str
    title: str


class WhatsAppInteractiveButton(BaseModel):
    """WhatsApp interactive button."""
    type: str = "reply"
    reply: WhatsAppButtonReply


class WhatsAppInteractiveAction(BaseModel):
    """WhatsApp interactive action with buttons."""
    buttons: List[WhatsAppInteractiveButton]


class WhatsAppInteractiveBody(BaseModel):
    """WhatsApp interactive message body."""
    text: str


class WhatsAppInteractiveContent(BaseModel):
    """WhatsApp interactive message content."""
    type: str = "button"
    body: WhatsAppInteractiveBody
    action: WhatsAppInteractiveAction


class WhatsAppSendInteractiveMessage(BaseModel):
    """WhatsApp interactive message payload for sending."""
    messaging_product: str = "whatsapp"
    to: str
    type: str = "interactive"
    interactive: WhatsAppInteractiveContent


# ============ Health Check ============

class HealthCheck(BaseModel):
    """Health check response."""
    status: str = "healthy"
    timestamp: str
    version: str = "1.0.0"
    service: str = "whatsapp-orchestrator"
