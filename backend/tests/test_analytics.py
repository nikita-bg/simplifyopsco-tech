"""Tests for analytics API endpoints."""
import pytest
from datetime import datetime, UTC
from unittest.mock import AsyncMock


class TestAnalyticsOverview:
    """GET /api/analytics/overview -- overview stats with trend comparison."""

    def test_analytics_overview_returns_totals(self, client, mock_db):
        """Mock fetchval to return conversation count and avg duration."""
        # fetchval called 5 times: total, avg_dur, total_dur, prev_total, prev_avg_dur
        mock_db.fetchval = AsyncMock(side_effect=[42, 65.3, 2743, 30, 55.0])

        response = client.get("/api/analytics/overview?store_id=test-store")
        assert response.status_code == 200
        body = response.json()
        assert body["total_conversations"] == 42
        assert body["avg_duration_seconds"] == 65.3
        assert body["prev_total_conversations"] == 30
        assert body["prev_avg_duration_seconds"] == 55.0
        assert body["total_duration_seconds"] == 2743
        assert body["period"] == "7d"

    def test_analytics_overview_no_store_id(self, client, mock_db):
        """Call without store_id, expect 422 (validation error)."""
        response = client.get("/api/analytics/overview")
        assert response.status_code == 422


class TestAnalyticsIntents:
    """GET /api/analytics/intents -- top customer intents."""

    def test_analytics_intents_returns_top(self, client, mock_db):
        """Mock db.fetch to return 3 intent rows."""
        mock_db.fetch = AsyncMock(return_value=[
            {"intent": "Buying", "count": 15},
            {"intent": "Browsing", "count": 10},
            {"intent": "Support", "count": 5},
        ])

        response = client.get("/api/analytics/intents?store_id=test-store")
        assert response.status_code == 200
        body = response.json()
        assert len(body["intents"]) == 3
        assert body["intents"][0]["intent"] == "Buying"
        assert body["intents"][0]["count"] == 15
        assert body["period"] == "7d"


class TestAnalyticsPeakHours:
    """GET /api/analytics/peak-hours -- hourly distribution."""

    def test_analytics_peak_hours_returns_24(self, client, mock_db):
        """Mock db.fetch to return rows for hours 9, 10, 14. Assert 24 entries."""
        mock_db.fetch = AsyncMock(return_value=[
            {"hour": 9, "count": 12},
            {"hour": 10, "count": 8},
            {"hour": 14, "count": 20},
        ])

        response = client.get("/api/analytics/peak-hours?store_id=test-store")
        assert response.status_code == 200
        body = response.json()
        assert len(body["hours"]) == 24
        # Check filled hours
        assert body["hours"][9]["count"] == 12
        assert body["hours"][10]["count"] == 8
        assert body["hours"][14]["count"] == 20
        # Check zero-filled hours
        assert body["hours"][0]["count"] == 0
        assert body["hours"][23]["count"] == 0
        assert body["period"] == "7d"


class TestAnalyticsUnanswered:
    """GET /api/analytics/unanswered -- unanswered questions."""

    def test_analytics_unanswered_returns_questions(self, client, mock_db):
        """Mock db.fetch to return 2 conversation rows with negative sentiment."""
        mock_db.fetch = AsyncMock(return_value=[
            {
                "intent": "Unknown",
                "transcript": [{"text": "What is your return policy?"}, {"text": "I could not find that info."}],
                "started_at": datetime(2026, 3, 10, 14, 30, tzinfo=UTC),
                "sentiment": "Negative",
            },
            {
                "intent": "Unanswered",
                "transcript": "Do you ship internationally?",
                "started_at": datetime(2026, 3, 11, 9, 15, tzinfo=UTC),
                "sentiment": "Negative",
            },
        ])

        response = client.get("/api/analytics/unanswered?store_id=test-store")
        assert response.status_code == 200
        body = response.json()
        assert len(body["questions"]) == 2
        assert body["total"] == 2
        assert body["questions"][0]["intent"] == "Unknown"
        assert "return policy" in body["questions"][0]["summary"]
        assert body["questions"][1]["intent"] == "Unanswered"
        assert body["period"] == "7d"


class TestAnalyticsPeriodParameter:
    """Period parameter validation across analytics endpoints."""

    def test_analytics_period_parameter(self, client, mock_db):
        """Call overview with period=30d, verify response includes period='30d'."""
        mock_db.fetchval = AsyncMock(side_effect=[10, 30.5, 305, 8, 28.0])

        response = client.get("/api/analytics/overview?store_id=test-store&period=30d")
        assert response.status_code == 200
        body = response.json()
        assert body["period"] == "30d"
        assert body["total_conversations"] == 10
