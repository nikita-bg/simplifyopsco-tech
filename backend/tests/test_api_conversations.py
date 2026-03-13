"""Tests for conversations and sentiment report API endpoints."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures — mock DB, auth, and build TestClient
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_db():
    """Patch backend.database.db AND backend.main.db so no real DB is needed."""
    _db = MagicMock()
    _db.pool = True  # truthy → DB is "connected"
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
    """Patch auth middleware so every request is authenticated as test-user-123."""
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
    """Authenticated test client."""
    from backend.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture()
def unauthed_client(mock_db):
    """Unauthenticated test client — auth raises 401."""
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
# GET /api/conversations
# ---------------------------------------------------------------------------

class TestGetConversations:
    def test_returns_conversations(self, client, mock_db):
        now = datetime(2025, 6, 1, 12, 0, 0)
        mock_db.fetchval.return_value = 2
        mock_db.fetch.return_value = [
            {
                "id": "conv-1",
                "session_id": "sess-1",
                "transcript": "Hello",
                "intent": "Browsing",
                "sentiment": "Positive",
                "products_discussed": "[]",
                "cart_actions": "[]",
                "started_at": now,
                "customer_id": "cust-1",
            },
            {
                "id": "conv-2",
                "session_id": "sess-2",
                "transcript": "Goodbye",
                "intent": "Buying",
                "sentiment": "Neutral",
                "products_discussed": "[]",
                "cart_actions": "[]",
                "started_at": now,
                "customer_id": None,
            },
        ]

        resp = client.get("/api/conversations", params={"store_id": "store-123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "conversations" in data
        assert len(data["conversations"]) == 2
        assert data["total"] == 2

    def test_missing_store_id_returns_400(self, client):
        resp = client.get("/api/conversations")
        assert resp.status_code == 400

    def test_unauthenticated_returns_401(self, unauthed_client):
        resp = unauthed_client.get("/api/conversations", params={"store_id": "store-123"})
        assert resp.status_code in (401, 403)

    def test_limit_clamped_to_100(self, client, mock_db):
        mock_db.fetchval.return_value = 0
        mock_db.fetch.return_value = []

        resp = client.get("/api/conversations", params={"store_id": "store-123", "limit": 200})
        assert resp.status_code == 200
        data = resp.json()
        assert data["limit"] == 100


# ---------------------------------------------------------------------------
# GET /api/reports/sentiment
# ---------------------------------------------------------------------------

class TestSentimentReport:
    def test_returns_sentiment_distribution(self, client, mock_db):
        mock_db.fetch.return_value = [
            {"sentiment": "Positive", "count": 10},
            {"sentiment": "Neutral", "count": 5},
            {"sentiment": "Negative", "count": 2},
        ]

        resp = client.get("/api/reports/sentiment")
        assert resp.status_code == 200
        data = resp.json()
        assert "sentiment_distribution" in data
        assert len(data["sentiment_distribution"]) == 3

    def test_no_db_pool_returns_empty(self, client, mock_db):
        mock_db.pool = None  # simulate disconnected DB

        resp = client.get("/api/reports/sentiment")
        assert resp.status_code == 200
        data = resp.json()
        assert data["sentiment_distribution"] == []

    def test_sentiment_distribution_has_correct_shape(self, client, mock_db):
        mock_db.fetch.return_value = [
            {"sentiment": "Very Positive", "count": 3},
        ]

        resp = client.get("/api/reports/sentiment")
        assert resp.status_code == 200
        items = resp.json()["sentiment_distribution"]
        assert items[0]["sentiment"] == "Very Positive"
        assert items[0]["count"] == 3

    def test_sentiment_empty_when_no_data(self, client, mock_db):
        mock_db.fetch.return_value = []

        resp = client.get("/api/reports/sentiment")
        assert resp.status_code == 200
        assert resp.json()["sentiment_distribution"] == []
