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
