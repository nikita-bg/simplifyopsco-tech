"""
Automation Service — APScheduler lifecycle and onboarding workflow.

Replaces n8n with an in-process approach:
- APScheduler runs inside the FastAPI process, survives across requests.
- run_onboarding orchestrates: agent creation -> KB sync -> welcome email.
- Errors are isolated: agent failure leaves store in 'failed' state without
  sending email; KB sync failure does not block email delivery.
"""
import logging
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-not-found]

from backend.config import settings  # type: ignore[import]
from backend.database import db  # type: ignore[import]
from backend.elevenlabs_service import elevenlabs_service  # type: ignore[import]
from backend.kb_service import kb_service  # type: ignore[import]
from backend.email_service import email_service  # type: ignore[import]

logger = logging.getLogger("simplifyops.automation")


class AutomationService:
    """In-process automation with APScheduler + onboarding workflow."""

    def __init__(self) -> None:
        self.scheduler: AsyncIOScheduler = AsyncIOScheduler()

    # Tier limits in minutes (roadmap values, not legacy session counts)
    TIER_LIMITS: dict[str, int] = {
        "trial": 30,
        "starter": 100,
        "growth": 400,
        "scale": 2000,
    }

    async def start(self) -> None:
        """Start the APScheduler and register scheduled jobs. Call from FastAPI lifespan startup."""
        self.scheduler.add_job(
            self.daily_kb_resync,
            "cron",
            hour=3,
            minute=0,
            id="daily_kb_resync",
        )
        self.scheduler.add_job(
            self.daily_usage_check,
            "cron",
            hour=9,
            minute=0,
            id="daily_usage_check",
        )
        self.scheduler.start()
        logger.info("AutomationService scheduler started")

    async def stop(self) -> None:
        """Shut down the APScheduler. Call from FastAPI lifespan shutdown."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("AutomationService scheduler stopped")

    async def register_webhooks_for_store(self, store_id: str, agent_id: str) -> None:
        """Register the post-call webhook URL on an ElevenLabs agent.

        Builds the webhook URL from SHOPIFY_APP_URL setting and calls
        elevenlabs_service.register_webhook. Errors are logged, not raised.
        """
        webhook_url = f"{settings.SHOPIFY_APP_URL}/webhook/elevenlabs/post-call"
        try:
            await elevenlabs_service.register_webhook(agent_id, webhook_url)
            logger.info(
                "Webhook registered for store %s agent %s: %s",
                store_id,
                agent_id,
                webhook_url,
            )
        except Exception as exc:
            logger.error(
                "register_webhooks_for_store failed for store %s: %s",
                store_id,
                exc,
            )

    async def daily_kb_resync(self) -> None:
        """Scheduled job: rebuild knowledge base for all active stores.

        Runs at 3 AM UTC. Per-store errors are isolated — one failure never
        prevents other stores from syncing.
        """
        logger.info("Starting daily KB resync")
        try:
            rows = await db.fetch(
                "SELECT id FROM stores WHERE agent_status = 'active' AND elevenlabs_agent_id IS NOT NULL"
            )
        except Exception as exc:
            logger.error("daily_kb_resync: DB query failed: %s", exc)
            return

        total = len(rows)
        success = 0
        for row in rows:
            store_id: str = row["id"]
            try:
                await kb_service.trigger_kb_rebuild(store_id)
                success += 1
            except Exception as exc:
                logger.error(
                    "daily_kb_resync: KB sync failed for store %s: %s",
                    store_id,
                    exc,
                )

        logger.info("KB resync complete: %d/%d stores", success, total)

    async def daily_usage_check(self) -> None:
        """Scheduled job: send usage alert emails to stores >= 80% of their minute limit.

        Runs at 9 AM UTC. Uses roadmap minute limits: trial=30, starter=100, growth=400, scale=2000.
        """
        logger.info("Starting daily usage check")
        try:
            rows = await db.fetch(
                """SELECT s.id, s.shop_domain, s.minutes_used, s.subscription_tier, s.owner_id
                   FROM stores s
                   WHERE s.agent_status = 'active'"""
            )
        except Exception as exc:
            logger.error("daily_usage_check: DB query failed: %s", exc)
            return

        alerts_sent = 0
        for row in rows:
            store_id: str = row["id"]
            shop_domain: str = row["shop_domain"]
            minutes_used: int = row["minutes_used"] or 0
            tier: str = row["subscription_tier"] or "trial"
            owner_id: Optional[str] = row["owner_id"]

            limit = self.TIER_LIMITS.get(tier, self.TIER_LIMITS["trial"])
            if minutes_used < limit * 0.8:
                continue

            # Resolve owner email
            if not owner_id:
                logger.warning(
                    "daily_usage_check: store %s has no owner_id, skipping alert",
                    store_id,
                )
                continue

            try:
                email_row = await db.fetchrow(
                    "SELECT email FROM neon_auth.users_sync WHERE id = $1::uuid",
                    owner_id,
                )
            except Exception as exc:
                logger.warning(
                    "daily_usage_check: email lookup failed for store %s: %s",
                    store_id,
                    exc,
                )
                continue

            if not email_row:
                logger.warning(
                    "daily_usage_check: no email found for owner %s (store %s), skipping",
                    owner_id,
                    store_id,
                )
                continue

            owner_email: str = email_row["email"]
            try:
                await email_service.send_usage_alert(
                    to_email=owner_email,
                    store_domain=shop_domain,
                    minutes_used=minutes_used,
                    minutes_limit=limit,
                )
                alerts_sent += 1
            except Exception as exc:
                logger.error(
                    "daily_usage_check: alert email failed for store %s: %s",
                    store_id,
                    exc,
                )

        logger.info("Usage check complete: %d alerts sent", alerts_sent)

    async def run_onboarding(
        self,
        store_id: str,
        owner_email: Optional[str] = None,
    ) -> None:
        """Orchestrate the full onboarding workflow for a new store.

        Steps:
        1. Fetch store row from DB (shop_domain, owner_id).
        2. Fetch default agent template for 'online_store'.
        3. Create ElevenLabs agent (on failure: set agent_status='failed', return early).
        4. Update DB with agent info.
        5. Try KB sync (failure is non-blocking — log warning, continue).
        6. Send welcome email if owner_email available.

        The entire method is wrapped in a top-level try/except so it never
        crashes the BackgroundTasks runner.
        """
        logger.info("Starting onboarding for store %s", store_id)

        try:
            # --- Step 1: Fetch store row ---
            store_row = await db.fetchrow(
                "SELECT shop_domain, agent_status, owner_id FROM stores WHERE id = $1::uuid",
                store_id,
            )
            if store_row is None:
                logger.error("Onboarding: store %s not found in DB", store_id)
                return

            shop_domain: str = store_row["shop_domain"]
            owner_id: Optional[str] = store_row["owner_id"]

            # --- Step 2: Fetch default template ---
            template_row = await db.fetchrow(
                "SELECT id, conversation_config FROM agent_templates WHERE type = 'online_store' AND is_default = TRUE LIMIT 1",
            )
            conversation_config: dict = {}
            template_id: Optional[str] = None
            if template_row:
                template_id = template_row["id"]
                conversation_config = template_row["conversation_config"] or {}

            # --- Step 3: Create ElevenLabs agent ---
            try:
                agent_name = f"SimplifyOps Agent — {shop_domain}"
                agent_response = await elevenlabs_service.create_agent(
                    name=agent_name,
                    conversation_config=conversation_config,
                )
                elevenlabs_agent_id: str = agent_response["agent_id"]
            except Exception as exc:
                logger.error(
                    "Onboarding: agent creation failed for store %s: %s",
                    store_id,
                    exc,
                )
                # Set recoverable failed state — do NOT send welcome email
                await db.execute(
                    "UPDATE stores SET agent_status = 'failed' WHERE id = $1::uuid",
                    store_id,
                )
                return

            # --- Step 4: Update DB with agent info ---
            await db.execute(
                """UPDATE stores
                   SET elevenlabs_agent_id = $2,
                       agent_status        = 'active',
                       agent_config        = $3::jsonb,
                       agent_template_id   = $4::uuid
                   WHERE id = $1::uuid""",
                store_id,
                elevenlabs_agent_id,
                conversation_config,
                template_id,
            )

            # --- Step 5: Register post-call webhook (non-blocking) ---
            await self.register_webhooks_for_store(store_id, elevenlabs_agent_id)

            # --- Step 6: KB sync (non-blocking) ---
            try:
                await kb_service.trigger_kb_rebuild(store_id)
            except Exception as kb_exc:
                logger.warning(
                    "Onboarding: KB sync failed for store %s (non-blocking): %s",
                    store_id,
                    kb_exc,
                )

            # --- Step 7: Send welcome email ---
            resolved_email: Optional[str] = owner_email

            if resolved_email is None and owner_id:
                # Best-effort: look up email from Neon Auth users_sync
                try:
                    email_row = await db.fetchrow(
                        "SELECT email FROM neon_auth.users_sync WHERE id = $1::uuid",
                        owner_id,
                    )
                    if email_row:
                        resolved_email = email_row["email"]
                    else:
                        logger.warning(
                            "Onboarding: no email found for owner %s, skipping welcome email",
                            owner_id,
                        )
                except Exception as email_lookup_exc:
                    logger.warning(
                        "Onboarding: email lookup failed for owner %s: %s",
                        owner_id,
                        email_lookup_exc,
                    )

            if resolved_email:
                await email_service.send_welcome_email(
                    to_email=resolved_email,
                    store_domain=shop_domain,
                    store_id=store_id,
                )

            logger.info("Onboarding complete for store %s", store_id)

        except Exception as exc:
            # Top-level guard — never crash the BackgroundTasks runner
            logger.error(
                "Onboarding: unexpected error for store %s: %s",
                store_id,
                exc,
            )


# Singleton
automation_service = AutomationService()
