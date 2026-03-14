"""Tests for onboarding status tracking and enhanced store creation.

Tests cover:
- Enhanced POST /api/stores/create (store_name, store_type fields)
- GET /api/stores/{store_id}/onboarding-status endpoint
- AutomationService.run_onboarding step tracking and store_type usage
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


# ===========================================================================
# TestStoreCreateEnhanced
# ===========================================================================

class TestStoreCreateEnhanced:
    """Tests for enhanced POST /api/stores/create with store_name and store_type."""

    def test_create_store_with_name_and_type(self, client):
        """POST with store_name and store_type returns both fields in response."""
        response = client.post(
            "/api/stores/create",
            json={
                "site_url": "https://myshop.com",
                "store_name": "My Shop",
                "store_type": "service_business",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["store_name"] == "My Shop"
        assert body["store_type"] == "service_business"
        assert "store_id" in body
        assert body["site_url"] == "https://myshop.com"

    def test_create_store_invalid_type(self, client):
        """POST with invalid store_type returns 400."""
        response = client.post(
            "/api/stores/create",
            json={
                "site_url": "https://example.com",
                "store_type": "invalid",
            },
        )
        assert response.status_code == 400

    def test_create_store_defaults(self, client):
        """POST with only site_url defaults store_type to online_store."""
        response = client.post(
            "/api/stores/create",
            json={"site_url": "https://default.com"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["store_type"] == "online_store"


# ===========================================================================
# TestOnboardingStatus
# ===========================================================================

class TestOnboardingStatus:
    """Tests for GET /api/stores/{store_id}/onboarding-status."""

    def test_status_pending(self, client, mock_db):
        """After store creation, GET onboarding-status returns step='pending'."""
        mock_db.fetchrow = AsyncMock(return_value={
            "onboarding_step": "pending",
            "onboarding_error": None,
            "agent_status": None,
            "store_name": "Test Store",
            "elevenlabs_agent_id": None,
            "owner_id": "test-user-123",
        })
        response = client.get("/api/stores/store-uuid-123/onboarding-status")
        assert response.status_code == 200
        body = response.json()
        assert body["step"] == "pending"

    def test_status_not_found(self, client, mock_db):
        """Non-existent store id returns 404."""
        mock_db.fetchrow = AsyncMock(return_value=None)
        response = client.get("/api/stores/nonexistent-id/onboarding-status")
        assert response.status_code == 404

    def test_status_complete_response_shape(self, client, mock_db):
        """Response has keys: step, completed_steps, is_complete, is_failed, error, has_agent."""
        mock_db.fetchrow = AsyncMock(return_value={
            "onboarding_step": "complete",
            "onboarding_error": None,
            "agent_status": "active",
            "store_name": "Done Store",
            "elevenlabs_agent_id": "agt_123",
            "owner_id": "test-user-123",
        })
        response = client.get("/api/stores/store-done/onboarding-status")
        assert response.status_code == 200
        body = response.json()
        expected_keys = {"store_id", "step", "completed_steps", "is_complete", "is_failed", "error", "has_agent"}
        assert expected_keys.issubset(set(body.keys()))
        assert body["is_complete"] is True
        assert body["is_failed"] is False
        assert body["has_agent"] is True
        assert body["error"] is None


# ===========================================================================
# TestRunOnboardingSteps
# ===========================================================================

class TestRunOnboardingSteps:
    """Tests for run_onboarding step tracking and store_type parameter."""

    @pytest.mark.asyncio
    async def test_onboarding_updates_step_to_creating_agent(self):
        """run_onboarding updates onboarding_step to 'creating_agent' before agent creation."""
        from backend.automation_service import AutomationService

        service = AutomationService()

        mock_store = MagicMock()
        mock_store.__getitem__ = lambda self, key: {
            "shop_domain": "steptest.com",
            "agent_status": None,
            "owner_id": "owner-step",
        }[key]

        mock_template = MagicMock()
        mock_template.__getitem__ = lambda self, key: {
            "id": "tpl-uuid",
            "conversation_config": {"agent": {"first_message": "Hi"}},
        }[key]

        with patch("backend.automation_service.db") as mock_db, \
             patch("backend.automation_service.elevenlabs_service") as mock_el, \
             patch("backend.automation_service.kb_service") as mock_kb, \
             patch("backend.automation_service.email_service") as mock_email:

            mock_db.fetchrow = AsyncMock(side_effect=[mock_store, mock_template])
            mock_db.execute = AsyncMock()
            mock_el.create_agent = AsyncMock(return_value={"agent_id": "agt_step"})
            mock_kb.trigger_kb_rebuild = AsyncMock(return_value={"status": "ok"})
            mock_email.send_welcome_email = AsyncMock(return_value={"sent": True})

            await service.run_onboarding(
                store_id="store-step-test",
                owner_email="owner@steptest.com",
            )

        # Verify onboarding_step was set to 'creating_agent' at some point
        execute_calls = [str(call) for call in mock_db.execute.call_args_list]
        assert any("creating_agent" in c for c in execute_calls), (
            "Expected onboarding_step='creating_agent' UPDATE call"
        )

    @pytest.mark.asyncio
    async def test_onboarding_uses_store_type_for_template(self):
        """Pass store_type='lead_gen', verify template query uses it."""
        from backend.automation_service import AutomationService

        service = AutomationService()

        mock_store = MagicMock()
        mock_store.__getitem__ = lambda self, key: {
            "shop_domain": "leadgen.com",
            "agent_status": None,
            "owner_id": "owner-lg",
        }[key]

        mock_template = MagicMock()
        mock_template.__getitem__ = lambda self, key: {
            "id": "tpl-lg",
            "conversation_config": {},
        }[key]

        with patch("backend.automation_service.db") as mock_db, \
             patch("backend.automation_service.elevenlabs_service") as mock_el, \
             patch("backend.automation_service.kb_service") as mock_kb, \
             patch("backend.automation_service.email_service") as mock_email:

            mock_db.fetchrow = AsyncMock(side_effect=[mock_store, mock_template])
            mock_db.execute = AsyncMock()
            mock_el.create_agent = AsyncMock(return_value={"agent_id": "agt_lg"})
            mock_kb.trigger_kb_rebuild = AsyncMock(return_value={"status": "ok"})
            mock_email.send_welcome_email = AsyncMock(return_value={"sent": True})

            await service.run_onboarding(
                store_id="store-lg",
                owner_email="owner@leadgen.com",
                store_type="lead_gen",
            )

        # Verify the template query used 'lead_gen' not hardcoded 'online_store'
        fetchrow_calls = mock_db.fetchrow.call_args_list
        template_call = fetchrow_calls[1]  # second fetchrow is template lookup
        # The query should use a parameter for type, and 'lead_gen' should be in args
        assert "lead_gen" in str(template_call), (
            f"Expected 'lead_gen' in template query args, got: {template_call}"
        )

    @pytest.mark.asyncio
    async def test_onboarding_failure_sets_failed_step(self):
        """On agent creation error, onboarding_step is 'failed' with error message."""
        from backend.automation_service import AutomationService

        service = AutomationService()

        mock_store = MagicMock()
        mock_store.__getitem__ = lambda self, key: {
            "shop_domain": "failstep.com",
            "agent_status": None,
            "owner_id": "owner-fail",
        }[key]

        mock_template = MagicMock()
        mock_template.__getitem__ = lambda self, key: {
            "id": "tpl-uuid",
            "conversation_config": {},
        }[key]

        with patch("backend.automation_service.db") as mock_db, \
             patch("backend.automation_service.elevenlabs_service") as mock_el, \
             patch("backend.automation_service.kb_service") as mock_kb, \
             patch("backend.automation_service.email_service") as mock_email:

            mock_db.fetchrow = AsyncMock(side_effect=[mock_store, mock_template])
            mock_db.execute = AsyncMock()
            mock_el.create_agent = AsyncMock(
                side_effect=Exception("ElevenLabs API timeout")
            )
            mock_kb.trigger_kb_rebuild = AsyncMock()
            mock_email.send_welcome_email = AsyncMock()

            await service.run_onboarding(
                store_id="store-fail-step",
                owner_email="owner@failstep.com",
            )

        # Verify onboarding_step was set to 'failed' with error message
        execute_calls = [str(call) for call in mock_db.execute.call_args_list]
        assert any("failed" in c and "onboarding_step" in c for c in execute_calls), (
            "Expected onboarding_step='failed' UPDATE call"
        )
        assert any("ElevenLabs API timeout" in c for c in execute_calls), (
            "Expected error message in onboarding_error UPDATE"
        )
