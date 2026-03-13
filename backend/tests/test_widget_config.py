"""Tests for widget config endpoint and wildcard CORS on widget-facing endpoints."""
import json
import pytest
from unittest.mock import patch, AsyncMock


# ---------------------------------------------------------------------------
# Widget Config — /api/widget/config
# ---------------------------------------------------------------------------


class TestWidgetConfigNoStoreId:
    def test_no_store_id_returns_defaults(self, client, mock_db):
        """GET /api/widget/config with no store_id returns safe defaults."""
        response = client.get("/api/widget/config")
        assert response.status_code == 200
        data = response.json()
        assert data["has_agent"] is False
        assert data["enabled"] is False
        assert data["agent_id"] is None
        assert data["widget_color"] == "#256af4"
        assert data["widget_position"] == "bottom-right"
        assert data["status"] == "no_store_id"


class TestWidgetConfigInvalidStoreId:
    def test_invalid_store_id_returns_defaults(self, client, mock_db):
        """GET /api/widget/config?store_id=not-a-uuid returns defaults gracefully (no 500)."""
        # asyncpg will raise on invalid UUID cast — mock that as an exception
        mock_db.fetchrow.side_effect = Exception("invalid input syntax for type uuid")
        response = client.get("/api/widget/config?store_id=not-a-uuid")
        assert response.status_code == 200
        data = response.json()
        assert data["has_agent"] is False
        assert data["enabled"] is False
        assert data["status"] == "error"


class TestWidgetConfigStoreNotFound:
    def test_store_not_found_returns_defaults(self, client, mock_db):
        """GET /api/widget/config?store_id=<valid-uuid-not-in-db> returns store_not_found."""
        mock_db.fetchrow.return_value = None
        response = client.get(
            "/api/widget/config?store_id=00000000-0000-0000-0000-000000000099"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_agent"] is False
        assert data["enabled"] is False
        assert data["status"] == "store_not_found"


class TestWidgetConfigActiveAgent:
    def test_active_agent_returns_config(self, client, mock_db):
        """Active agent with settings returns full config including agent_id."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_test_123",
            "agent_status": "active",
            "settings": json.dumps({
                "widget_color": "#ff0000",
                "widget_position": "bottom-left",
                "greeting_message": "Welcome!",
                "enabled": True,
            }),
        }
        response = client.get(
            "/api/widget/config?store_id=00000000-0000-0000-0000-000000000001"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_agent"] is True
        assert data["enabled"] is True
        assert data["agent_id"] == "agt_test_123"
        assert data["widget_color"] == "#ff0000"
        assert data["widget_position"] == "bottom-left"
        assert data["greeting_message"] == "Welcome!"
        assert data["status"] == "active"


class TestWidgetConfigDisabledAgent:
    def test_disabled_agent_returns_no_agent_id(self, client, mock_db):
        """Store with enabled=False in settings returns has_agent=True but agent_id=null."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_test_456",
            "agent_status": "active",
            "settings": json.dumps({
                "enabled": False,
                "widget_color": "#00ff00",
            }),
        }
        response = client.get(
            "/api/widget/config?store_id=00000000-0000-0000-0000-000000000001"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_agent"] is True
        assert data["enabled"] is False
        assert data["agent_id"] is None  # Not exposed when disabled


class TestWidgetConfigInactiveAgentStatus:
    def test_inactive_agent_status_returns_no_agent_id(self, client, mock_db):
        """Store with agent_status != 'active' returns agent_id=null."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_test_789",
            "agent_status": "creating",
            "settings": json.dumps({"enabled": True}),
        }
        response = client.get(
            "/api/widget/config?store_id=00000000-0000-0000-0000-000000000001"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_agent"] is True
        assert data["enabled"] is True
        assert data["agent_id"] is None  # Not exposed when agent isn't active
        assert data["status"] == "creating"


class TestWidgetConfigMissingSettings:
    def test_missing_settings_uses_defaults(self, client, mock_db):
        """Store with settings=None returns default color (#256af4) and position (bottom-right)."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_test_abc",
            "agent_status": "active",
            "settings": None,
        }
        response = client.get(
            "/api/widget/config?store_id=00000000-0000-0000-0000-000000000001"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["widget_color"] == "#256af4"
        assert data["widget_position"] == "bottom-right"
        assert data["greeting_message"] is None
        assert data["has_agent"] is True
        assert data["agent_id"] == "agt_test_abc"  # active + enabled(default True)


class TestWidgetConfigCORS:
    def test_cors_header_present(self, client, mock_db):
        """Widget config response includes Access-Control-Allow-Origin: * header."""
        response = client.get("/api/widget/config")
        assert response.headers.get("access-control-allow-origin") == "*"

    def test_cors_header_present_with_store(self, client, mock_db):
        """Widget config response includes wildcard CORS even with store_id."""
        mock_db.fetchrow.return_value = None
        response = client.get(
            "/api/widget/config?store_id=00000000-0000-0000-0000-000000000001"
        )
        assert response.headers.get("access-control-allow-origin") == "*"


class TestSignedUrlCORS:
    def test_signed_url_cors_header(self, client, mock_db):
        """/api/voice/signed-url response includes Access-Control-Allow-Origin: * header."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_cors_test",
            "agent_status": "active",
        }
        with patch("backend.main.elevenlabs_service") as mock_el, \
             patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_API_KEY = "test-api-key"
            mock_settings.ELEVENLABS_AGENT_ID = ""
            mock_el.get_signed_url = AsyncMock(
                return_value="wss://signed.elevenlabs.io/test"
            )
            response = client.get(
                "/api/voice/signed-url?store_id=00000000-0000-0000-0000-000000000001"
            )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == "*"
