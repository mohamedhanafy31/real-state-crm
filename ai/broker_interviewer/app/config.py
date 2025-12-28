"""
Broker Interviewer Service Configuration.
Loads environment variables and defines settings.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Broker Interviewer"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Backend API
    BACKEND_URL: str = "http://localhost:3000"
    BACKEND_TIMEOUT: int = 30
    
    # Cohere API
    COHERE_API_KEY: str = ""
    COHERE_MODEL: str = "command-r7b-12-2024"
    
    # Interview Settings
    INTERVIEW_TOTAL_PHASES: int = 6
    PASS_SCORE_THRESHOLD: float = 75.0
    RED_FLAG_PENALTY: float = 2.0
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Export settings
settings = get_settings()
