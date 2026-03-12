"""Tests for application configuration."""
import pytest

from backend.config import Settings


class TestSettings:
    def test_defaults(self):
        s = Settings()
        assert s.HOST == "0.0.0.0"
        assert s.PORT == 8000
        assert s.SHOPIFY_SCOPES == "read_products,read_orders,read_customers"

    def test_is_production(self):
        s = Settings(ENVIRONMENT="production")
        assert s.is_production is True

    def test_is_not_production(self):
        s = Settings(ENVIRONMENT="development")
        assert s.is_production is False

    def test_origins_list_production(self):
        s = Settings(
            ENVIRONMENT="production",
            ALLOWED_ORIGINS="https://simplifyopsco.tech,https://api.simplifyopsco.tech",
        )
        origins = s.origins_list
        assert "https://simplifyopsco.tech" in origins
        assert "https://api.simplifyopsco.tech" in origins
        # In production, no localhost should be added
        assert "http://localhost:3000" not in origins

    def test_origins_list_development(self):
        s = Settings(ENVIRONMENT="development", ALLOWED_ORIGINS="http://custom:3000")
        origins = s.origins_list
        assert "http://custom:3000" in origins
        # Dev origins should be added
        assert "http://localhost:3000" in origins
        assert "http://127.0.0.1:3000" in origins
