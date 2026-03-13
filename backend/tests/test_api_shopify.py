"""Tests for Shopify API endpoints — OAuth, product webhooks, sync."""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_db():
    _db = MagicMock()
    _db.pool = True
    _db.connect = AsyncMock()
    _db.disconnect = AsyncMock()
    _db.execute = AsyncMock()
    _db.fetch = AsyncMock(return_value=[])
    _db.fetchrow = AsyncMock(return_value=None)
    _db.fetchval = AsyncMock(return_value=None)
    with patch("backend.database.db", _db), \
         patch("backend.main.db", _db):
        yield _db


@pytest.fixture()
def mock_auth():
    with patch("backend.auth_middleware.get_authenticated_user", new_callable=AsyncMock) as _get_user, \
         patch("backend.auth_middleware.verify_store_ownership", new_callable=AsyncMock) as _verify:
        _get_user.return_value = "test-user-123"
        _verify.return_value = True
        yield _get_user


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    from backend.security_middleware import rate_limiter
    rate_limiter.requests.clear()


@pytest.fixture()
def client(mock_db, mock_auth):
    from backend.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture()
def unauthed_client(mock_db):
    from fastapi import HTTPException
    with patch(
        "backend.auth_middleware.get_authenticated_user",
        new_callable=AsyncMock,
        side_effect=HTTPException(status_code=401, detail="Authentication required"),
    ):
        from backend.main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


# ---------------------------------------------------------------------------
# GET /shopify/auth
# ---------------------------------------------------------------------------

class TestShopifyAuth:
    def test_returns_install_url(self, client):
        with patch(
            "backend.main.shopify_service.get_install_url",
            return_value="https://test.myshopify.com/admin/oauth/authorize?client_id=x",
        ):
            resp = client.get("/shopify/auth", params={"shop": "test.myshopify.com"})
            assert resp.status_code == 200
            data = resp.json()
            assert "install_url" in data
            assert "test.myshopify.com" in data["install_url"]

    def test_invalid_shop_domain_returns_400(self, client):
        resp = client.get("/shopify/auth", params={"shop": "invalid-domain"})
        assert resp.status_code == 400

    def test_missing_shop_param_returns_422(self, client):
        resp = client.get("/shopify/auth")
        assert resp.status_code == 422  # FastAPI validation error

    def test_empty_shop_returns_400(self, client):
        resp = client.get("/shopify/auth", params={"shop": ""})
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /shopify/webhooks/products/{action}
# ---------------------------------------------------------------------------

class TestShopifyProductWebhook:
    def test_product_create_webhook(self, client, mock_db):
        mock_db.fetchrow.return_value = {"id": "store-abc"}

        with patch("backend.main.shopify_service.verify_hmac", return_value=True), \
             patch("backend.main.shopify_service.handle_product_webhook", new_callable=AsyncMock):
            resp = client.post(
                "/shopify/webhooks/products/create",
                content=json.dumps({"id": 123, "title": "Test Product"}).encode(),
                headers={
                    "X-Shopify-Shop-Domain": "test.myshopify.com",
                    "X-Shopify-Hmac-SHA256": "valid-hmac",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["received"] is True

    def test_webhook_unknown_shop_still_returns_200(self, client, mock_db):
        mock_db.fetchrow.return_value = None  # unknown shop

        with patch("backend.main.shopify_service.verify_hmac", return_value=True):
            resp = client.post(
                "/shopify/webhooks/products/create",
                content=json.dumps({"id": 456, "title": "Unknown"}).encode(),
                headers={
                    "X-Shopify-Shop-Domain": "unknown.myshopify.com",
                    "X-Shopify-Hmac-SHA256": "valid-hmac",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["received"] is True

    def test_webhook_invalid_hmac_returns_401(self, client, mock_db):
        with patch("backend.main.shopify_service.verify_hmac", return_value=False):
            resp = client.post(
                "/shopify/webhooks/products/create",
                content=json.dumps({"id": 789}).encode(),
                headers={
                    "X-Shopify-Shop-Domain": "test.myshopify.com",
                    "X-Shopify-Hmac-SHA256": "bad-hmac",
                },
            )
            assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/stores/{store_id}/sync
# ---------------------------------------------------------------------------

class TestProductSync:
    def test_trigger_sync_authenticated(self, client, mock_db):
        with patch(
            "backend.main.shopify_service.sync_all_products",
            new_callable=AsyncMock,
            return_value=42,
        ):
            resp = client.post("/api/stores/store-123/sync")
            assert resp.status_code == 200
            data = resp.json()
            assert data["message"] == "Product sync started"
            assert data["store_id"] == "store-123"

    def test_trigger_sync_unauthenticated(self, unauthed_client):
        resp = unauthed_client.post("/api/stores/store-123/sync")
        assert resp.status_code in (401, 403)

    def test_sync_returns_store_id_in_response(self, client, mock_db):
        with patch(
            "backend.main.shopify_service.sync_all_products",
            new_callable=AsyncMock,
            return_value=0,
        ):
            resp = client.post("/api/stores/my-store-id/sync")
            assert resp.status_code == 200
            assert resp.json()["store_id"] == "my-store-id"
