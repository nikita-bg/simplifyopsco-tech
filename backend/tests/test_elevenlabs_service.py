"""Unit tests for ElevenLabsService CRUD methods.

Tests mock httpx.AsyncClient to verify correct HTTP calls
without hitting the real ElevenLabs API.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from backend.elevenlabs_service import ElevenLabsService


def _make_mock_client(response_data=None, status_code=200, raise_for_status=None):
    """Build a mock httpx.AsyncClient context manager."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = response_data or {}

    if raise_for_status:
        mock_response.raise_for_status.side_effect = raise_for_status
    else:
        mock_response.raise_for_status.return_value = None

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.patch = AsyncMock(return_value=mock_response)
    mock_client.delete = AsyncMock(return_value=mock_response)
    return mock_client, mock_response


# ---------------------------------------------------------------------------
# Create Agent
# ---------------------------------------------------------------------------

class TestCreateAgent:
    """Tests for elevenlabs_service.create_agent"""

    @pytest.mark.asyncio
    async def test_create_agent_success(self):
        """POST to /v1/convai/agents/create returns agent_id."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(
            response_data={"agent_id": "agt_test_123", "name": "Test Agent"}
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.create_agent(
                name="Test Agent",
                conversation_config={"agent": {"first_message": "Hello"}},
            )

        assert result["agent_id"] == "agt_test_123"
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "/agents/create" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_create_agent_with_platform_settings(self):
        """POST includes platform_settings when provided."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(
            response_data={"agent_id": "agt_with_platform"}
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.create_agent(
                name="Test",
                conversation_config={"agent": {}},
                platform_settings={"widget": {"variant": "compact"}},
            )

        assert result["agent_id"] == "agt_with_platform"
        call_kwargs = mock_client.post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json", {})
        assert "platform_settings" in payload

    @pytest.mark.asyncio
    async def test_create_agent_api_error(self):
        """API error raises httpx.HTTPStatusError."""
        import httpx

        service = ElevenLabsService()
        error = httpx.HTTPStatusError(
            "Too Many Requests",
            request=MagicMock(),
            response=MagicMock(status_code=429),
        )
        mock_client, _ = _make_mock_client(raise_for_status=error)

        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.HTTPStatusError):
                await service.create_agent(
                    name="Test",
                    conversation_config={},
                )


# ---------------------------------------------------------------------------
# Get Agent
# ---------------------------------------------------------------------------

class TestGetAgent:
    """Tests for elevenlabs_service.get_agent"""

    @pytest.mark.asyncio
    async def test_get_agent_success(self):
        """GET returns full agent configuration."""
        service = ElevenLabsService()
        agent_data = {
            "agent_id": "agt_456",
            "name": "My Agent",
            "conversation_config": {"agent": {"first_message": "Hi"}},
        }
        mock_client, _ = _make_mock_client(response_data=agent_data)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.get_agent("agt_456")

        assert result["agent_id"] == "agt_456"
        assert result["name"] == "My Agent"
        mock_client.get.assert_called_once()
        assert "/agents/agt_456" in mock_client.get.call_args[0][0]


# ---------------------------------------------------------------------------
# Update Agent
# ---------------------------------------------------------------------------

class TestUpdateAgent:
    """Tests for elevenlabs_service.update_agent"""

    @pytest.mark.asyncio
    async def test_update_agent_partial(self):
        """PATCH with only conversation_config sends minimal payload."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(
            response_data={"agent_id": "agt_789"}
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.update_agent(
                "agt_789",
                conversation_config={"tts": {"voice_id": "new_voice"}},
            )

        assert result["agent_id"] == "agt_789"
        mock_client.patch.assert_called_once()
        call_kwargs = mock_client.patch.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json", {})
        assert "conversation_config" in payload
        assert "platform_settings" not in payload
        assert "name" not in payload

    @pytest.mark.asyncio
    async def test_update_agent_empty_payload(self):
        """PATCH with no fields sends empty payload."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(
            response_data={"agent_id": "agt_789"}
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.update_agent("agt_789")

        assert result["agent_id"] == "agt_789"
        call_kwargs = mock_client.patch.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json", {})
        assert payload == {}

    @pytest.mark.asyncio
    async def test_update_agent_all_fields(self):
        """PATCH with all fields includes everything."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(
            response_data={"agent_id": "agt_full"}
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.update_agent(
                "agt_full",
                conversation_config={"tts": {"voice_id": "v1"}},
                platform_settings={"widget": {"variant": "full"}},
                name="Updated Name",
            )

        call_kwargs = mock_client.patch.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json", {})
        assert "conversation_config" in payload
        assert "platform_settings" in payload
        assert "name" in payload


# ---------------------------------------------------------------------------
# Delete Agent
# ---------------------------------------------------------------------------

class TestDeleteAgent:
    """Tests for elevenlabs_service.delete_agent"""

    @pytest.mark.asyncio
    async def test_delete_success(self):
        """DELETE returns True on 200."""
        service = ElevenLabsService()
        mock_client, mock_response = _make_mock_client(status_code=200)
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.delete_agent("agt_to_delete")

        assert result is True
        mock_client.delete.assert_called_once()
        assert "/agents/agt_to_delete" in mock_client.delete.call_args[0][0]

    @pytest.mark.asyncio
    async def test_delete_not_found(self):
        """DELETE returns False on 404."""
        service = ElevenLabsService()
        mock_client, mock_response = _make_mock_client(status_code=404)
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.delete_agent("agt_nonexistent")

        assert result is False


# ---------------------------------------------------------------------------
# Signed URL
# ---------------------------------------------------------------------------

class TestGetSignedUrl:
    """Tests for elevenlabs_service.get_signed_url"""

    @pytest.mark.asyncio
    async def test_get_signed_url(self):
        """Returns signed_url string from response."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(
            response_data={"signed_url": "wss://api.elevenlabs.io/convai?token=abc123"}
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.get_signed_url("agt_for_url")

        assert result == "wss://api.elevenlabs.io/convai?token=abc123"
        mock_client.get.assert_called_once()
        call_args = mock_client.get.call_args
        assert "get-signed-url" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_get_signed_url_empty(self):
        """Returns empty string when signed_url not in response."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(response_data={})

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.get_signed_url("agt_empty")

        assert result == ""
