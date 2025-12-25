"""
Embedding Microservice - Main Application.
FastAPI server for centralized embedding operations.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import get_settings
from app.core.embeddings import get_embedding_service
from app.core.database import get_database, initialize_database
from app.api.routes import embed, sync, search

# Configure logging
settings = get_settings()
# Logging is configured in run.py or via uvicorn defaults
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    # Startup
    logger.info("🚀 Starting Embedding Microservice...")
    
    # Initialize database
    logger.info("Initializing database connection...")
    initialize_database()
    logger.info("✅ Database initialized")
    
    # Pre-load embedding model (this takes ~8-10 seconds)
    logger.info("Loading embedding model (this may take a moment)...")
    embedding_service = get_embedding_service()
    embedding_service.initialize()
    logger.info("✅ Embedding model loaded and ready")
    
    # Mark as ready
    app.state.ready = True
    logger.info(f"✅ Embedding service ready on port {settings.port}")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down Embedding Microservice...")
    app.state.ready = False


# Create FastAPI app
app = FastAPI(
    title="Embedding Microservice",
    description="Centralized embedding service for Real Estate CRM",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(embed.router, prefix="/embed", tags=["Embed"])
app.include_router(sync.router, prefix="/sync", tags=["Sync"])
app.include_router(search.router, prefix="/search", tags=["Search"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "embedding"}


@app.get("/ready")
async def readiness_check():
    """Readiness check - returns 200 only when model is loaded."""
    if getattr(app.state, "ready", False):
        return {"status": "ready", "model": settings.embedding_model_name}
    return {"status": "not_ready"}, 503


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )
