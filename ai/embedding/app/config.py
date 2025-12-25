"""
Embedding Microservice Configuration.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    # Database
    database_url: str = "postgresql://admin:password@localhost:5433/real_estate_crm"
    database_host: str = "localhost"
    database_port: int = 5433
    database_user: str = "admin"
    database_password: str = "password"
    database_name: str = "real_estate_crm"
    
    # Embedding Model
    embedding_model_name: str = "mohamed2811/Muffakir_Embedding_V2"
    embedding_dimension: int = 768
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    reload: bool = True
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
