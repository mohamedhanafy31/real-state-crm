"""
Logging configuration for the Broker Interviewer service.
Provides detailed logging with timestamp-organized log files.
"""

import os
import sys
import logging
from logging.handlers import TimedRotatingFileHandler, RotatingFileHandler
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import settings


# Base log directory
LOG_DIR = Path(__file__).parent.parent.parent / "logs"


def setup_logging(
    log_level: Optional[str] = None,
    log_dir: Optional[Path] = None
) -> logging.Logger:
    """
    Configure application-wide logging with console and file handlers.
    
    Args:
        log_level: Override log level (defaults to settings.LOG_LEVEL)
        log_dir: Override log directory (defaults to ./logs)
    
    Returns:
        Root logger configured for the application
    """
    level = getattr(logging, (log_level or settings.LOG_LEVEL).upper(), logging.INFO)
    base_dir = log_dir or LOG_DIR
    
    # Create log directories
    base_dir.mkdir(parents=True, exist_ok=True)
    (base_dir / "interviews").mkdir(exist_ok=True)
    (base_dir / "errors").mkdir(exist_ok=True)
    (base_dir / "api").mkdir(exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Suppress noisy watchfiles logs
    logging.getLogger('watchfiles').setLevel(logging.WARNING)
    logging.getLogger('watchfiles.main').setLevel(logging.WARNING)
    
    # Formatters
    detailed_formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(name)-25s | %(funcName)-20s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_formatter = logging.Formatter(
        fmt='%(asctime)s | %(levelname)-8s | %(message)s',
        datefmt='%H:%M:%S'
    )
    
    json_formatter = logging.Formatter(
        fmt='{"timestamp":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","function":"%(funcName)s","message":"%(message)s"}',
        datefmt='%Y-%m-%dT%H:%M:%S'
    )
    
    # Console handler (colorful output)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # Main application log - daily rotation
    app_log_path = base_dir / f"app_{datetime.now().strftime('%Y%m%d')}.log"
    app_handler = TimedRotatingFileHandler(
        filename=str(app_log_path),
        when='midnight',
        interval=1,
        backupCount=30,  # Keep 30 days
        encoding='utf-8'
    )
    app_handler.setLevel(level)
    app_handler.setFormatter(detailed_formatter)
    app_handler.suffix = "%Y%m%d"
    root_logger.addHandler(app_handler)
    
    # Error log - separate file for errors only
    error_log_path = base_dir / "errors" / f"errors_{datetime.now().strftime('%Y%m%d')}.log"
    error_handler = TimedRotatingFileHandler(
        filename=str(error_log_path),
        when='midnight',
        interval=1,
        backupCount=60,  # Keep 60 days of errors
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)
    root_logger.addHandler(error_handler)
    
    # Interview-specific logger
    interview_logger = logging.getLogger('interview')
    interview_log_path = base_dir / "interviews" / f"interviews_{datetime.now().strftime('%Y%m%d')}.log"
    interview_handler = TimedRotatingFileHandler(
        filename=str(interview_log_path),
        when='midnight',
        interval=1,
        backupCount=90,  # Keep 90 days of interview logs
        encoding='utf-8'
    )
    interview_handler.setLevel(logging.DEBUG)
    interview_handler.setFormatter(detailed_formatter)
    interview_logger.addHandler(interview_handler)
    
    # API requests logger (JSON format for parsing)
    api_logger = logging.getLogger('api')
    api_log_path = base_dir / "api" / f"api_{datetime.now().strftime('%Y%m%d')}.log"
    api_handler = TimedRotatingFileHandler(
        filename=str(api_log_path),
        when='midnight',
        interval=1,
        backupCount=14,  # Keep 14 days
        encoding='utf-8'
    )
    api_handler.setLevel(logging.DEBUG)
    api_handler.setFormatter(json_formatter)
    api_logger.addHandler(api_handler)
    
    # Log startup info
    root_logger.info("=" * 60)
    root_logger.info("Broker Interviewer Service Starting")
    root_logger.info(f"Log Level: {logging.getLevelName(level)}")
    root_logger.info(f"Log Directory: {base_dir}")
    root_logger.info("=" * 60)
    
    return root_logger


def get_interview_logger() -> logging.Logger:
    """Get the interview-specific logger."""
    return logging.getLogger('interview')


def get_api_logger() -> logging.Logger:
    """Get the API requests logger."""
    return logging.getLogger('api')


def log_interview_event(
    session_id: int,
    event_type: str,
    phase: int = None,
    message: str = "",
    extra_data: dict = None
):
    """
    Log an interview-specific event with structured data.
    
    Args:
        session_id: Interview session ID
        event_type: Type of event (start, response, phase_complete, etc.)
        phase: Current phase number
        message: Event description
        extra_data: Additional data to log
    """
    logger = get_interview_logger()
    
    log_parts = [
        f"[Session:{session_id}]",
        f"[Event:{event_type}]"
    ]
    
    if phase:
        log_parts.append(f"[Phase:{phase}]")
    
    log_parts.append(message)
    
    if extra_data:
        log_parts.append(f"| Data: {extra_data}")
    
    logger.info(" ".join(log_parts))


def log_api_request(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    client_ip: str = None,
    error: str = None
):
    """
    Log an API request with timing information.
    
    Args:
        method: HTTP method
        path: Request path
        status_code: Response status code
        duration_ms: Request duration in milliseconds
        client_ip: Client IP address
        error: Error message if any
    """
    logger = get_api_logger()
    
    parts = [
        f"{method} {path}",
        f"status={status_code}",
        f"duration={duration_ms:.2f}ms"
    ]
    
    if client_ip:
        parts.append(f"client={client_ip}")
    
    if error:
        parts.append(f"error={error}")
        logger.error(" | ".join(parts))
    else:
        logger.info(" | ".join(parts))


def log_llm_call(
    operation: str,
    model: str,
    tokens_in: int = None,
    tokens_out: int = None,
    duration_ms: float = None,
    success: bool = True,
    error: str = None
):
    """
    Log an LLM API call for debugging and cost tracking.
    
    Args:
        operation: Type of operation (evaluate_response, generate_interview, etc.)
        model: LLM model name
        tokens_in: Input token count
        tokens_out: Output token count
        duration_ms: Call duration in milliseconds
        success: Whether the call succeeded
        error: Error message if failed
    """
    logger = logging.getLogger('llm')
    
    parts = [
        f"[LLM:{operation}]",
        f"model={model}"
    ]
    
    if tokens_in is not None:
        parts.append(f"tokens_in={tokens_in}")
    if tokens_out is not None:
        parts.append(f"tokens_out={tokens_out}")
    if duration_ms is not None:
        parts.append(f"duration={duration_ms:.2f}ms")
    
    parts.append(f"success={success}")
    
    if error:
        parts.append(f"error={error}")
        logger.error(" | ".join(parts))
    else:
        logger.info(" | ".join(parts))
