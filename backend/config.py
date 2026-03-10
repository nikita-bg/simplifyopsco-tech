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

    # Security settings
    WEBHOOK_SECRET: Optional[str] = None  # Secret for webhook authentication
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"  # Comma-separated

    # Production settings
    ENVIRONMENT: str = "development"  # development, staging, production

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def origins_list(self) -> list[str]:
        """Get list of allowed CORS origins"""
        origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
        # Always include localhost in development
        if not self.is_production:
            dev_origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"]
            origins.extend([o for o in dev_origins if o not in origins])
        return origins


# Singleton instance
settings = Settings()
