"""
Configuration for AI Voice Shopping Assistant
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # ElevenLabs
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_AGENT_ID: Optional[str] = None

    # OpenAI API (for conversation analysis & embeddings)
    OPENAI_API_KEY: Optional[str] = None

    # Shopify App credentials
    SHOPIFY_API_KEY: Optional[str] = None
    SHOPIFY_API_SECRET: Optional[str] = None
    SHOPIFY_SCOPES: str = "read_products,read_orders,read_customers"
    SHOPIFY_APP_URL: str = "http://localhost:8000"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Database — Neon PostgreSQL (use pooled URL for app, direct for migrations)
    DATABASE_URL: Optional[str] = None           # Pooled connection (-pooler)
    DATABASE_URL_DIRECT: Optional[str] = None    # Direct connection (for migrations)

    # Redis (Upstash) — caching and session management
    REDIS_URL: Optional[str] = None

    # Encryption key for Shopify access tokens (Fernet)
    ENCRYPTION_KEY: Optional[str] = None

    # Security settings
    WEBHOOK_SECRET: Optional[str] = None
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"

    # Stripe Payments
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_STARTER_PRICE_ID: Optional[str] = None
    STRIPE_PRO_PRICE_ID: Optional[str] = None  # Used for Growth plan
    STRIPE_SCALE_PRICE_ID: Optional[str] = None

    # Supabase Auth
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None

    # Production settings
    ENVIRONMENT: str = "development"  # development, staging, production

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",
    }

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
