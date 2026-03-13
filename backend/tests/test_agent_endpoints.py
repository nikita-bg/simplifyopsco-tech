"""Tests for agent CRUD endpoints, template listing, and per-store signed URL."""
import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock


# ---------------------------------------------------------------------------
# Agent Create
# ---------------------------------------------------------------------------

class TestCreateAgentEndpoint:
    def test_create_agent_success(self, client, mock_db):
        """POST /api/agents/create with valid template creates agent."""
        # 1st fetchrow: store check (store exists, no active agent)
        # 2nd fetchrow: template lookup
        mock_db.fetchrow.side_effect = [
            {
                "agent_status": "none",
                "elevenlabs_agent_id": None,
                "shop_domain": "test.myshopify.com",
            },
            {
                "id": "tmpl-uuid-1",
                "conversation_config": json.dumps({"agent": {"first_message": "Hi"}}),
                "platform_settings": json.dumps({}),
            },
        ]

        with patch(
            "backend.main.elevenlabs_service"
        ) as mock_el:
            mock_el.create_agent = AsyncMock(
                return_value={"agent_id": "agt_123"}
            )
            response = client.post(
                "/api/agents/create",
                json={
                    "store_id": "00000000-0000-0000-0000-000000000001",
                    "template_type": "online_store",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert data["agent_id"] == "agt_123"
        assert data["agent_status"] == "active"

    def test_create_agent_no_template(self, client, mock_db):
        """Returns 404 when template type not found."""
        mock_db.fetchrow.side_effect = [
            {
                "agent_status": "none",
                "elevenlabs_agent_id": None,
                "shop_domain": "test.myshopify.com",
            },
            None,  # template not found
        ]

        response = client.post(
            "/api/agents/create",
            json={
                "store_id": "00000000-0000-0000-0000-000000000001",
                "template_type": "nonexistent_type",
            },
        )

        assert response.status_code == 404

    def test_create_agent_already_active(self, client, mock_db):
        """Returns 409 when store already has active agent."""
        mock_db.fetchrow.return_value = {
            "agent_status": "active",
            "elevenlabs_agent_id": "existing_agt",
            "shop_domain": "test.myshopify.com",
        }

        response = client.post(
            "/api/agents/create",
            json={
                "store_id": "00000000-0000-0000-0000-000000000001",
                "template_type": "online_store",
            },
        )

        assert response.status_code == 409

    def test_create_agent_api_failure(self, client, mock_db):
        """Returns 502 when ElevenLabs API fails, agent_status set to failed."""
        mock_db.fetchrow.side_effect = [
            {
                "agent_status": "none",
                "elevenlabs_agent_id": None,
                "shop_domain": "test.myshopify.com",
            },
            {
                "id": "tmpl-uuid-1",
                "conversation_config": json.dumps({"agent": {"first_message": "Hi"}}),
                "platform_settings": json.dumps({}),
            },
        ]

        with patch(
            "backend.main.elevenlabs_service"
        ) as mock_el:
            mock_el.create_agent = AsyncMock(
                side_effect=Exception("ElevenLabs API error")
            )
            response = client.post(
                "/api/agents/create",
                json={
                    "store_id": "00000000-0000-0000-0000-000000000001",
                    "template_type": "online_store",
                },
            )

        assert response.status_code == 502
        # Verify agent_status was set to 'failed' in DB
        calls = mock_db.execute.call_args_list
        failed_call = [c for c in calls if "failed" in str(c)]
        assert len(failed_call) > 0


# ---------------------------------------------------------------------------
# Agent Get
# ---------------------------------------------------------------------------

class TestGetAgentEndpoint:
    def test_get_agent_exists(self, client, mock_db):
        """Returns agent info when agent exists."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_456",
            "agent_status": "active",
            "agent_config": json.dumps({"voice_id": "voice1"}),
            "agent_template_id": "tmpl-uuid-1",
            "minutes_used": 42,
        }
        # For template type lookup
        mock_db.fetchval.return_value = "online_store"

        response = client.get(
            "/api/agents/00000000-0000-0000-0000-000000000001"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["elevenlabs_agent_id"] == "agt_456"
        assert data["agent_status"] == "active"
        assert data["minutes_used"] == 42

    def test_get_agent_not_found(self, client, mock_db):
        """Returns 404 when store not found."""
        mock_db.fetchrow.return_value = None

        response = client.get(
            "/api/agents/00000000-0000-0000-0000-000000000001"
        )

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Agent Update
# ---------------------------------------------------------------------------

class TestUpdateAgentEndpoint:
    def test_update_voice(self, client, mock_db):
        """PATCH with voice_id updates ElevenLabs then DB."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_456",
            "agent_status": "active",
            "agent_config": json.dumps({}),
        }

        with patch(
            "backend.main.elevenlabs_service"
        ) as mock_el:
            mock_el.update_agent = AsyncMock(return_value={"agent_id": "agt_456"})

            response = client.patch(
                "/api/agents/00000000-0000-0000-0000-000000000001",
                json={"voice_id": "new_voice_123"},
            )

        assert response.status_code == 200
        # Verify ElevenLabs was called with correct config
        mock_el.update_agent.assert_called_once()
        call_args = mock_el.update_agent.call_args
        assert "tts" in call_args.kwargs.get("conversation_config", {}) or \
               "tts" in (call_args[1].get("conversation_config", {}) if len(call_args) > 1 else call_args.kwargs.get("conversation_config", {}))

    def test_update_no_agent(self, client, mock_db):
        """Returns 404 when store has no active agent."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": None,
            "agent_status": "none",
            "agent_config": json.dumps({}),
        }

        response = client.patch(
            "/api/agents/00000000-0000-0000-0000-000000000001",
            json={"voice_id": "new_voice_123"},
        )

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Agent Delete
# ---------------------------------------------------------------------------

class TestDeleteAgentEndpoint:
    def test_delete_success(self, client, mock_db):
        """DELETE removes agent from ElevenLabs and cleans DB."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_456",
            "agent_status": "active",
        }

        with patch(
            "backend.main.elevenlabs_service"
        ) as mock_el:
            mock_el.delete_agent = AsyncMock(return_value=True)

            response = client.delete(
                "/api/agents/00000000-0000-0000-0000-000000000001"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] is True

    def test_delete_no_agent(self, client, mock_db):
        """Returns 404 when no agent to delete."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": None,
            "agent_status": "none",
        }

        response = client.delete(
            "/api/agents/00000000-0000-0000-0000-000000000001"
        )

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

class TestListTemplates:
    def test_returns_templates(self, client, mock_db):
        """GET /api/agents/templates returns template list."""
        mock_db.fetch.return_value = [
            {
                "id": "tmpl-1",
                "name": "Online Store Assistant",
                "type": "online_store",
                "description": "For e-commerce",
                "conversation_config": json.dumps({"agent": {}}),
                "platform_settings": json.dumps({}),
                "is_default": True,
            },
            {
                "id": "tmpl-2",
                "name": "Service Business Assistant",
                "type": "service_business",
                "description": "For services",
                "conversation_config": json.dumps({"agent": {}}),
                "platform_settings": json.dumps({}),
                "is_default": True,
            },
        ]

        response = client.get("/api/agents/templates")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["type"] == "online_store"


# ---------------------------------------------------------------------------
# Signed URL (per-store)
# ---------------------------------------------------------------------------

class TestSignedUrlPerStore:
    def test_per_store_agent(self, client, mock_db):
        """signed-url with store_id resolves per-store agent."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_456",
            "agent_status": "active",
        }

        with patch("backend.main.settings") as mock_settings, \
             patch("backend.main.elevenlabs_service") as mock_el:
            mock_settings.ELEVENLABS_API_KEY = "sk_test_key"
            mock_settings.ELEVENLABS_AGENT_ID = "global_agent_fallback"
            mock_el.get_signed_url = AsyncMock(
                return_value="wss://api.elevenlabs.io/signed?token=abc"
            )

            response = client.get(
                "/api/voice/signed-url?store_id=00000000-0000-0000-0000-000000000001"
            )

        assert response.status_code == 200
        data = response.json()
        assert "signed_url" in data

    def test_inactive_agent(self, client, mock_db):
        """Returns 503 when agent_status is not active."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_456",
            "agent_status": "pending",
        }

        with patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_API_KEY = "sk_test_key"
            mock_settings.ELEVENLABS_AGENT_ID = "global_agent_fallback"

            response = client.get(
                "/api/voice/signed-url?store_id=00000000-0000-0000-0000-000000000001"
            )

        assert response.status_code == 503

    def test_fallback_global(self, client, mock_db):
        """Falls back to global agent_id when no store_id."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "signed_url": "wss://api.elevenlabs.io/signed?token=xyz"
        }

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("backend.main.settings") as mock_settings, \
             patch("httpx.AsyncClient", return_value=mock_client):
            mock_settings.ELEVENLABS_API_KEY = "sk_test_key"
            mock_settings.ELEVENLABS_AGENT_ID = "global_agent_123"

            response = client.get("/api/voice/signed-url")

        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Voice Config (per-store)
# ---------------------------------------------------------------------------

class TestVoiceConfigPerStore:
    def test_per_store_config(self, client, mock_db):
        """voice/config with store_id resolves per-store agent."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_789",
            "agent_status": "active",
        }

        response = client.get(
            "/api/voice/config?store_id=00000000-0000-0000-0000-000000000001"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["agent_id"] == "agt_789"
        assert data["has_agent"] is True

    def test_fallback_global_config(self, client, mock_db):
        """Falls back to global agent_id when no store_id."""
        with patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_API_KEY = "sk_test"
            mock_settings.ELEVENLABS_AGENT_ID = "global_agent_123"

            response = client.get("/api/voice/config")

        assert response.status_code == 200
        data = response.json()
        assert data["agent_id"] == "global_agent_123"
