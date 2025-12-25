"""
Customer Chatbot - FastAPI Application Entry Point.
A RAG-based chatbot for real estate customer interactions via WhatsApp.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
import os
from datetime import datetime
import sys

# Monkeypatch for Python 3.9 importlib.metadata compatibility
# Some Google libraries expect packages_distributions which is 3.10+
if sys.version_info < (3, 10):
    import importlib_metadata
    import importlib.metadata
    if not hasattr(importlib.metadata, 'packages_distributions'):
        importlib.metadata.packages_distributions = importlib_metadata.packages_distributions

from app.api.routes import webhook
from app.models.schemas import HealthCheck
from app.core.vector_store import get_vector_store
from app.core.embeddings import get_embedding_service
from app.core.llm import get_llm_service
from app.core.logging_config import setup_logging, get_logger

# Setup logging
log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(log_level)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown.
    
    Args:
        app: FastAPI application instance.
    """
    # Startup
    logger.info("🚀 Starting Customer Chatbot service...")
    logger.debug(f"Environment: LOG_LEVEL={log_level}, DATABASE_HOST={os.getenv('DATABASE_HOST')}")
    
    # 1. Initialize vector store (creates tables if needed)
    try:
        vector_store = get_vector_store()
        vector_store.initialize()
        logger.info("✅ Vector store initialized and pgvector extension verified")
    except Exception as e:
        logger.error(f"⚠️ Warning: Could not initialize vector store: {e}", exc_info=True)
    
    # 2. Pre-load embedding model
    try:
        embedding_service = get_embedding_service()
        embedding_service.initialize()
        logger.info(f"✅ Embedding model loaded successfully")
    except Exception as e:
        logger.critical(f"❌ Critical Error: Could not load embedding model: {e}", exc_info=True)
        # In production we might want to exit, but for now we continue
    
    # 3. Validate Gemini API
    try:
        llm_service = get_llm_service()
        llm_service.validate_connectivity()
        logger.info("✅ Gemini API connectivity validated")
    except Exception as e:
        logger.error(f"❌ Critical Error: Gemini API validation failed: {e}", exc_info=True)
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down Customer Chatbot service...")
    try:
        vector_store = get_vector_store()
        vector_store.close()
    except:
        pass


# Create FastAPI app
app = FastAPI(
    title="Customer Chatbot API",
    description="RAG-based chatbot for real estate customer interactions via WhatsApp",
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

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/ui", response_class=HTMLResponse)
async def get_ui():
    """Serve the WhatsApp simulation UI."""
    index_path = os.path.join(static_dir, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        return f.read()


# Include routers
app.include_router(webhook.router, prefix="/api")


@app.get("/", response_model=HealthCheck)
async def root():
    """Root endpoint - health check.
    
    Returns:
        Health check status.
    """
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint.
    
    Returns:
        Health check status.
    """
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )
