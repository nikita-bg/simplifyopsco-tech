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

    async def start(self) -> None:
        """Start the APScheduler. Call from FastAPI lifespan startup."""
        self.scheduler.start()
        logger.info("AutomationService scheduler started")

    async def stop(self) -> None:
        """Shut down the APScheduler. Call from FastAPI lifespan shutdown."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("AutomationService scheduler stopped")

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

            # --- Step 5: KB sync (non-blocking) ---
            try:
                await kb_service.trigger_kb_rebuild(store_id)
            except Exception as kb_exc:
                logger.warning(
                    "Onboarding: KB sync failed for store %s (non-blocking): %s",
                    store_id,
                    kb_exc,
                )

            # --- Step 6: Send welcome email ---
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
