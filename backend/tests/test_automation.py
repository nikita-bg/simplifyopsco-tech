"""Tests for email_service and automation_service modules.

Tests mock all external calls (httpx for Resend, elevenlabs_service, kb_service, db).
Uses pytest-asyncio (STRICT mode) consistent with existing test patterns.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx


# ---------------------------------------------------------------------------
# Helper to build a mock httpx.AsyncClient
# ---------------------------------------------------------------------------

def _make_mock_http_client(response_data=None, status_code=200, raise_exc=None):
    """Build a mock httpx.AsyncClient context manager."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = response_data or {}

    if raise_exc:
        mock_response.raise_for_status.side_effect = raise_exc
    else:
        mock_response.raise_for_status.return_value = None

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)
    return mock_client, mock_response


# ===========================================================================
# TestEmailService
# ===========================================================================

class TestEmailService:
    """Tests for EmailService.send_welcome_email and send_usage_alert."""

    @pytest.mark.asyncio
    async def test_send_welcome_email_success(self):
        """send_welcome_email sends correct payload to Resend API and returns sent=True."""
        from backend.email_service import EmailService

        service = EmailService()
        service.api_key = "re_test_key"
        service.from_email = "onboarding@simplifyops.co"

        mock_client, mock_response = _make_mock_http_client(
            response_data={"id": "email_123"},
            status_code=200,
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.send_welcome_email(
                to_email="merchant@example.com",
                store_domain="example.com",
                store_id="store-uuid-123",
            )

        assert result["sent"] is True
        # Verify POST was called to Resend
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "resend.com" in call_args[0][0]
        # Verify Authorization header
        assert "re_test_key" in call_args[1]["headers"]["Authorization"]
        # Verify payload contains store_id in html body
        payload = call_args[1]["json"]
        assert "store-uuid-123" in payload["html"]
        assert payload["to"] == ["merchant@example.com"]

    @pytest.mark.asyncio
    async def test_send_welcome_email_contains_embed_snippet(self):
        """send_welcome_email HTML includes the embed code snippet with store_id."""
        from backend.email_service import EmailService

        service = EmailService()
        service.api_key = "re_test_key"
        service.from_email = "noreply@simplifyops.co"

        mock_client, _ = _make_mock_http_client(response_data={"id": "email_456"})

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.send_welcome_email(
                to_email="owner@shop.com",
                store_domain="shop.com",
                store_id="embed-store-id",
            )

        assert result["sent"] is True
        payload = mock_client.post.call_args[1]["json"]
        # embed snippet must contain data-store-id
        assert "data-store-id" in payload["html"]
        assert "embed-store-id" in payload["html"]
        assert "widget-embed.js" in payload["html"]

    @pytest.mark.asyncio
    async def test_send_welcome_email_resend_failure_returns_gracefully(self):
        """send_welcome_email returns sent=False on Resend API failure without raising."""
        from backend.email_service import EmailService

        service = EmailService()
        service.api_key = "re_bad_key"
        service.from_email = "noreply@simplifyops.co"

        mock_client, _ = _make_mock_http_client(
            raise_exc=httpx.HTTPStatusError(
                "422 Unprocessable Entity",
                request=MagicMock(),
                response=MagicMock(status_code=422),
            )
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.send_welcome_email(
                to_email="bad@example.com",
                store_domain="example.com",
                store_id="store-xyz",
            )

        # Must NOT raise — returns gracefully with sent=False
        assert result["sent"] is False

    @pytest.mark.asyncio
    async def test_send_usage_alert_success(self):
        """send_usage_alert sends alert with minutes_used and minutes_limit in payload."""
        from backend.email_service import EmailService

        service = EmailService()
        service.api_key = "re_test_key"
        service.from_email = "onboarding@simplifyops.co"

        mock_client, _ = _make_mock_http_client(response_data={"id": "email_789"})

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.send_usage_alert(
                to_email="merchant@store.com",
                store_domain="store.com",
                minutes_used=240,
                minutes_limit=300,
            )

        assert result["sent"] is True
        payload = mock_client.post.call_args[1]["json"]
        assert "240" in payload["html"]
        assert "300" in payload["html"]
        # Subject should mention percentage
        assert "%" in payload["subject"]

    @pytest.mark.asyncio
    async def test_send_usage_alert_resend_failure_returns_gracefully(self):
        """send_usage_alert returns sent=False on network failure without raising."""
        from backend.email_service import EmailService

        service = EmailService()
        service.api_key = "re_test_key"
        service.from_email = "noreply@simplifyops.co"

        mock_client, _ = _make_mock_http_client(
            raise_exc=httpx.ConnectError("Connection refused")
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.send_usage_alert(
                to_email="merchant@store.com",
                store_domain="store.com",
                minutes_used=200,
                minutes_limit=300,
            )

        assert result["sent"] is False


# ===========================================================================
# TestOnboardingWorkflow
# ===========================================================================

class TestOnboardingWorkflow:
    """Tests for AutomationService.run_onboarding orchestration."""

    @pytest.mark.asyncio
    async def test_run_onboarding_happy_path(self):
        """run_onboarding calls agent creation, KB sync, and welcome email in order."""
        from backend.automation_service import AutomationService

        service = AutomationService()

        # Mock store row
        mock_store = MagicMock()
        mock_store.__getitem__ = lambda self, key: {
            "shop_domain": "happystore.com",
            "agent_status": None,
            "owner_id": "owner-uuid-123",
        }[key]

        # Mock template row
        mock_template = MagicMock()
        mock_template.__getitem__ = lambda self, key: {
            "id": "tpl-uuid",
            "conversation_config": {"agent": {"first_message": "Hello!"}},
        }[key]

        mock_agent_response = {"agent_id": "agt_new_123"}

        with patch("backend.automation_service.db") as mock_db, \
             patch("backend.automation_service.elevenlabs_service") as mock_el, \
             patch("backend.automation_service.kb_service") as mock_kb, \
             patch("backend.automation_service.email_service") as mock_email:

            mock_db.fetchrow = AsyncMock(side_effect=[mock_store, mock_template])
            mock_db.execute = AsyncMock()
            mock_el.create_agent = AsyncMock(return_value=mock_agent_response)
            mock_kb.trigger_kb_rebuild = AsyncMock(return_value={"status": "ok"})
            mock_email.send_welcome_email = AsyncMock(return_value={"sent": True})

            await service.run_onboarding(
                store_id="store-uuid-456",
                owner_email="owner@happystore.com",
            )

        # All three steps called
        mock_el.create_agent.assert_called_once()
        mock_kb.trigger_kb_rebuild.assert_called_once_with("store-uuid-456")
        mock_email.send_welcome_email.assert_called_once_with(
            to_email="owner@happystore.com",
            store_domain="happystore.com",
            store_id="store-uuid-456",
        )

    @pytest.mark.asyncio
    async def test_run_onboarding_agent_creation_failure_sets_failed_status(self):
        """When agent creation fails, agent_status='failed' is set and welcome email is NOT sent."""
        from backend.automation_service import AutomationService

        service = AutomationService()

        mock_store = MagicMock()
        mock_store.__getitem__ = lambda self, key: {
            "shop_domain": "failstore.com",
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
                side_effect=Exception("ElevenLabs 500 Internal Server Error")
            )
            mock_kb.trigger_kb_rebuild = AsyncMock()
            mock_email.send_welcome_email = AsyncMock()

            await service.run_onboarding(
                store_id="store-fail-id",
                owner_email="owner@failstore.com",
            )

        # DB must be updated with agent_status='failed'
        execute_calls = mock_db.execute.call_args_list
        failed_call = any(
            "failed" in str(call) for call in execute_calls
        )
        assert failed_call, "Expected 'failed' status to be set in DB"

        # Welcome email must NOT be sent
        mock_email.send_welcome_email.assert_not_called()

        # KB sync must NOT be attempted after agent failure
        mock_kb.trigger_kb_rebuild.assert_not_called()

    @pytest.mark.asyncio
    async def test_run_onboarding_kb_sync_failure_does_not_block(self):
        """KB sync failure should not block onboarding — welcome email still sent."""
        from backend.automation_service import AutomationService

        service = AutomationService()

        mock_store = MagicMock()
        mock_store.__getitem__ = lambda self, key: {
            "shop_domain": "kbfailstore.com",
            "agent_status": None,
            "owner_id": "owner-kb",
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
            mock_el.create_agent = AsyncMock(return_value={"agent_id": "agt_kb_test"})
            mock_kb.trigger_kb_rebuild = AsyncMock(
                side_effect=Exception("No products found")
            )
            mock_email.send_welcome_email = AsyncMock(return_value={"sent": True})

            # Should NOT raise
            await service.run_onboarding(
                store_id="store-kb-fail",
                owner_email="owner@kbfailstore.com",
            )

        # Email still sent despite KB failure
        mock_email.send_welcome_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_onboarding_db_error_does_not_crash(self):
        """DB errors in run_onboarding must not propagate — exception is swallowed."""
        from backend.automation_service import AutomationService

        service = AutomationService()

        with patch("backend.automation_service.db") as mock_db, \
             patch("backend.automation_service.elevenlabs_service") as mock_el, \
             patch("backend.automation_service.email_service") as mock_email:

            mock_db.fetchrow = AsyncMock(side_effect=Exception("DB connection lost"))
            mock_el.create_agent = AsyncMock()
            mock_email.send_welcome_email = AsyncMock()

            # run_onboarding must NOT raise — it swallows the error
            await service.run_onboarding(
                store_id="store-db-error",
                owner_email="owner@dberror.com",
            )

        # DB error means agent creation never reached
        mock_el.create_agent.assert_not_called()
        mock_email.send_welcome_email.assert_not_called()

    @pytest.mark.asyncio
    async def test_run_onboarding_no_owner_email_skips_welcome_email(self):
        """When owner_email is None and no email found in DB, welcome email is skipped."""
        from backend.automation_service import AutomationService

        service = AutomationService()

        mock_store = MagicMock()
        mock_store.__getitem__ = lambda self, key: {
            "shop_domain": "noemail.com",
            "agent_status": None,
            "owner_id": "owner-no-email",
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

            # fetchrow: store row, then template row, then None (no user email found)
            mock_db.fetchrow = AsyncMock(side_effect=[mock_store, mock_template, None])
            mock_db.fetchval = AsyncMock(return_value=None)
            mock_db.execute = AsyncMock()
            mock_el.create_agent = AsyncMock(return_value={"agent_id": "agt_noemail"})
            mock_kb.trigger_kb_rebuild = AsyncMock(return_value={"status": "ok"})
            mock_email.send_welcome_email = AsyncMock()

            await service.run_onboarding(store_id="store-no-email", owner_email=None)

        # Welcome email should NOT be sent when no email available
        mock_email.send_welcome_email.assert_not_called()


# ===========================================================================
# TestAutomationLifecycle
# ===========================================================================

class TestAutomationLifecycle:
    """Tests for AutomationService start/stop scheduler lifecycle."""

    @pytest.mark.asyncio
    async def test_start_initializes_scheduler(self):
        """AutomationService.start() calls scheduler.start()."""
        from backend.automation_service import AutomationService

        service = AutomationService()
        mock_scheduler = MagicMock()
        mock_scheduler.start = MagicMock()
        mock_scheduler.running = False
        service.scheduler = mock_scheduler

        await service.start()

        mock_scheduler.start.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_shuts_down_scheduler(self):
        """AutomationService.stop() calls scheduler.shutdown()."""
        from backend.automation_service import AutomationService

        service = AutomationService()
        mock_scheduler = MagicMock()
        mock_scheduler.shutdown = MagicMock()
        mock_scheduler.running = True
        service.scheduler = mock_scheduler

        await service.stop()

        mock_scheduler.shutdown.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_when_not_running_is_safe(self):
        """AutomationService.stop() is safe even if scheduler is not running."""
        from backend.automation_service import AutomationService

        service = AutomationService()
        mock_scheduler = MagicMock()
        mock_scheduler.running = False
        mock_scheduler.shutdown = MagicMock()
        service.scheduler = mock_scheduler

        # Should not raise
        await service.stop()
