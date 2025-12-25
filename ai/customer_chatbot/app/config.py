"""
Configuration module for the Customer Chatbot service.
Loads environment variables and provides typed settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # LLM Generators
    generator_type: str = "gemini" # "gemini" or "cohere"
    
    # Gemini API
    gemini_api_key: str = ""
    
    # Cohere API
    cohere_api_key: str = ""
    
    # Fuzzy Matching Thresholds (for name matching)
    fuzzy_exact_threshold: float = 0.85  # Score >= this = exact match
    fuzzy_suggest_threshold: float = 0.60  # Score >= this = suggest as alternative
    
    # Backend API
    backend_api_url: str = "http://localhost:3000"
    
    # Database
    database_host: str = "localhost"
    database_port: int = 5433
    database_user: str = "admin"
    database_password: str = "password"
    database_name: str = "real_estate_crm"
    
    # Embedding Model
    embedding_model_name: str = "mohamed2811/Muffakir_Embedding_V2"
    embedding_service_url: str = "http://localhost:8001"
    
    # WhatsApp API
    whatsapp_verify_token: str = ""
    whatsapp_access_token: str = ""
    
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
