"""Tests for agent configuration service, models, and API endpoints."""
import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock


# ===========================================================================
# Task 1: Service module + Pydantic models (pure function tests, no DB)
# ===========================================================================


class TestCuratedVoices:
    def test_returns_10_voices(self):
        """get_curated_voices() returns list of 10 VoiceOption objects."""
        from backend.agent_config_service import get_curated_voices

        voices = get_curated_voices()
        assert len(voices) == 10

    def test_voice_has_required_fields(self):
        """Each voice has id, name, preview_url, gender, accent."""
        from backend.agent_config_service import get_curated_voices

        voices = get_curated_voices()
        for voice in voices:
            assert voice.id, f"Voice missing id: {voice}"
            assert voice.name, f"Voice missing name: {voice}"
            assert voice.preview_url.startswith("https://"), f"Bad preview_url: {voice.preview_url}"
            assert voice.gender in ("male", "female"), f"Invalid gender: {voice.gender}"
            assert voice.accent, f"Voice missing accent: {voice}"

    def test_voice_model_validates(self):
        """VoiceOption pydantic model validates correctly."""
        from backend.models import VoiceOption

        v = VoiceOption(
            id="abc123",
            name="Test Voice",
            preview_url="https://example.com/preview",
            gender="female",
            accent="American",
            description="A test voice",
        )
        assert v.id == "abc123"
        assert v.description == "A test voice"


class TestPersonalityPresets:
    def test_returns_6_presets(self):
        """get_personality_presets() returns 6 PersonalityPreset objects."""
        from backend.agent_config_service import get_personality_presets

        presets = get_personality_presets()
        assert len(presets) == 6

    def test_preset_has_required_fields(self):
        """Each preset has id, name, description, system_prompt."""
        from backend.agent_config_service import get_personality_presets

        presets = get_personality_presets()
        for p in presets:
            assert p.id, f"Preset missing id: {p}"
            assert p.name, f"Preset missing name: {p}"
            assert p.description, f"Preset missing description: {p}"
            assert p.system_prompt, f"Preset missing system_prompt: {p}"

    def test_friendly_preset_tone(self):
        """'friendly' preset system_prompt contains merchant-appropriate tone."""
        from backend.agent_config_service import get_personality_presets

        presets = get_personality_presets()
        friendly = next((p for p in presets if p.id == "friendly"), None)
        assert friendly is not None, "Missing 'friendly' preset"
        prompt = friendly.system_prompt.lower()
        assert "warm" in prompt or "friendly" in prompt or "helpful" in prompt

    def test_preset_has_store_name_placeholder(self):
        """Presets use {store_name} placeholder in system_prompt."""
        from backend.agent_config_service import get_personality_presets

        presets = get_personality_presets()
        for p in presets:
            assert "{store_name}" in p.system_prompt, f"Preset '{p.id}' missing {{store_name}} placeholder"

    def test_preset_model_validates(self):
        """PersonalityPreset pydantic model validates correctly."""
        from backend.models import PersonalityPreset

        p = PersonalityPreset(
            id="test",
            name="Test Preset",
            description="A test preset",
            system_prompt="You are a helpful assistant for {store_name}.",
        )
        assert p.id == "test"


class TestSupportedLanguages:
    def test_returns_at_least_28_languages(self):
        """get_supported_languages() returns 28+ LanguageOption objects."""
        from backend.agent_config_service import get_supported_languages

        langs = get_supported_languages()
        assert len(langs) >= 28

    def test_language_has_code_and_name(self):
        """Each language has code and name."""
        from backend.agent_config_service import get_supported_languages

        langs = get_supported_languages()
        for lang in langs:
            assert lang.code, f"Language missing code: {lang}"
            assert lang.name, f"Language missing name: {lang}"

    def test_includes_english(self):
        """Languages include English."""
        from backend.agent_config_service import get_supported_languages

        langs = get_supported_languages()
        codes = [l.code for l in langs]
        assert "en" in codes


class TestEmbedCodeGeneration:
    def test_generates_valid_html(self):
        """generate_embed_code returns valid HTML script tag."""
        from backend.agent_config_service import generate_embed_code

        html = generate_embed_code("store-123", "https://api.example.com")
        assert "<script" in html
        assert "store-123" in html
        assert "api.example.com" in html

    def test_contains_data_attributes(self):
        """Embed code has data-store-id attribute."""
        from backend.agent_config_service import generate_embed_code

        html = generate_embed_code("store-abc", "https://api.example.com")
        assert 'data-store-id="store-abc"' in html


