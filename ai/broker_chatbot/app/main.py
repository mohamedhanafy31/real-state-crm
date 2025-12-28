"""
Broker Chatbot - FastAPI Application Entry Point.
AI assistant for real estate brokers to analyze client requests.
"""

from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import json
import traceback

from app.api.routes import health, chat
from app.core.logging_config import get_logger, setup_logging
from app.config import get_settings

logger = get_logger(__name__)

# Static files directory
STATIC_DIR = Path(__file__).parent / "static"


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
    logger.info(f"Static files: {STATIC_DIR}")
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


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and their responses."""
    # Read the request body
    body = await request.body()
    body_text = body.decode('utf-8') if body else ""
    
    # Log the request
    logger.info(f"\n{'='*60}")
    logger.info(f"📥 INCOMING REQUEST: {request.method} {request.url.path}")
    logger.info(f"📥 Headers: {dict(request.headers)}")
    if body_text:
        try:
            body_json = json.loads(body_text)
            logger.info(f"📥 Body (JSON):\n{json.dumps(body_json, indent=2, ensure_ascii=False)}")
        except json.JSONDecodeError:
            logger.info(f"📥 Body (raw): {body_text[:500]}")
    logger.info(f"{'='*60}\n")
    
    # Recreate the request with the body
    from starlette.requests import Request as StarletteRequest
    from starlette.datastructures import Headers
    
    async def receive():
        return {"type": "http.request", "body": body}
    
    request = StarletteRequest(request.scope, receive)
    
    # Call the route handler
    try:
        response = await call_next(request)
        logger.info(f"📤 RESPONSE: {request.method} {request.url.path} -> {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ ERROR in {request.method} {request.url.path}: {str(e)}")
        logger.error(traceback.format_exc())
        raise


# Custom validation error handler
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed logging."""
    body = await request.body()
    body_text = body.decode('utf-8') if body else ""
    
    logger.error(f"\n{'='*60}")
    logger.error(f"❌ VALIDATION ERROR: {request.method} {request.url.path}")
    logger.error(f"❌ Errors: {exc.errors()}")
    if body_text:
        try:
            body_json = json.loads(body_text)
            logger.error(f"❌ Received Body:\n{json.dumps(body_json, indent=2, ensure_ascii=False)}")
        except json.JSONDecodeError:
            logger.error(f"❌ Received Body (raw): {body_text[:500]}")
    logger.error(f"{'='*60}\n")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": body_text[:500] if body_text else None,
            "message": "Validation error - check broker_id and request_id are strings, and message is not empty"
        }
    )


# Include routers
app.include_router(health.router)
app.include_router(chat.router)

# Mount static files
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", tags=["Root"])
async def root():
    """Serve the broker chatbot UI."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "service": "Broker Chatbot API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "ui": "/static/index.html"
    }
