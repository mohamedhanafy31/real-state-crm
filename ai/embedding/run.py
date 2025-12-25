"""
Run script for Embedding Microservice with advanced logging.
"""

import os
import sys
import logging
from datetime import datetime
import uvicorn
from app.config import get_settings

def setup_logging():
    """Setup detailed logging to console and file with timestamped directory."""
    settings = get_settings()
    
    # Create logs directory with timestamp (like chatbot)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_dir = os.path.join(os.getcwd(), "logs", timestamp)
    os.makedirs(log_dir, exist_ok=True)
    
    # Log file inside the timestamped directory
    log_file = os.path.join(log_dir, "embedding.log")
    
    # Configure logging
    log_level = getattr(logging, settings.log_level.upper())
    log_format = "%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    # Root logger configuration
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logger = logging.getLogger("run")
    logger.info(f"Logging initialized. Log directory: {log_dir}")
    return log_dir

if __name__ == "__main__":
    # Setup logging
    log_dir = setup_logging()
    
    settings = get_settings()
    
    print(f"🚀 Starting Embedding Microservice on {settings.host}:{settings.port}")
    print(f"📝 Logs are being saved to: {log_dir}")
    
    # Run uvicorn with logs directory excluded from watch
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        reload_excludes=["logs/*", "*.log"],  # Ignore log files for hot reload
        log_level=settings.log_level.lower(),
        access_log=True
    )