class TestAgentConfigModels:
    def test_agent_config_response_validates(self):
        """AgentConfigResponse model validates with all fields."""
        from backend.models import AgentConfigResponse

        config = AgentConfigResponse(
            voice_id="voice_123",
            voice_name="Rachel",
            greeting="Hello!",
            widget_color="#256af4",
            widget_position="bottom-right",
            enabled=True,
            language="en",
            personality_preset="friendly",
            agent_status="active",
        )
        assert config.voice_id == "voice_123"
        assert config.enabled is True

    def test_agent_config_response_defaults(self):
        """AgentConfigResponse works with minimal fields."""
        from backend.models import AgentConfigResponse

        config = AgentConfigResponse(
            greeting="Hi",
            widget_color="#256af4",
            widget_position="bottom-right",
            enabled=True,
            language="en",
            agent_status="active",
        )
        assert config.voice_id is None
        assert config.personality_preset is None

    def test_agent_config_update_all_optional(self):
        """AgentConfigUpdate accepts partial updates (all fields optional)."""
        from backend.models import AgentConfigUpdate

        # Empty update
        update = AgentConfigUpdate()
        assert update.voice_id is None
        assert update.greeting is None

        # Partial update
        update2 = AgentConfigUpdate(voice_id="new_voice")
        assert update2.voice_id == "new_voice"
        assert update2.widget_color is None

    def test_embed_code_response_validates(self):
        """EmbedCodeResponse model validates."""
        from backend.models import EmbedCodeResponse

        resp = EmbedCodeResponse(embed_code="<script>...</script>", store_id="s1")
        assert resp.store_id == "s1"

    def test_language_option_validates(self):
        """LanguageOption model validates."""
        from backend.models import LanguageOption

        lang = LanguageOption(code="en", name="English")
        assert lang.code == "en"


# ===========================================================================
# Task 2: API Endpoint Tests
# ===========================================================================

STORE_ID = "00000000-0000-0000-0000-000000000001"


