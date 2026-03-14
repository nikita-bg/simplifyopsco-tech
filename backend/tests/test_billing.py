"""Tests for billing infrastructure: subscription endpoint, invoice.paid webhook,
110% usage enforcement, shared TIER_LIMITS constant, and trial expiry.

Tests are written FIRST (TDD RED phase) before any implementation changes.
Uses pytest-asyncio consistent with existing test patterns.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timedelta, timezone


# ===========================================================================
# TestTierLimitsShared
# ===========================================================================

class TestTierLimitsShared:
    """Tests for shared TIER_LIMITS constant between stripe_service and automation_service."""

    def test_tier_limits_importable_from_stripe_service(self):
        """TIER_LIMITS is importable from stripe_service with correct values."""
        from backend.stripe_service import TIER_LIMITS
        assert TIER_LIMITS == {"trial": 30, "starter": 100, "growth": 400, "scale": 2000}

    def test_automation_service_uses_shared_limits(self):
        """automation_service references TIER_LIMITS from stripe_service (no duplication)."""
        from backend.stripe_service import TIER_LIMITS as stripe_limits
        from backend.automation_service import AutomationService

        svc = AutomationService()
        # After refactor, AutomationService.TIER_LIMITS should be the same object
        # imported from stripe_service
        assert svc.TIER_LIMITS is stripe_limits


# ===========================================================================
# TestSubscriptionEndpoint
# ===========================================================================

class TestSubscriptionEndpoint:
    """Tests for GET /api/stores/{store_id}/subscription"""

    @pytest.mark.asyncio
    async def test_returns_minutes_used_not_sessions(self):
        """Response uses minutes_used/minutes_limit, NOT sessions_used/sessions_limit."""
        from backend.main import app
        from httpx import AsyncClient, ASGITransport

        store_id = "00000000-0000-0000-0000-000000000001"

        mock_row = {
            "subscription_tier": "starter",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "minutes_used": 67,
            "trial_ends_at": None,
        }

        with patch("backend.main.db") as mock_db, \
             patch("backend.main.require_store_owner", new_callable=AsyncMock):
            mock_db.pool = True
            mock_db.fetchrow = AsyncMock(return_value=mock_row)

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get(f"/api/stores/{store_id}/subscription")

        data = resp.json()
        assert resp.status_code == 200
        assert data["minutes_used"] == 67
        assert data["minutes_limit"] == 100
        # Must NOT contain legacy keys
        assert "sessions_used" not in data
        assert "sessions_limit" not in data

    @pytest.mark.asyncio
    async def test_tier_limits_are_correct(self):
        """Each tier returns the correct minutes_limit value."""
        from backend.main import app
        from httpx import AsyncClient, ASGITransport

        expected = {"trial": 30, "starter": 100, "growth": 400, "scale": 2000}

        for tier, expected_limit in expected.items():
            store_id = "00000000-0000-0000-0000-000000000001"

            mock_row = {
                "subscription_tier": tier,
                "stripe_customer_id": None,
                "stripe_subscription_id": None,
                "minutes_used": 0,
                "trial_ends_at": None,
            }

            with patch("backend.main.db") as mock_db, \
                 patch("backend.main.require_store_owner", new_callable=AsyncMock):
                mock_db.pool = True
                mock_db.fetchrow = AsyncMock(return_value=mock_row)

                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    resp = await client.get(f"/api/stores/{store_id}/subscription")

            data = resp.json()
            assert data["minutes_limit"] == expected_limit, f"Tier {tier}: expected {expected_limit}, got {data.get('minutes_limit')}"

    @pytest.mark.asyncio
    async def test_trial_expired_flag(self):
        """is_trial_expired=True when trial_ends_at is in the past."""
        from backend.main import app
        from httpx import AsyncClient, ASGITransport

        store_id = "00000000-0000-0000-0000-000000000001"
        past = datetime.now(timezone.utc) - timedelta(days=1)

        mock_row = {
            "subscription_tier": "trial",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "minutes_used": 5,
            "trial_ends_at": past,
        }

        with patch("backend.main.db") as mock_db, \
             patch("backend.main.require_store_owner", new_callable=AsyncMock):
            mock_db.pool = True
            mock_db.fetchrow = AsyncMock(return_value=mock_row)

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get(f"/api/stores/{store_id}/subscription")

        data = resp.json()
        assert data["is_trial_expired"] is True

    @pytest.mark.asyncio
    async def test_trial_not_expired(self):
        """is_trial_expired=False when trial_ends_at is in the future."""
        from backend.main import app
        from httpx import AsyncClient, ASGITransport

        store_id = "00000000-0000-0000-0000-000000000001"
        future = datetime.now(timezone.utc) + timedelta(days=5)

        mock_row = {
            "subscription_tier": "trial",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "minutes_used": 5,
            "trial_ends_at": future,
        }

        with patch("backend.main.db") as mock_db, \
             patch("backend.main.require_store_owner", new_callable=AsyncMock):
            mock_db.pool = True
            mock_db.fetchrow = AsyncMock(return_value=mock_row)

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get(f"/api/stores/{store_id}/subscription")

        data = resp.json()
        assert data["is_trial_expired"] is False


# ===========================================================================
# TestInvoicePaidWebhook
# ===========================================================================

class TestInvoicePaidWebhook:
    """Tests for invoice.paid Stripe webhook handler."""

    @pytest.mark.asyncio
    async def test_invoice_paid_resets_minutes_used(self):
        """invoice.paid webhook resets minutes_used to 0 for the store."""
        from backend.stripe_service import handle_webhook_event

        event = {
            "type": "invoice.paid",
            "data": {
                "object": {
                    "subscription": "sub_test_123",
                    "customer": "cus_test_456",
                }
            }
        }

        mock_store_row = {
            "id": "store-uuid-1",
            "agent_status": "active",
        }

        with patch("backend.stripe_service.stripe") as mock_stripe, \
             patch("backend.stripe_service.db") as mock_db:
            mock_stripe.Webhook.construct_event.return_value = event
            mock_db.pool = True
            mock_db.fetchrow = AsyncMock(return_value=mock_store_row)
            mock_db.execute = AsyncMock()

            result = await handle_webhook_event(b"payload", "sig_header")

        assert result is True
        # Verify minutes_used reset query was called
        execute_calls = mock_db.execute.call_args_list
        reset_called = any(
            "minutes_used" in str(call) and "0" in str(call)
            for call in execute_calls
        )
        assert reset_called, f"Expected minutes_used reset, got calls: {execute_calls}"

    @pytest.mark.asyncio
    async def test_invoice_paid_restores_limit_reached_status(self):
        """invoice.paid restores agent_status from 'limit_reached' to 'active'."""
        from backend.stripe_service import handle_webhook_event

        event = {
            "type": "invoice.paid",
            "data": {
                "object": {
                    "subscription": "sub_test_123",
                    "customer": "cus_test_456",
                }
            }
        }

        mock_store_row = {
            "id": "store-uuid-1",
            "agent_status": "limit_reached",
        }

        with patch("backend.stripe_service.stripe") as mock_stripe, \
             patch("backend.stripe_service.db") as mock_db:
            mock_stripe.Webhook.construct_event.return_value = event
            mock_db.pool = True
            mock_db.fetchrow = AsyncMock(return_value=mock_store_row)
            mock_db.execute = AsyncMock()

            result = await handle_webhook_event(b"payload", "sig_header")

        assert result is True
        # Verify agent_status restore query was called
        execute_calls = mock_db.execute.call_args_list
        restore_called = any(
            "agent_status" in str(call) and "active" in str(call)
            for call in execute_calls
        )
        assert restore_called, f"Expected agent_status restore to active, got calls: {execute_calls}"


# ===========================================================================
# TestUsageEnforcement
# ===========================================================================

class TestUsageEnforcement:
    """Tests for 110% soft limit enforcement in post-call webhook and daily check."""

    @pytest.mark.asyncio
    async def test_post_call_disables_at_110_percent(self):
        """minutes_used >= 110% of tier limit triggers agent_status='limit_reached'."""
        from backend.main import app
        from httpx import AsyncClient, ASGITransport

        # Starter tier limit = 100, 110% = 110
        post_call_store_row = {
            "subscription_tier": "starter",
            "minutes_used": 110,
        }

        with patch("backend.main.db") as mock_db, \
             patch("backend.main.SecurityLogger"):
            mock_db.pool = True
            # First fetchrow: agent lookup, second: store for enforcement
            mock_db.fetchrow = AsyncMock(side_effect=[
                # Agent lookup by agent_id
                {"id": "store-uuid-1", "shop_domain": "test.com", "elevenlabs_agent_id": "agent_123"},
                # Store row for 110% check
                post_call_store_row,
            ])
            mock_db.fetchval = AsyncMock(return_value=None)
            mock_db.execute = AsyncMock()

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/webhook/elevenlabs/post-call", json={
                    "call_id": "call_123",
                    "agent_id": "agent_123",
                    "transcript": "Hello",
                    "duration": 120,
                })

        # Check that agent_status was set to limit_reached
        execute_calls = mock_db.execute.call_args_list
        limit_reached_called = any(
            "limit_reached" in str(call)
            for call in execute_calls
        )
        assert limit_reached_called, f"Expected limit_reached update, got calls: {execute_calls}"

    @pytest.mark.asyncio
    async def test_post_call_no_disable_below_110_percent(self):
        """minutes_used < 110% of tier limit does NOT set limit_reached."""
        from backend.main import app
        from httpx import AsyncClient, ASGITransport

        # Starter tier limit = 100, 100% = 100 (below 110%)
        post_call_store_row = {
            "subscription_tier": "starter",
            "minutes_used": 100,
        }

        with patch("backend.main.db") as mock_db, \
             patch("backend.main.SecurityLogger"):
            mock_db.pool = True
            mock_db.fetchrow = AsyncMock(side_effect=[
                {"id": "store-uuid-1", "shop_domain": "test.com", "elevenlabs_agent_id": "agent_123"},
                post_call_store_row,
            ])
            mock_db.fetchval = AsyncMock(return_value=None)
            mock_db.execute = AsyncMock()

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post("/webhook/elevenlabs/post-call", json={
                    "call_id": "call_456",
                    "agent_id": "agent_123",
                    "transcript": "Hello",
                    "duration": 120,
                })

        execute_calls = mock_db.execute.call_args_list
        limit_reached_called = any(
            "limit_reached" in str(call)
            for call in execute_calls
        )
        assert not limit_reached_called, f"Should NOT set limit_reached below 110%, got calls: {execute_calls}"

    @pytest.mark.asyncio
    async def test_daily_usage_check_110_enforcement(self):
        """daily_usage_check enforces 110% limit (belt-and-suspenders)."""
        from backend.automation_service import AutomationService

        svc = AutomationService()

        # Store at 115% of starter limit (115 of 100)
        mock_rows = [
            {
                "id": "store-uuid-1",
                "shop_domain": "test.com",
                "minutes_used": 115,
                "subscription_tier": "starter",
                "owner_id": "owner-1",
                "agent_status": "active",
            }
        ]

        with patch("backend.automation_service.db") as mock_db, \
             patch("backend.automation_service.email_service") as mock_email:
            mock_db.pool = True
            mock_db.fetch = AsyncMock(return_value=mock_rows)
            mock_db.fetchrow = AsyncMock(return_value={"email": "owner@test.com"})
            mock_db.execute = AsyncMock()
            mock_email.send_usage_alert = AsyncMock()

            await svc.daily_usage_check()

        # Should have set agent_status to limit_reached
        execute_calls = mock_db.execute.call_args_list
        limit_reached_called = any(
            "limit_reached" in str(call)
            for call in execute_calls
        )
        assert limit_reached_called, f"Expected 110% enforcement in daily_usage_check, got calls: {execute_calls}"
