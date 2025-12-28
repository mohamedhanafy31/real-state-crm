"""
WhatsApp Orchestrator - FastAPI Application Entry Point.
Routes messages between WhatsApp Cloud API and Customer Chatbot.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import webhook
from app.config import get_settings
from app.models import HealthCheck
from app.services import get_whatsapp_service, get_chatbot_service


# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    logger.info("🚀 Starting WhatsApp Orchestrator service...")
    logger.info(f"📡 Chatbot API URL: {settings.chatbot_api_url}")
    logger.info(f"📱 WhatsApp Phone ID: {settings.whatsapp_phone_number_id or 'NOT CONFIGURED'}")
    
    # Verify chatbot connectivity
    chatbot_service = get_chatbot_service()
    if await chatbot_service.health_check():
        logger.info("✅ Customer Chatbot API is reachable")
    else:
        logger.warning("⚠️ Customer Chatbot API is not reachable - messages may fail")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down WhatsApp Orchestrator service...")
    
    # Close HTTP clients
    whatsapp_service = get_whatsapp_service()
    await whatsapp_service.close()
    await chatbot_service.close()


# Create FastAPI app
app = FastAPI(
    title="WhatsApp Orchestrator API",
    description="Routes messages between WhatsApp Cloud API and Customer Chatbot",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhook.router)


@app.get("/", response_model=HealthCheck)
async def root():
    """Root endpoint - health check."""
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        service="whatsapp-orchestrator"
    )


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint with dependency status."""
    chatbot_service = get_chatbot_service()
    chatbot_healthy = await chatbot_service.health_check()
    
    status = "healthy" if chatbot_healthy else "degraded"
    
    return HealthCheck(
        status=status,
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        service="whatsapp-orchestrator"
    )
