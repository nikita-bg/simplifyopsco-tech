"""Tests for dashboard and analytics API endpoints."""
import pytest
from datetime import datetime, UTC
from unittest.mock import patch, AsyncMock


class TestStoreDashboardStats:
    """GET /api/dashboard/{store_id}/stats -- per-store stats."""

    def test_stats_returns_200_defaults_when_no_conversations(self, client, mock_db):
        """fetchval returns 0 (no conversations) so DashboardStats defaults."""
        mock_db.fetchval = AsyncMock(return_value=0)
        response = client.get("/api/dashboard/test-store/stats")
        assert response.status_code == 200
        body = response.json()
        assert body["total_conversations"] == 0
        assert body["total_products_recommended"] == 0
        assert body["add_to_cart_rate"] == 0.0

    def test_stats_returns_data_when_conversations_exist(self, client, mock_db):
        """Simulate conversations in the DB with sequential fetchval calls."""
        # The endpoint calls fetchval three times:
        #   1) total conversations  2) total_recommended  3) cart_count
        mock_db.fetchval = AsyncMock(side_effect=[10, 5, 3])
        # intent_rows and recent_rows via fetch (called twice)
        mock_db.fetch = AsyncMock(side_effect=[
            # intent distribution rows
            [{"intent": "Buying", "cnt": 6}, {"intent": "Browsing", "cnt": 4}],
            # recent conversations rows
            [
                {
                    "session_id": "sess-1",
                    "sentiment": "Positive",
                    "duration_seconds": 120,
                    "started_at": datetime(2024, 6, 15, 10, 0, tzinfo=UTC),
                    "products_discussed": "[]",
                    "cart_actions": "[]",
                },
            ],
        ])
        response = client.get("/api/dashboard/test-store/stats")
        assert response.status_code == 200
        body = response.json()
        assert body["total_conversations"] == 10
        assert body["total_products_recommended"] == 5
        assert body["add_to_cart_rate"] == 30.0  # 3/10 * 100
        assert len(body["intent_data"]) == 2


class TestGlobalDashboardStats:
    """GET /api/dashboard/stats -- aggregated across all stores."""

    def test_global_stats_returns_200_with_pool(self, client, mock_db):
        """With pool present and no data, returns defaults from the try block."""
        mock_db.fetchval = AsyncMock(return_value=0)
        mock_db.fetch = AsyncMock(return_value=[])
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 200
        body = response.json()
        assert "call_data" in body
        assert "total_calls" in body

    def test_global_stats_returns_defaults_without_pool(self, mock_db, mock_auth):
        """When pool is falsy the endpoint returns hardcoded zero defaults."""
        mock_db.pool = None

        from fastapi.testclient import TestClient
        from backend.main import app

        with TestClient(app) as c:
            response = c.get("/api/dashboard/stats")
            assert response.status_code == 200
            body = response.json()
            assert body["total_calls"] == 0
            assert body["avg_lead_score"] == 0
            assert body["conversion_rate"] == 0
            assert len(body["call_data"]) == 7  # Mon-Sun


class TestDashboardStatsSimple:
    """GET /api/dashboard-stats -- simplified metrics for frontend."""

    def test_dashboard_stats_returns_200(self, client, mock_db):
        mock_db.fetchval = AsyncMock(return_value=0)
        mock_db.fetch = AsyncMock(return_value=[])
        response = client.get("/api/dashboard-stats")
        assert response.status_code == 200
        body = response.json()
        assert "total_conversations" in body
        assert "avg_lead_score" in body
        assert "conversion_rate" in body
        assert "top_intents" in body


class TestVoiceConfig:
    """GET /api/voice/config -- returns ElevenLabs agent_id."""

    def test_voice_config_returns_200(self, client):
        response = client.get("/api/voice/config")
        assert response.status_code == 200
        body = response.json()
        assert "agent_id" in body
        assert "has_agent" in body
