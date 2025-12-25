"""
WhatsApp webhook and chat API routes.
Handles incoming messages and provides chat interface.
"""

from fastapi import APIRouter, Request, Response, HTTPException, Query
from typing import Optional
from datetime import datetime

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ConversationHistory,
    WhatsAppIncomingMessage
)
from app.services.conversation import get_conversation_service
from app.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.get("")
async def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
    hub_challenge: str = Query(..., alias="hub.challenge")
):
    """Verify WhatsApp webhook subscription.
    
    This endpoint is called by WhatsApp to verify the webhook URL.
    
    Args:
        hub_mode: Should be "subscribe".
        hub_verify_token: Token to verify.
        hub_challenge: Challenge string to return.
        
    Returns:
        The challenge string if verification succeeds.
    """
    settings = get_settings()
    
    logger.info(f"Webhook verification request: mode={hub_mode}")
    
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        logger.info("Webhook verification successful")
        return Response(content=hub_challenge, media_type="text/plain")
    
    logger.warning(f"Webhook verification failed: invalid token")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("")
async def receive_webhook(request: Request):
    """Receive incoming WhatsApp messages.
    
    This endpoint processes incoming WhatsApp webhook events.
    
    Args:
        request: FastAPI request object.
        
    Returns:
        Acknowledgment response.
    """
    body = await request.json()
    
    logger.info("Received WhatsApp webhook event")
    logger.info(f"Webhook Body: {body}")
    
    # Parse WhatsApp message structure
    try:
        entries = body.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                messages = value.get("messages", [])
                
                for message in messages:
                    # Extract phone number and message
                    phone_number = message.get("from", "")
                    
                    # Handle text messages
                    if message.get("type") == "text":
                        text = message.get("text", {}).get("body", "")
                        
                        logger.info(f"Processing message from {phone_number}")
                        logger.debug(f"Message content: {text[:100]}...")
                        
                        # Process the message
                        conversation_service = get_conversation_service()
                        response = await conversation_service.process_message(
                            phone_number=phone_number,
                            message=text
                        )
                        
                        logger.info(f"Generated response for {phone_number}")
                        # TODO: Send response back via WhatsApp API
    
    except Exception as e:
        logger.error(f"Error processing webhook: {e}", exc_info=True)
        logger.debug(f"Failed webhook body: {body}")
    
    # Always return 200 to acknowledge receipt
    return {"status": "received"}


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Direct chat endpoint for testing.
    
    This endpoint allows direct testing without WhatsApp integration.
    
    Args:
        request: Chat request with phone number and message.
        
    Returns:
        Chat response with bot reply.
    """
    logger.info(f"Chat request from {request.phone_number}")
    logger.info(f"Request Payload: {request.model_dump_json()}")
    logger.debug(f"Message: {request.message[:100]}...")
    
    conversation_service = get_conversation_service()
    
    result = await conversation_service.process_message(
        phone_number=request.phone_number,
        message=request.message
    )
    
    logger.info(f"Chat response generated for {request.phone_number}")
    logger.info(f"Response Payload: {result}")
    return ChatResponse(**result)


@router.get("/history/{phone_number}", response_model=ConversationHistory)
async def get_history(phone_number: str, limit: int = 20):
    """Get conversation history for a phone number.
    
    Args:
        phone_number: Customer phone number.
        limit: Maximum number of messages (default 20).
        
    Returns:
        Conversation history.
    """
    conversation_service = get_conversation_service()
    
    result = conversation_service.get_history(
        phone_number=phone_number,
        limit=limit
    )
    
    return ConversationHistory(**result)
