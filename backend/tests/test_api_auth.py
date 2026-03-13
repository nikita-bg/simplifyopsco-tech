"""Tests for authentication-related API endpoints (/api/me, /api/stores/create)."""
import pytest
from datetime import datetime
from unittest.mock import patch, AsyncMock


class TestGetCurrentUser:
    """GET /api/me -- returns user profile and stores."""

    def test_me_returns_200_with_auth(self, client):
        response = client.get("/api/me")
        assert response.status_code == 200

    def test_me_returns_user_id(self, client):
        body = client.get("/api/me").json()
        assert body["user_id"] == "test-user-123"

    def test_me_returns_stores_when_present(self, client, mock_db):
        """Mock db.fetch to return a store row so /api/me lists it."""
        mock_db.fetch = AsyncMock(return_value=[
            {
                "id": "store-123",
                "shop_domain": "test.com",
                "subscription_tier": "trial",
                "settings": None,
                "created_at": datetime(2024, 1, 1),
            }
        ])
        body = client.get("/api/me").json()
        assert body["has_store"] is True
        assert len(body["stores"]) == 1
        assert body["stores"][0]["id"] == "store-123"
        assert body["stores"][0]["shop_domain"] == "test.com"

    def test_me_returns_empty_stores_when_none(self, client, mock_db):
        """db.fetch returns [] so user has no stores."""
        mock_db.fetch = AsyncMock(return_value=[])
        body = client.get("/api/me").json()
        assert body["has_store"] is False
        assert body["stores"] == []

    def test_me_returns_401_without_auth(self, unauthed_client):
        response = unauthed_client.get("/api/me")
        assert response.status_code == 401


class TestCreateStore:
    """POST /api/stores/create -- creates a store for non-Shopify users."""

    def test_create_store_returns_200(self, client):
        response = client.post(
            "/api/stores/create",
            json={"site_url": "https://example.com"},
        )
        assert response.status_code == 200
        body = response.json()
        assert "store_id" in body
        assert body["site_url"] == "https://example.com"
        assert body["subscription_tier"] == "trial"

    def test_create_store_400_without_site_url(self, client):
        response = client.post("/api/stores/create", json={})
        assert response.status_code == 400

    def test_create_store_401_without_auth(self, unauthed_client):
        response = unauthed_client.post(
            "/api/stores/create",
            json={"site_url": "https://example.com"},
        )
        assert response.status_code == 401
