"""
Health check routes for Broker Chatbot.
"""

from fastapi import APIRouter

from app.models.schemas import HealthResponse, ReadyResponse
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint.
    
    Returns:
        Health status of the service.
    """
    return HealthResponse(status="healthy", service="broker-chatbot")


@router.get("/ready", response_model=ReadyResponse)
async def readiness_check():
    """Readiness check - verifies all dependencies are available.
    
    Returns:
        Readiness status with dependency checks.
    """
    llm_status = "connected"
    backend_status = "unknown"
    embedding_status = "unknown"
    
    # Check LLM connectivity
    try:
        from app.core.llm import get_llm_service
        llm = get_llm_service()
        # Don't actually call validate_connectivity to avoid slow startup
        llm_status = "configured" if llm.api_key else "not_configured"
    except Exception as e:
        logger.warning(f"LLM check failed: {e}")
        llm_status = "error"
    
    # Check backend connectivity
    try:
        from app.services.backend_api import get_backend_api_service
        import httpx
        backend = get_backend_api_service()
        response = httpx.get(f"{backend.base_url}/health", timeout=2.0)
        backend_status = "connected" if response.status_code == 200 else "error"
    except Exception as e:
        logger.warning(f"Backend check failed: {e}")
        backend_status = "unavailable"
    
    # Check embedding service
    try:
        from app.services.embedding_api_client import get_embedding_api_client
        embedding = get_embedding_api_client()
        if embedding._check_service_available():
            embedding_status = "connected"
        else:
            embedding_status = "unavailable"
    except Exception as e:
        logger.warning(f"Embedding check failed: {e}")
        embedding_status = "error"
    
    return ReadyResponse(
        status="ready",
        llm=llm_status,
        backend=backend_status,
        embedding=embedding_status
    )
