"""
Configuration management for WhatsApp Orchestrator.
Loads settings from environment variables.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # WhatsApp Cloud API
    whatsapp_verify_token: str = "default_verify_token"
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_api_version: str = "v18.0"
    
    # Customer Chatbot API
    chatbot_api_url: str = "http://localhost:8000"
    
    # Server
    port: int = 8003
    log_level: str = "INFO"
    
    @property
    def whatsapp_api_base_url(self) -> str:
        """Get the WhatsApp Cloud API base URL."""
        return f"https://graph.facebook.com/{self.whatsapp_api_version}/{self.whatsapp_phone_number_id}"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
