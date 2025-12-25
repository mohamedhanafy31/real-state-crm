"""
Logging configuration for the Customer Chatbot application.

This module provides centralized logging setup with:
- Structured format with timestamps
- Console and file handlers
- Rotating log files
- Different log levels per module
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path
from datetime import datetime


# Base logs directory
BASE_LOGS_DIR = Path(__file__).parent.parent.parent / "logs"
BASE_LOGS_DIR.mkdir(exist_ok=True)

# Create run-specific log directory (timestamped)
# We use a coarser timestamp (per minute) to avoid fragmentation with reloaders
# or allow the ENV to override it
RUN_ID = os.getenv("CHATBOT_RUN_ID", datetime.now().strftime("%Y%m%d_%H%M"))
RUN_LOG_DIR = BASE_LOGS_DIR / RUN_ID
RUN_LOG_DIR.mkdir(parents=True, exist_ok=True)

# Log format
# [timestamp] | [level] | [process_id:thread_id] | [logger_name] | [message]
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | [%(process)d:%(threadName)s] | %(name)-30s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(log_level: str = "INFO") -> None:
    """Setup application-wide logging configuration.
    
    Args:
        log_level: Default log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Convert string to logging level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create formatters
    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    
    # File handler (rotating)
    log_file = RUN_LOG_DIR / "chatbot.log"
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(numeric_level)
    file_handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    root_logger.handlers.clear()  # Remove any existing handlers
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
    logging.getLogger("transformers").setLevel(logging.WARNING)
    
    logging.info(f"Logging initialized - Level: {log_level}, File: {log_file}")


def get_logger(name: str) -> logging.Logger:
    """Get a logger for a specific module.
    
    Args:
        name: Name of the module (__name__ is typically used)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)
