"""
WhatsApp webhook and routing endpoints.
Handles incoming messages and forwards to AI chatbot.
"""

import logging
from fastapi import APIRouter, Request, Response, HTTPException, Query

from app.config import get_settings
from app.services import get_whatsapp_service, get_chatbot_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["webhook"])


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
    hub_challenge: str = Query(..., alias="hub.challenge")
):
    """
    Verify WhatsApp webhook subscription.
    
    This endpoint is called by Meta to verify the webhook URL during setup.
    
    Args:
        hub_mode: Should be "subscribe".
        hub_verify_token: Token to verify against our configured token.
        hub_challenge: Challenge string to return if verification succeeds.
        
    Returns:
        The challenge string if verification succeeds.
    """
    settings = get_settings()
    
    logger.info(f"Webhook verification request: mode={hub_mode}")
    
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        logger.info("✅ Webhook verification successful")
        return Response(content=hub_challenge, media_type="text/plain")
    
    logger.warning(f"❌ Webhook verification failed: invalid token")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request):
    """
    Receive and process incoming WhatsApp messages.
    
    Flow:
    1. Parse incoming WhatsApp message
    2. Forward message to Customer Chatbot API
    3. Send AI response back via WhatsApp
    
    Args:
        request: FastAPI request object containing webhook payload.
        
    Returns:
        Acknowledgment response (always 200 to prevent retries).
    """
    body = await request.json()
    
    logger.info("📨 Received WhatsApp webhook event")
    logger.debug(f"Webhook payload: {body}")
    
    # Get services
    whatsapp_service = get_whatsapp_service()
    chatbot_service = get_chatbot_service()
    
    try:
        # 1. Parse incoming message
        incoming_msg = whatsapp_service.parse_incoming_message(body)
        
        if incoming_msg is None:
            # Not a text message or couldn't parse - acknowledge anyway
            logger.debug("No processable message in webhook payload")
            return {"status": "received"}
        
        logger.info(f"📱 Message from {incoming_msg.phone_number}: {incoming_msg.message[:50]}...")
        
        # 2. Forward to AI Chatbot
        chat_response = await chatbot_service.send_message(
            phone_number=incoming_msg.phone_number,
            message=incoming_msg.message
        )
        
        if chat_response is None:
            logger.error("Failed to get response from chatbot API")
            # Send error message to user
            await whatsapp_service.send_text_message(
                phone_number=incoming_msg.phone_number,
                message="عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى."
            )
            return {"status": "error", "message": "Chatbot API error"}
        
        # 3. Send response back via WhatsApp
        # Check if response includes interactive buttons
        if chat_response.confirmation_buttons and len(chat_response.confirmation_buttons) > 0:
            success = await whatsapp_service.send_interactive_message(
                phone_number=incoming_msg.phone_number,
                message=chat_response.response,
                buttons=chat_response.confirmation_buttons
            )
        else:
            success = await whatsapp_service.send_text_message(
                phone_number=incoming_msg.phone_number,
                message=chat_response.response
            )
        
        if success:
            logger.info(f"✅ Response sent to {incoming_msg.phone_number}")
        else:
            logger.error(f"❌ Failed to send response to {incoming_msg.phone_number}")
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
