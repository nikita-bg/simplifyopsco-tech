"""Tests for store settings, subscription, and reports/insights API endpoints."""
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
# GET /api/stores/{store_id}/settings
# ---------------------------------------------------------------------------

class TestGetStoreSettings:
    def test_returns_settings(self, client, mock_db):
        mock_db.fetchrow.return_value = {
            "settings": {"widget_color": "#6366f1", "widget_position": "bottom-right"},
        }

        resp = client.get("/api/stores/store-123/settings")
        assert resp.status_code == 200
        data = resp.json()
        assert data["widget_color"] == "#6366f1"

    def test_store_not_found_returns_404(self, client, mock_db):
        mock_db.fetchrow.return_value = None

        resp = client.get("/api/stores/store-123/settings")
        assert resp.status_code == 404

    def test_returns_defaults_when_settings_null(self, client, mock_db):
        mock_db.fetchrow.return_value = {"settings": None}

        resp = client.get("/api/stores/store-123/settings")
        assert resp.status_code == 200
        data = resp.json()
        # StoreSettings defaults
        assert data["widget_color"] == "#6366f1"
        assert data["enabled"] is True


# ---------------------------------------------------------------------------
# PUT /api/stores/{store_id}/settings
# ---------------------------------------------------------------------------

class TestUpdateStoreSettings:
    def test_update_settings(self, client, mock_db):
        resp = client.put(
            "/api/stores/store-123/settings",
            json={"widget_color": "#ff0000"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Settings updated"
        assert data["settings"]["widget_color"] == "#ff0000"

    def test_update_settings_preserves_defaults(self, client, mock_db):
        resp = client.put(
            "/api/stores/store-123/settings",
            json={"widget_color": "#00ff00"},
        )
        assert resp.status_code == 200
        settings = resp.json()["settings"]
        # Other fields should have Pydantic defaults
        assert settings["widget_position"] == "bottom-right"
        assert settings["enabled"] is True


# ---------------------------------------------------------------------------
# GET /api/stores/{store_id}/subscription
# ---------------------------------------------------------------------------

class TestGetSubscription:
    def test_returns_subscription(self, client, mock_db):
        mock_db.fetchrow.return_value = {
            "subscription_tier": "starter",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
        }
        mock_db.fetchval.return_value = 5  # sessions used

        resp = client.get("/api/stores/store-123/subscription")
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "starter"
        assert data["status"] == "active"
        assert data["sessions_used"] == 5
        assert data["sessions_limit"] == 100  # starter limit

    def test_store_not_found_returns_404(self, client, mock_db):
        mock_db.fetchrow.return_value = None

        resp = client.get("/api/stores/store-123/subscription")
        assert resp.status_code == 404

    def test_no_db_pool_returns_defaults(self, client, mock_db):
        mock_db.pool = None

        resp = client.get("/api/stores/store-123/subscription")
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "trial"
        assert data["sessions_limit"] == 30


# ---------------------------------------------------------------------------
# GET /api/stores/{store_id}/reports/insights
# ---------------------------------------------------------------------------

class TestReportsInsights:
    def test_returns_insights(self, client, mock_db):
        # The endpoint calls fetchval multiple times for different aggregates
        mock_db.fetchval.side_effect = [
            120.0,   # avg duration in seconds
            2.5,     # avg products per conversation
            10,      # total with products discussed
            3,       # total with cart actions
            25,      # unique users
        ]

        resp = client.get("/api/stores/store-123/reports/insights")
        assert resp.status_code == 200
        data = resp.json()
        assert "avg_duration" in data
        assert "avg_products" in data
        assert "cart_abandonment_rate" in data
        assert "unique_users" in data
        assert data["unique_users"] == 25

    def test_no_db_pool_returns_defaults(self, client, mock_db):
        mock_db.pool = None

        resp = client.get("/api/stores/store-123/reports/insights")
        assert resp.status_code == 200
        data = resp.json()
        assert data["avg_duration"] == 0
        assert data["avg_products"] == 0
        assert data["cart_abandonment_rate"] == 0
        assert data["unique_users"] == 0
