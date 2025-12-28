"""
Broker Interviewer - FastAPI Application Entry Point.
AI-powered interview system for verifying broker applicants.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
import os
import logging
import time
from datetime import datetime

from app.config import settings
from app.models.schemas import HealthCheck
from app.core.llm import get_llm_service
from app.api.routes import interview
from app.utils.logging_config import setup_logging, log_api_request

# Initialize comprehensive logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    logger.info("🚀 Starting Broker Interviewer service...")
    logger.info(f"Environment: DEBUG={settings.DEBUG}, LOG_LEVEL={settings.LOG_LEVEL}")
    logger.info(f"Backend URL: {settings.BACKEND_URL}")
    logger.info(f"Pass Threshold: {settings.PASS_SCORE_THRESHOLD}%")
    
    # Validate Cohere API
    if settings.COHERE_API_KEY:
        try:
            llm_service = get_llm_service()
            llm_service.validate_connectivity()
            logger.info("✅ Cohere API connectivity validated")
        except Exception as e:
            logger.error(f"❌ Cohere API validation failed: {e}")
    else:
        logger.warning("⚠️ COHERE_API_KEY not set - LLM features will fail")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down Broker Interviewer service...")


# Create FastAPI app
app = FastAPI(
    title="Broker Interviewer API",
    description="AI-powered interview system for verifying real estate broker applicants",
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


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing and payloads."""
    import json
    from starlette.responses import Response
    from starlette.concurrency import iterate_in_threadpool

    start_time = time.time()
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    path = str(request.url.path)
    method = request.method
    
    # Skip logging for health checks and static files
    skip_payload_log = path in ["/", "/health", "/docs", "/openapi.json"] or path.startswith("/static")
    
    # Log request body for non-GET requests
    request_body = None
    if method in ["POST", "PUT", "PATCH"] and not skip_payload_log:
        try:
            body_bytes = await request.body()
            if body_bytes:
                try:
                    request_body = json.loads(body_bytes)
                    # Truncate large fields for logging
                    if isinstance(request_body, dict):
                        for key in ['conversationContext', 'conversation_context']:
                            if key in request_body and len(str(request_body.get(key, ''))) > 500:
                                request_body[key] = f"[{len(request_body[key])} items - truncated]"
                except json.JSONDecodeError:
                    request_body = body_bytes.decode('utf-8', errors='ignore')[:500]
        except Exception as e:
            logger.debug(f"Could not read request body: {e}")
    
    # Log incoming request
    logger.info(f"→ {method} {path} | Client: {client_ip}")
    if request_body:
        logger.info(f"  📥 Request Payload: {json.dumps(request_body, ensure_ascii=False, default=str)[:2000]}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000
    
    # Capture response body for API endpoints
    response_body = None
    if path.startswith("/api") and not skip_payload_log:
        try:
            response_body_bytes = [chunk async for chunk in response.body_iterator]
            response.body_iterator = iterate_in_threadpool(iter(response_body_bytes))
            if response_body_bytes:
                full_body = b"".join(response_body_bytes)
                try:
                    response_body = json.loads(full_body)
                    # Truncate large fields
                    if isinstance(response_body, dict):
                        for key in ['conversationContext', 'conversation_context', 'message']:
                            if key in response_body and len(str(response_body.get(key, ''))) > 500:
                                val = response_body[key]
                                if isinstance(val, str):
                                    response_body[key] = val[:200] + "... [truncated]"
                                elif isinstance(val, list):
                                    response_body[key] = f"[{len(val)} items]"
                except json.JSONDecodeError:
                    response_body = full_body.decode('utf-8', errors='ignore')[:500]
        except Exception as e:
            logger.debug(f"Could not read response body: {e}")
    
    # Log completion
    status_emoji = "✅" if response.status_code < 400 else "❌"
    logger.info(f"← {method} {path} | {status_emoji} {response.status_code} | ⏱️ {duration_ms:.0f}ms")
    if response_body:
        logger.info(f"  📤 Response Payload: {json.dumps(response_body, ensure_ascii=False, default=str)[:2000]}")
    
    # Also log to API logger for structured logging
    log_api_request(
        method=method,
        path=path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        client_ip=client_ip
    )
    
    return response


# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include routers
app.include_router(interview.router, prefix="/api")


@app.get("/", response_model=HealthCheck)
async def root():
    """Root endpoint - health check."""
    cohere_connected = False
    if settings.COHERE_API_KEY:
        try:
            get_llm_service().validate_connectivity()
            cohere_connected = True
        except:
            pass
            
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        cohere_connected=cohere_connected
    )


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )


@app.get("/ui", response_class=HTMLResponse)
async def get_ui():
    """Serve the interview UI."""
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return """
    <html>
    <head><title>Broker Interview</title></head>
    <body>
        <h1>Broker Interview System</h1>
        <p>UI not configured. Use the API endpoints directly.</p>
        <p>API Docs: <a href="/docs">/docs</a></p>
    </body>
    </html>
    """
