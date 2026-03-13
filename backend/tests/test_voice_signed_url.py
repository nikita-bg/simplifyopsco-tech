"""Tests for the signed URL endpoint (SEC-03)."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


class TestVoiceSignedUrl:
    """Tests for GET /api/voice/signed-url."""

    def test_returns_signed_url_on_success(self, client):
        """Test 1: Returns 200 with signed_url when ElevenLabs API succeeds."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"signed_url": "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=test&token=abc"}

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("backend.main.settings") as mock_settings, \
             patch("httpx.AsyncClient", return_value=mock_client):
            mock_settings.ELEVENLABS_API_KEY = "sk_test_key"
            mock_settings.ELEVENLABS_AGENT_ID = "agent_test_123"

            response = client.get("/api/voice/signed-url")

        assert response.status_code == 200
        data = response.json()
        assert "signed_url" in data
        assert data["signed_url"].startswith("wss://")

    def test_returns_503_when_api_key_missing(self, client):
        """Test 2: Returns 503 when ELEVENLABS_API_KEY is not set."""
        with patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_API_KEY = None
            mock_settings.ELEVENLABS_AGENT_ID = "agent_test_123"

            response = client.get("/api/voice/signed-url")

        assert response.status_code == 503
        assert "Voice AI not configured" in response.json()["detail"]

    def test_returns_503_when_agent_id_missing(self, client):
        """Test 3: Returns 503 when ELEVENLABS_AGENT_ID is not set."""
        with patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_API_KEY = "sk_test_key"
            mock_settings.ELEVENLABS_AGENT_ID = None

            response = client.get("/api/voice/signed-url")

        assert response.status_code == 503
        assert "Agent not configured" in response.json()["detail"]

    def test_returns_502_when_elevenlabs_api_fails(self, client):
        """Test 4: Returns 502 when ElevenLabs API returns non-200."""
        mock_response = MagicMock()
        mock_response.status_code = 401

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("backend.main.settings") as mock_settings, \
             patch("httpx.AsyncClient", return_value=mock_client):
            mock_settings.ELEVENLABS_API_KEY = "sk_test_key"
            mock_settings.ELEVENLABS_AGENT_ID = "agent_test_123"

            response = client.get("/api/voice/signed-url")

        assert response.status_code == 502
        assert "Failed to get signed URL" in response.json()["detail"]

    def test_accepts_optional_store_id_param(self, client):
        """Test 5: Accepts optional store_id query param for future multi-tenant use."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"signed_url": "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=test&token=xyz"}

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("backend.main.settings") as mock_settings, \
             patch("httpx.AsyncClient", return_value=mock_client):
            mock_settings.ELEVENLABS_API_KEY = "sk_test_key"
            mock_settings.ELEVENLABS_AGENT_ID = "agent_test_123"

            response = client.get("/api/voice/signed-url?store_id=store_abc")

        assert response.status_code == 200
        assert "signed_url" in response.json()
