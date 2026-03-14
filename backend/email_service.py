"""
Resend Email Service — Transactional emails for SimplifyOps.

Uses raw httpx (consistent with elevenlabs_service.py pattern — NOT the Resend SDK).
Sends welcome emails (with embed snippet) and usage alert emails.
"""
import logging
from typing import Any

import httpx  # type: ignore[import-not-found]

from backend.config import settings  # type: ignore[import]

logger = logging.getLogger("simplifyops.email")

RESEND_API_URL = "https://api.resend.com/emails"


class EmailService:
    """Resend-based transactional email service."""

    def __init__(self) -> None:
        self.api_key: str = settings.RESEND_API_KEY or ""
        self.from_email: str = settings.RESEND_FROM_EMAIL

    def _headers(self) -> dict[str, str]:
        """Return Resend API authentication headers."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def send_welcome_email(
        self,
        to_email: str,
        store_domain: str,
        store_id: str,
    ) -> dict[str, Any]:
        """Send a welcome email with the embed code snippet.

        Includes:
        - Personalized greeting for the store domain
        - Embed code snippet (script tag with data-store-id)
        - Link to the dashboard

        Returns {"sent": True} on success, {"sent": False} on any failure.
        Never raises — errors are logged and swallowed.
        """
        embed_snippet = (
            f'<script src="{settings.SHOPIFY_APP_URL}/widget-embed.js" '
            f'data-store-id="{store_id}"></script>'
        )
        dashboard_url = f"{settings.FRONTEND_URL}/dashboard"

        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px;">
    <h1 style="color: #256af4;">Your AI Voice Assistant is Ready!</h1>
    <p>Hello! Your AI-powered voice shopping assistant for <strong>{store_domain}</strong> has been created and is ready to use.</p>

    <h2 style="color: #333;">Add to Your Website</h2>
    <p>Copy and paste this snippet into your website's HTML, just before the closing <code>&lt;/body&gt;</code> tag:</p>
    <pre style="background: #0f1115; color: #e2e8f0; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px;">{embed_snippet}</pre>

    <p style="margin-top: 24px;">
      <a href="{dashboard_url}" style="background: #256af4; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Go to Dashboard
      </a>
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #888; font-size: 12px;">SimplifyOps — AI Voice Shopping Assistant</p>
  </div>
</body>
</html>
"""

        payload = {
            "from": self.from_email,
            "to": [to_email],
            "subject": "Your AI Voice Assistant is Ready!",
            "html": html_body,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    RESEND_API_URL,
                    json=payload,
                    headers=self._headers(),
                )
                response.raise_for_status()
                logger.info("Welcome email sent to %s for store %s", to_email, store_id)
                return {"sent": True}
        except Exception as exc:
            logger.error(
                "Failed to send welcome email to %s for store %s: %s",
                to_email,
                store_id,
                exc,
            )
            return {"sent": False}

    async def send_usage_alert(
        self,
        to_email: str,
        store_domain: str,
        minutes_used: int,
        minutes_limit: int,
    ) -> dict[str, Any]:
        """Send a usage alert when a store approaches its minute limit.

        Subject includes the usage percentage.
        HTML body includes usage stats and an upgrade CTA.

        Returns {"sent": True} on success, {"sent": False} on any failure.
        Never raises — errors are logged and swallowed.
        """
        percent = int((minutes_used / minutes_limit) * 100) if minutes_limit > 0 else 0
        dashboard_url = f"{settings.FRONTEND_URL}/dashboard"

        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px;">
    <h1 style="color: #e53e3e;">Usage Alert for {store_domain}</h1>
    <p>You have used <strong>{minutes_used} of {minutes_limit} minutes</strong> ({percent}%) this billing period.</p>

    <div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 16px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; color: #c53030;">
        You are approaching your voice assistant minute limit. Upgrade your plan to ensure uninterrupted service.
      </p>
    </div>

    <p style="margin-top: 24px;">
      <a href="{dashboard_url}" style="background: #256af4; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        Upgrade Plan
      </a>
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #888; font-size: 12px;">SimplifyOps — AI Voice Shopping Assistant</p>
  </div>
</body>
</html>
"""

        payload = {
            "from": self.from_email,
            "to": [to_email],
            "subject": f"Usage Alert: {percent}% of minutes used",
            "html": html_body,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    RESEND_API_URL,
                    json=payload,
                    headers=self._headers(),
                )
                response.raise_for_status()
                logger.info(
                    "Usage alert sent to %s for %s (%d/%d min)",
                    to_email,
                    store_domain,
                    minutes_used,
                    minutes_limit,
                )
                return {"sent": True}
        except Exception as exc:
            logger.error(
                "Failed to send usage alert to %s for %s: %s",
                to_email,
                store_domain,
                exc,
            )
            return {"sent": False}


# Singleton
email_service = EmailService()
