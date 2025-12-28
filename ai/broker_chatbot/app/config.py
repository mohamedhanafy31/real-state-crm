"""
Configuration module for the Broker Chatbot service.
Loads environment variables and provides typed settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Cohere API (LLM Generator)
    cohere_api_key: str = ""
    
    # Backend API
    backend_api_url: str = "http://localhost:3001"
    
    # Embedding Service
    embedding_service_url: str = "http://localhost:8001"
    
    # Database (PostgreSQL with pgvector)
    database_host: str = "localhost"
    database_port: int = 5433
    database_user: str = "admin"
    database_password: str = "password"
    database_name: str = "real_estate_crm"
    
    # Server
    port: int = 8002
    log_level: str = "INFO"
    
    @property
    def database_url(self) -> str:
        """Construct PostgreSQL connection URL."""
        return f"postgresql://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"
    
    @property
    def async_database_url(self) -> str:
        """Construct async PostgreSQL connection URL."""
        return f"postgresql+asyncpg://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
