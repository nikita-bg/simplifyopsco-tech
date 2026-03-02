"""
Конфигурация на приложението
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # ElevenLabs
    ELEVENLABS_API_KEY: Optional[str] = None

    # OpenAI API (изисква се за LightRAG)
    OPENAI_API_KEY: Optional[str] = None

    # LightRAG конфигурация
    LIGHTRAG_WORKING_DIR: str = "./lightrag_cache"
    LIGHTRAG_MODEL_NAME: str = "gpt-4o-mini"

    # Default CRM настройки
    DEFAULT_CRM_API_URL: Optional[str] = None
    DEFAULT_CRM_BEARER_TOKEN: Optional[str] = None

    # Сървър настройки
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # Database (опционално за бъдещо разширение)
    DATABASE_URL: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton instance
settings = Settings()
