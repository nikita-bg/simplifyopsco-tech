"""
Stripe Payment Service — Subscription management for Vocalize AI
"""
import stripe  # type: ignore[import-not-found]
from typing import Optional

from backend.config import settings  # type: ignore[import]
from backend.database import db  # type: ignore[import]
from backend.security_middleware import SecurityLogger  # type: ignore[import]

# Configure Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

PLAN_MAP = {
    "starter": settings.STRIPE_STARTER_PRICE_ID,
    "pro": settings.STRIPE_PRO_PRICE_ID,
}


async def create_checkout_session(
    store_id: str,
    plan: str,
    success_url: str,
    cancel_url: str,
) -> Optional[str]:
    """Create a Stripe Checkout session for a subscription plan."""
    if not settings.STRIPE_SECRET_KEY:
        return None

    price_id = PLAN_MAP.get(plan)
    if not price_id:
        return None

    # Get or create Stripe customer
    customer_id = await _get_or_create_customer(store_id)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"store_id": store_id, "plan": plan},
    )

    return session.url


async def create_portal_session(store_id: str, return_url: str) -> Optional[str]:
    """Create a Stripe Customer Portal session for managing subscriptions."""
    if not settings.STRIPE_SECRET_KEY:
        return None

    customer_id = await _get_customer_id(store_id)
    if not customer_id:
        return None

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url


async def handle_webhook_event(payload: bytes, sig_header: str) -> bool:
    """Process Stripe webhook events."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        return False

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        SecurityLogger.log("Invalid Stripe webhook signature", "WARNING")
        return False

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        store_id = data.get("metadata", {}).get("store_id")
        plan = data.get("metadata", {}).get("plan", "starter")
        subscription_id = data.get("subscription")
        customer_id = data.get("customer")

        if store_id and db.pool:
            await db.execute(
                """UPDATE stores
                   SET subscription_tier = $1,
                       stripe_customer_id = $2,
                       stripe_subscription_id = $3,
                       updated_at = NOW()
                   WHERE id = $4::uuid""",
                plan, customer_id, subscription_id, store_id,
            )
            SecurityLogger.log(
                f"Subscription activated: store={store_id} plan={plan}", "INFO"
            )

    elif event_type == "customer.subscription.updated":
        subscription_id = data.get("id")
        status = data.get("status")
        if subscription_id and db.pool:
            if status in ("active", "trialing"):
                tier = data.get("metadata", {}).get("plan", "starter")
            else:
                tier = "trial"
            await db.execute(
                """UPDATE stores
                   SET subscription_tier = $1, updated_at = NOW()
                   WHERE stripe_subscription_id = $2""",
                tier, subscription_id,
            )

    elif event_type == "customer.subscription.deleted":
        subscription_id = data.get("id")
        if subscription_id and db.pool:
            await db.execute(
                """UPDATE stores
                   SET subscription_tier = 'trial',
                       stripe_subscription_id = NULL,
                       updated_at = NOW()
                   WHERE stripe_subscription_id = $1""",
                subscription_id,
            )
            SecurityLogger.log(
                f"Subscription cancelled: sub={subscription_id}", "INFO"
            )

    return True


async def _get_or_create_customer(store_id: str) -> str:
    """Get existing Stripe customer or create one."""
    existing = await _get_customer_id(store_id)
    if existing:
        return existing

    # Get store info
    row = await db.fetchrow(
        "SELECT shop_domain FROM stores WHERE id = $1::uuid", store_id
    ) if db.pool else None

    email = row["shop_domain"] if row else store_id
    customer = stripe.Customer.create(
        email=email if "@" in email else None,
        metadata={"store_id": store_id, "shop_domain": email},
    )

    if db.pool:
        await db.execute(
            "UPDATE stores SET stripe_customer_id = $1 WHERE id = $2::uuid",
            customer.id, store_id,
        )

    return customer.id


async def _get_customer_id(store_id: str) -> Optional[str]:
    """Get Stripe customer ID for a store."""
    if not db.pool:
        return None
    row = await db.fetchrow(
        "SELECT stripe_customer_id FROM stores WHERE id = $1::uuid", store_id
    )
    return row["stripe_customer_id"] if row and row["stripe_customer_id"] else None
