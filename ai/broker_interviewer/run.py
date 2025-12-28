"""
Broker Interviewer Application Entry Point.
"""

import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8004))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_excludes=["logs/*", "*.log", "__pycache__/*", ".git/*"],
        log_level="info"
    )
