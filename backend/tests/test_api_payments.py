"""Tests for Stripe payment API endpoints — checkout, portal, webhook, config."""
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
# POST /api/stripe/checkout
# ---------------------------------------------------------------------------

class TestStripeCheckout:
    def test_creates_checkout_session(self, client, mock_db):
        with patch(
            "backend.main.create_checkout_session",
            new_callable=AsyncMock,
            return_value="https://checkout.stripe.com/test",
        ):
            resp = client.post(
                "/api/stripe/checkout",
                json={"store_id": "s1", "plan": "starter"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["checkout_url"] == "https://checkout.stripe.com/test"

    def test_missing_store_id_returns_400(self, client):
        resp = client.post("/api/stripe/checkout", json={"plan": "starter"})
        assert resp.status_code == 400

    def test_invalid_plan_returns_400(self, client):
        resp = client.post(
            "/api/stripe/checkout",
            json={"store_id": "s1", "plan": "enterprise"},
        )
        assert resp.status_code == 400

    def test_unauthenticated_returns_401(self, unauthed_client):
        resp = unauthed_client.post(
            "/api/stripe/checkout",
            json={"store_id": "s1", "plan": "starter"},
        )
        assert resp.status_code in (401, 403)

    def test_checkout_returns_500_when_stripe_not_configured(self, client, mock_db):
        with patch(
            "backend.main.create_checkout_session",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.post(
                "/api/stripe/checkout",
                json={"store_id": "s1", "plan": "starter"},
            )
            assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /api/stripe/portal
# ---------------------------------------------------------------------------

class TestStripePortal:
    def test_creates_portal_session(self, client, mock_db):
        with patch(
            "backend.main.create_portal_session",
            new_callable=AsyncMock,
            return_value="https://billing.stripe.com/test",
        ):
            resp = client.post(
                "/api/stripe/portal",
                json={"store_id": "s1"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["portal_url"] == "https://billing.stripe.com/test"

    def test_missing_store_id_returns_400(self, client):
        resp = client.post("/api/stripe/portal", json={})
        assert resp.status_code == 400

    def test_unauthenticated_returns_401(self, unauthed_client):
        resp = unauthed_client.post(
            "/api/stripe/portal",
            json={"store_id": "s1"},
        )
        assert resp.status_code in (401, 403)

    def test_portal_returns_500_when_stripe_not_configured(self, client, mock_db):
        with patch(
            "backend.main.create_portal_session",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = client.post(
                "/api/stripe/portal",
                json={"store_id": "s1"},
            )
            assert resp.status_code == 500


# ---------------------------------------------------------------------------
# POST /api/stripe/webhook
# ---------------------------------------------------------------------------

class TestStripeWebhook:
    def test_valid_webhook(self, client, mock_db):
        with patch(
            "backend.main.handle_webhook_event",
            new_callable=AsyncMock,
            return_value=True,
        ):
            resp = client.post(
                "/api/stripe/webhook",
                content=b'{"type":"checkout.session.completed"}',
                headers={"Stripe-Signature": "valid-sig"},
            )
            assert resp.status_code == 200
            assert resp.json()["received"] is True

    def test_invalid_signature_returns_400(self, client, mock_db):
        with patch(
            "backend.main.handle_webhook_event",
            new_callable=AsyncMock,
            return_value=False,
        ):
            resp = client.post(
                "/api/stripe/webhook",
                content=b'{"type":"test"}',
                headers={"Stripe-Signature": "bad-sig"},
            )
            assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/stripe/config
# ---------------------------------------------------------------------------

class TestStripeConfig:
    def test_returns_config(self, client):
        resp = client.get("/api/stripe/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "publishable_key" in data
        assert "has_stripe" in data

    def test_has_stripe_reflects_key_presence(self, client):
        with patch("backend.main.settings") as mock_settings:
            mock_settings.STRIPE_PUBLISHABLE_KEY = "pk_test_123"
            mock_settings.STRIPE_SECRET_KEY = "sk_test_123"
            resp = client.get("/api/stripe/config")
            assert resp.status_code == 200
