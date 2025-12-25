"""
Broker Chatbot - FastAPI Application Entry Point.
AI assistant for real estate brokers to analyze client requests.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import health, chat
from app.core.logging_config import get_logger, setup_logging
from app.config import get_settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    settings = get_settings()
    setup_logging(settings.log_level)
    logger.info("=" * 50)
    logger.info("Broker Chatbot starting up...")
    logger.info(f"Port: {settings.port}")
    logger.info(f"Backend API: {settings.backend_api_url}")
    logger.info(f"Embedding Service: {settings.embedding_service_url}")
    logger.info("=" * 50)
    
    # Validate LLM configuration
    try:
        from app.core.llm import get_llm_service
        llm = get_llm_service()
        if llm.api_key:
            logger.info("Cohere LLM configured successfully")
        else:
            logger.warning("COHERE_API_KEY not set - LLM will not work")
    except Exception as e:
        logger.error(f"Error initializing LLM: {e}")
    
    yield
    
    # Shutdown
    logger.info("Broker Chatbot shutting down...")
    
    # Close HTTP clients
    try:
        from app.services.backend_api import get_backend_api_service
        from app.services.embedding_api_client import get_embedding_api_client
        get_backend_api_service().close()
        get_embedding_api_client().close()
    except Exception as e:
        logger.warning(f"Error during cleanup: {e}")


# Create FastAPI application
app = FastAPI(
    title="Broker Chatbot API",
    description="""
AI-powered assistant for real estate brokers.

## Features:
- 🧑 **Client Personality Analysis** - Analyze client behavior from conversation history
- ⚠️ **Risk Assessment** - Identify warning signs and risk indicators
- 💡 **Strategy Recommendations** - Get actionable advice for handling clients
- 💬 **Interactive Q&A** - Ask specific questions about assigned requests

## How it works:
1. Broker sends their ID, request ID, and a question/command
2. System loads request data and client conversations from the CRM
3. AI analyzes client personality and generates strategy
4. Returns structured analysis and recommendations in Arabic
    """,
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(chat.router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Broker Chatbot API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready"
    }
