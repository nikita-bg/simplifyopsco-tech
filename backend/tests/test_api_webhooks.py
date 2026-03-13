"""Tests for ElevenLabs post-call and Shopify GDPR webhook endpoints."""
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
    """Clear rate limiter state so earlier test modules don't cause 429s."""
    from backend.security_middleware import rate_limiter
    rate_limiter.requests.clear()


@pytest.fixture()
def client(mock_db, mock_auth):
    from backend.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# POST /webhook/elevenlabs/post-call
# ---------------------------------------------------------------------------

class TestElevenLabsPostCall:
    def _default_analysis(self):
        return {
            "sentiment": "Neutral",
            "intent": "Browsing",
            "products_mentioned": [],
            "purchase_intent": 0.5,
        }

    def test_full_payload(self, client, mock_db):
        with patch(
            "backend.main.analyze_shopping_conversation",
            new_callable=AsyncMock,
            return_value=self._default_analysis(),
        ):
            resp = client.post(
                "/webhook/elevenlabs/post-call",
                json={
                    "call_id": "call-1",
                    "transcript": "Hello, I want sneakers",
                    "store_id": "store-123",
                    "duration": 120,
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert data["call_id"] == "call-1"
            assert "analysis" in data

    def test_empty_transcript(self, client, mock_db):
        with patch(
            "backend.main.analyze_shopping_conversation",
            new_callable=AsyncMock,
            return_value=self._default_analysis(),
        ):
            resp = client.post(
                "/webhook/elevenlabs/post-call",
                json={
                    "call_id": "call-2",
                    "transcript": "",
                    "store_id": "store-123",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["success"] is True

    def test_without_store_id(self, client, mock_db):
        with patch(
            "backend.main.analyze_shopping_conversation",
            new_callable=AsyncMock,
            return_value=self._default_analysis(),
        ):
            resp = client.post(
                "/webhook/elevenlabs/post-call",
                json={
                    "call_id": "call-3",
                    "transcript": "Just browsing",
                },
            )
            assert resp.status_code == 200
            # Should succeed — just won't save to DB
            assert resp.json()["success"] is True

    def test_generates_call_id_when_empty(self, client, mock_db):
        with patch(
            "backend.main.analyze_shopping_conversation",
            new_callable=AsyncMock,
            return_value=self._default_analysis(),
        ):
            resp = client.post(
                "/webhook/elevenlabs/post-call",
                json={"transcript": "Hi"},
            )
            assert resp.status_code == 200
            # call_id should be a UUID (non-empty)
            assert len(resp.json()["call_id"]) > 0

    def test_with_products_discussed(self, client, mock_db):
        with patch(
            "backend.main.analyze_shopping_conversation",
            new_callable=AsyncMock,
            return_value=self._default_analysis(),
        ):
            resp = client.post(
                "/webhook/elevenlabs/post-call",
                json={
                    "call_id": "call-5",
                    "transcript": "I like those shoes",
                    "store_id": "store-123",
                    "products_discussed": [101, 202],
                    "cart_actions": [{"action": "add", "product_id": 101}],
                },
            )
            assert resp.status_code == 200
            assert resp.json()["success"] is True


# ---------------------------------------------------------------------------
# POST /shopify/gdpr
# ---------------------------------------------------------------------------

class TestShopifyGDPR:
    def test_customers_data_request(self, client, mock_db):
        mock_db.fetch.return_value = []  # no conversations found

        with patch("backend.main.shopify_service.verify_hmac", return_value=True):
            resp = client.post(
                "/shopify/gdpr",
                content=json.dumps({
                    "shop_domain": "test.myshopify.com",
                    "customer": {"id": "cust-1"},
                }).encode(),
                headers={
                    "X-Shopify-Topic": "customers/data_request",
                    "X-Shopify-Hmac-SHA256": "valid-hmac",
                },
            )
            assert resp.status_code == 200

    def test_customers_redact(self, client, mock_db):
        with patch("backend.main.shopify_service.verify_hmac", return_value=True):
            resp = client.post(
                "/shopify/gdpr",
                content=json.dumps({
                    "shop_domain": "test.myshopify.com",
                    "customer": {"id": "cust-2"},
                }).encode(),
                headers={
                    "X-Shopify-Topic": "customers/redact",
                    "X-Shopify-Hmac-SHA256": "valid-hmac",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["received"] is True

    def test_shop_redact(self, client, mock_db):
        with patch("backend.main.shopify_service.verify_hmac", return_value=True):
            resp = client.post(
                "/shopify/gdpr",
                content=json.dumps({
                    "shop_domain": "closing.myshopify.com",
                }).encode(),
                headers={
                    "X-Shopify-Topic": "shop/redact",
                    "X-Shopify-Hmac-SHA256": "valid-hmac",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["received"] is True

    def test_invalid_hmac_returns_401(self, client, mock_db):
        with patch("backend.main.shopify_service.verify_hmac", return_value=False):
            resp = client.post(
                "/shopify/gdpr",
                content=json.dumps({
                    "shop_domain": "test.myshopify.com",
                    "customer": {"id": "cust-3"},
                }).encode(),
                headers={
                    "X-Shopify-Topic": "customers/data_request",
                    "X-Shopify-Hmac-SHA256": "bad-hmac",
                },
            )
            assert resp.status_code == 401

    def test_gdpr_with_no_topic_returns_received(self, client, mock_db):
        with patch("backend.main.shopify_service.verify_hmac", return_value=True):
            resp = client.post(
                "/shopify/gdpr",
                content=json.dumps({
                    "shop_domain": "test.myshopify.com",
                }).encode(),
                headers={
                    "X-Shopify-Hmac-SHA256": "valid-hmac",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["received"] is True