class TestGetAgentConfig:
    def test_returns_full_config(self, client, mock_db):
        """GET /api/agent/config/{store_id} returns 200 with full config."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_123",
            "agent_status": "active",
            "agent_config": json.dumps({"tts": {"voice_id": "21m00Tcm4TlvDq8ikWAM"}}),
            "settings": json.dumps({
                "widget_color": "#256af4",
                "widget_position": "bottom-right",
                "greeting_message": "Hello there!",
                "language": "en",
                "enabled": True,
                "voice_id": "21m00Tcm4TlvDq8ikWAM",
                "personality_preset": "friendly",
            }),
        }

        response = client.get(f"/api/agent/config/{STORE_ID}")

        assert response.status_code == 200
        data = response.json()
        assert data["widget_color"] == "#256af4"
        assert data["enabled"] is True
        assert data["language"] == "en"
        assert data["agent_status"] == "active"
        assert data["voice_name"] == "Rachel"  # looked up from curated voices

    def test_returns_404_for_unknown_store(self, client, mock_db):
        """GET /api/agent/config/{store_id} returns 404 for unknown store."""
        mock_db.fetchrow.return_value = None

        response = client.get(f"/api/agent/config/{STORE_ID}")

        assert response.status_code == 404


class TestPutAgentConfig:
    def test_update_voice_id(self, client, mock_db):
        """PUT with voice_id updates ElevenLabs then DB, returns updated config."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_123",
            "agent_status": "active",
            "agent_config": json.dumps({}),
            "settings": json.dumps({
                "widget_color": "#256af4",
                "widget_position": "bottom-right",
                "greeting_message": "Hi!",
                "language": "en",
                "enabled": True,
            }),
            "shop_domain": "test.myshopify.com",
        }

        with patch("backend.main.elevenlabs_service") as mock_el:
            mock_el.update_agent = AsyncMock(return_value={"agent_id": "agt_123"})

            response = client.put(
                f"/api/agent/config/{STORE_ID}",
                json={"voice_id": "abc"},
            )

        assert response.status_code == 200
        # ElevenLabs should have been called
        mock_el.update_agent.assert_called_once()
        data = response.json()
        assert data["voice_id"] == "abc"

    def test_disable_agent(self, client, mock_db):
        """PUT with enabled=false sets agent_status=inactive."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_123",
            "agent_status": "active",
            "agent_config": json.dumps({}),
            "settings": json.dumps({
                "widget_color": "#256af4",
                "widget_position": "bottom-right",
                "greeting_message": "Hi!",
                "language": "en",
                "enabled": True,
            }),
            "shop_domain": "test.myshopify.com",
        }

        response = client.put(
            f"/api/agent/config/{STORE_ID}",
            json={"enabled": False},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False
        assert data["agent_status"] == "inactive"

    def test_enable_agent(self, client, mock_db):
        """PUT with enabled=true sets agent_status=active."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_123",
            "agent_status": "inactive",
            "agent_config": json.dumps({}),
            "settings": json.dumps({
                "widget_color": "#256af4",
                "widget_position": "bottom-right",
                "greeting_message": "Hi!",
                "language": "en",
                "enabled": False,
            }),
            "shop_domain": "test.myshopify.com",
        }

        response = client.put(
            f"/api/agent/config/{STORE_ID}",
            json={"enabled": True},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True
        assert data["agent_status"] == "active"

    def test_personality_preset_pushes_prompt(self, client, mock_db):
        """PUT with personality_preset looks up system_prompt and pushes to ElevenLabs."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_123",
            "agent_status": "active",
            "agent_config": json.dumps({}),
            "settings": json.dumps({
                "widget_color": "#256af4",
                "widget_position": "bottom-right",
                "greeting_message": "Hi!",
                "language": "en",
                "enabled": True,
            }),
            "shop_domain": "test.myshopify.com",
        }

        with patch("backend.main.elevenlabs_service") as mock_el:
            mock_el.update_agent = AsyncMock(return_value={"agent_id": "agt_123"})

            response = client.put(
                f"/api/agent/config/{STORE_ID}",
                json={"personality_preset": "professional"},
            )

        assert response.status_code == 200
        # Verify ElevenLabs was called with prompt containing store name
        mock_el.update_agent.assert_called_once()
        call_kwargs = mock_el.update_agent.call_args
        conv_config = call_kwargs.kwargs.get("conversation_config") or call_kwargs[1].get("conversation_config", {})
        assert "prompt" in conv_config.get("agent", {})

    def test_widget_only_no_elevenlabs_call(self, client, mock_db):
        """PUT with widget_color only does NOT call ElevenLabs."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_123",
            "agent_status": "active",
            "agent_config": json.dumps({}),
            "settings": json.dumps({
                "widget_color": "#256af4",
                "widget_position": "bottom-right",
                "greeting_message": "Hi!",
                "language": "en",
                "enabled": True,
            }),
            "shop_domain": "test.myshopify.com",
        }

        with patch("backend.main.elevenlabs_service") as mock_el:
            mock_el.update_agent = AsyncMock(return_value={"agent_id": "agt_123"})

            response = client.put(
                f"/api/agent/config/{STORE_ID}",
                json={"widget_color": "#ff0000"},
            )

        assert response.status_code == 200
        # ElevenLabs should NOT have been called for widget-only change
        mock_el.update_agent.assert_not_called()
        data = response.json()
        assert data["widget_color"] == "#ff0000"


class TestGetVoices:
    def test_returns_voices_and_languages(self, client, mock_db):
        """GET /api/voices returns voices and languages in one response."""
        response = client.get("/api/voices")

        assert response.status_code == 200
        data = response.json()
        assert "voices" in data
        assert "languages" in data
        assert len(data["voices"]) == 10
        assert len(data["languages"]) >= 28
        # Also include personality presets
        assert "personality_presets" in data
        assert len(data["personality_presets"]) == 6


class TestGetEmbedCode:
    def test_returns_embed_html(self, client, mock_db):
        """GET /api/agent/embed-code/{store_id} returns embed HTML."""
        mock_db.fetchrow.return_value = {
            "id": STORE_ID,
            "elevenlabs_agent_id": "agt_123",
        }

        response = client.get(f"/api/agent/embed-code/{STORE_ID}")

        assert response.status_code == 200
        data = response.json()
        assert "embed_code" in data
        assert STORE_ID in data["embed_code"]
        assert data["store_id"] == STORE_ID
