"""
SimplifyOps — FastAPI Backend
Intelligent voice-powered sales agent for Shopify stores
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request  # type: ignore[import-not-found]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-not-found]
from fastapi.responses import JSONResponse  # type: ignore[import-not-found]
import httpx  # type: ignore[import-not-found]
import json
import uuid
from datetime import datetime
from typing import Any

from backend.models import (  # type: ignore[import]
    ElevenLabsPostCallPayload,
    ShopifyProductWebhook,
    ShopifyGDPRPayload,
    RecommendationRequest,
    ConversationRecord,
    DashboardStats,
    CallDataPoint,
    IntentDataPoint,
    ConversationSummary,
    StoreSettings,
)
from backend.config import settings  # type: ignore[import]
from backend.database import db  # type: ignore[import]
from backend.shopify_service import shopify_service  # type: ignore[import]
from backend.recommendation_engine import recommender  # type: ignore[import]
from backend.security_middleware import (  # type: ignore[import]
    rate_limit_middleware,
    sanitize_input,
    SecurityLogger,
)
from backend.stripe_service import (  # type: ignore[import]
    create_checkout_session,
    create_portal_session,
    handle_webhook_event,
)
from backend.auth_middleware import (  # type: ignore[import]
    get_authenticated_user,
    verify_store_ownership,
    require_store_owner,
)
try:
    import stripe  # type: ignore[import-not-found]
except ImportError:
    stripe = None  # type: ignore[assignment]


# ===========================
# App Lifecycle
# ===========================

@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    """Startup and shutdown events"""
    # Startup
    await db.connect()

    print("=" * 60)
    print("   SimplifyOps API v1.0")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Debug Mode: {settings.DEBUG}")
    print(f"   Database: {'[OK]' if db.pool else '[MISSING]'}")
    print(f"   OpenAI Key: {'[OK]' if settings.OPENAI_API_KEY else '[MISSING]'}")
    print(f"   ElevenLabs Key: {'[OK]' if settings.ELEVENLABS_API_KEY else '[MISSING]'}")
    print(f"   Shopify API Key: {'[OK]' if settings.SHOPIFY_API_KEY else '[MISSING]'}")
    print(f"   Encryption Key: {'[OK]' if settings.ENCRYPTION_KEY else '[MISSING]'}")
    print("=" * 60)

    yield

    # Shutdown
    await db.disconnect()


# Initialize FastAPI
app = FastAPI(
    title="SimplifyOps API",
    description="Intelligent voice-powered sales agent for Shopify stores",
    version="1.0.1",
    lifespan=lifespan,
)

# Security middleware
app.middleware("http")(rate_limit_middleware)

# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Webhook-Secret", "X-Shopify-Hmac-SHA256"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)


# ===========================
# Health Check
# ===========================

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "SimplifyOps",
        "status": "running",
        "version": "1.0.1",
        "database": "connected" if db.pool else "disconnected",
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for Railway monitoring.
    Returns 200 if service is healthy, 503 if unhealthy.
    """
    is_healthy = db.pool is not None

    health_status = {
        "status": "healthy" if is_healthy else "unhealthy",
        "service": "SimplifyOps API",
        "version": "1.0.1",
        "checks": {
            "database": "connected" if db.pool else "disconnected",
            "environment": settings.ENVIRONMENT,
        }
    }

    if not is_healthy:
        return JSONResponse(content=health_status, status_code=503)

    return health_status


# ===========================
# Shopify OAuth
# ===========================

@app.get("/shopify/auth")
async def shopify_auth(shop: str, user_id: str = ""):
    """Initiate Shopify OAuth install flow"""
    if not shop or not shop.endswith(".myshopify.com"):
        raise HTTPException(400, "Invalid shop domain")

    install_url = shopify_service.get_install_url(shop, user_id=user_id)
    return {"install_url": install_url}


@app.get("/shopify/callback")
async def shopify_callback(
    shop: str,
    code: str,
    hmac: str = "",
    state: str = "",
):
    """Handle Shopify OAuth callback — exchange code for access token"""
    try:
        # Exchange code for access token
        access_token = await shopify_service.exchange_token(shop, code)
        if not access_token:
            raise HTTPException(400, "Failed to get access token")

        # Extract user_id from state param (format: "nonce:user_id")
        owner_id = None
        if state and ":" in state:
            owner_id = state.split(":", 1)[1]

        # Save store to database
        store_id = await shopify_service.register_store(shop, access_token, owner_id=owner_id)

        # Trigger initial product sync in background
        SecurityLogger.log(f"Shopify OAuth complete for {shop}, store_id={store_id}", "INFO")

        return {
            "success": True,
            "store_id": store_id,
            "shop": shop,
            "message": "App installed successfully! Product sync will start shortly.",
        }
    except Exception as e:
        SecurityLogger.log_error("Shopify OAuth callback error", e)
        raise HTTPException(500, "OAuth callback failed")


# ===========================
# Product Sync & Webhooks
# ===========================

@app.post("/shopify/webhooks/products/{action}")
async def shopify_product_webhook(
    action: str,
    request: Request,
    background_tasks: BackgroundTasks,
):
    """Handle Shopify product webhooks (create/update/delete)"""
    body = await request.body()

    # Verify HMAC signature
    hmac_header = request.headers.get("X-Shopify-Hmac-SHA256", "")
    if not settings.SHOPIFY_API_SECRET:
        if settings.is_production:
            raise HTTPException(401, "HMAC verification not configured")
    elif not shopify_service.verify_hmac(body, hmac_header):
        raise HTTPException(401, "Invalid HMAC signature")

    # Parse product data
    product_data = json.loads(body)
    shop_domain = request.headers.get("X-Shopify-Shop-Domain", "")

    # Find store_id from shop domain
    store_row = await db.fetchrow(
        "SELECT id FROM stores WHERE shop_domain = $1", shop_domain
    )
    if not store_row:
        SecurityLogger.log(f"Webhook for unknown shop: {shop_domain}", "WARNING")
        return {"received": True}

    store_id = str(store_row["id"])

    # Handle webhook in background
    background_tasks.add_task(
        shopify_service.handle_product_webhook, store_id, action, product_data
    )

    return {"received": True}


@app.post("/api/stores/{store_id}/sync")
async def trigger_product_sync(store_id: str, background_tasks: BackgroundTasks, request: Request):
    """Manually trigger a full product sync for a store"""
    await require_store_owner(request, store_id)
    async def _sync():
        count = await shopify_service.sync_all_products(store_id)
        SecurityLogger.log(f"Product sync complete: {count} products for store {store_id}", "INFO")

    background_tasks.add_task(_sync)
    return {"message": "Product sync started", "store_id": store_id}


# ===========================
# Recommendations API
# ===========================

@app.get("/api/recommendations")
async def get_recommendations(
    product_id: int,
    store_id: str,
    limit: int = 5,
):
    """Get product recommendations for a given product"""
    try:
        recs = await recommender.get_recommendations(store_id, product_id, limit)
        return {"recommendations": recs, "count": len(recs)}
    except Exception as e:
        SecurityLogger.log_error("Recommendation error", e)
        return {"recommendations": [], "count": 0}


@app.get("/api/products/search")
async def search_products(store_id: str, query: str, limit: int = 5):
    """Search products by text query"""
    results = await recommender.search_products(store_id, query, limit)
    return {"products": results, "count": len(results)}


# ===========================
# Voice Conversation Webhooks
# ===========================

async def analyze_shopping_conversation(transcript: str) -> dict[str, Any]:
    """
    Analyze voice shopping conversation with OpenAI.
    Returns intent, sentiment, and products mentioned.
    """
    transcript = sanitize_input(transcript, max_length=5000)

    if not transcript:
        return {
            "sentiment": "Neutral",
            "intent": "Browsing",
            "products_mentioned": [],
            "purchase_intent": 0.5,
        }

    if not settings.OPENAI_API_KEY:
        if settings.is_production:
            raise HTTPException(500, "OpenAI API key not configured")
        return {
            "sentiment": "Neutral",
            "intent": "Browsing",
            "products_mentioned": [],
            "purchase_intent": 0.5,
        }

    system_prompt = """You are an AI shopping conversation analyst. Analyze this voice shopping transcript.
Return a JSON object with:
- "sentiment": one of "Very Positive", "Positive", "Neutral", "Negative"
- "intent": one of "Buying", "Comparing", "Browsing", "Support", "Returns"
- "products_mentioned": list of product names/types mentioned
- "purchase_intent": float 0.0-1.0 (1.0 = very likely to buy)

Respond with ONLY the JSON object."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Transcript:\n{transcript}"},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 200,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()

            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            return json.loads(content)
    except Exception as e:
        SecurityLogger.log_error("OpenAI shopping analysis failed", e)

    return {
        "sentiment": "Neutral",
        "intent": "Browsing",
        "products_mentioned": [],
        "purchase_intent": 0.5,
    }


@app.post("/webhook/elevenlabs/post-call")
async def post_call_webhook(
    payload: ElevenLabsPostCallPayload,
    background_tasks: BackgroundTasks,
):
    """
    Post-call webhook from ElevenLabs Conversational AI.
    Records conversation and runs AI analysis.
    """
    try:
        call_id = payload.call_id or str(uuid.uuid4())
        transcript = sanitize_input(payload.transcript or "", max_length=10000)

        # AI analysis of the shopping conversation
        analysis = await analyze_shopping_conversation(transcript)

        store_id = payload.store_id or ""

        # Save to database if connected
        if db.pool and store_id:
            conv_id = str(uuid.uuid4())
            has_cart = bool(payload.cart_actions)
            has_products = bool(payload.products_discussed)
            await db.execute(
                """
                INSERT INTO conversations (id, store_id, session_id, transcript,
                    intent, sentiment, products_discussed, products_recommended,
                    cart_actions, duration_seconds, started_at)
                VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                conv_id, store_id, call_id, transcript,
                analysis.get("intent", "Browsing"),
                analysis.get("sentiment", "Neutral"),
                json.dumps(payload.products_discussed or []),
                json.dumps([]),
                json.dumps(payload.cart_actions or []),
                payload.duration or 0,
                datetime.utcnow(),
            )

            # Upsert daily_analytics
            try:
                await db.execute(
                    """
                    INSERT INTO daily_analytics (store_id, date, total_conversations, products_recommended, add_to_cart_count)
                    VALUES ($1::uuid, CURRENT_DATE, 1, $2, $3)
                    ON CONFLICT (store_id, date) DO UPDATE SET
                        total_conversations = daily_analytics.total_conversations + 1,
                        products_recommended = daily_analytics.products_recommended + $2,
                        add_to_cart_count = daily_analytics.add_to_cart_count + $3
                    """,
                    store_id,
                    1 if has_products else 0,
                    1 if has_cart else 0,
                )
            except Exception as e:
                SecurityLogger.log(f"daily_analytics upsert error: {e}", "WARNING")

        SecurityLogger.log(
            f"Shopping call recorded: {call_id} | Intent: {analysis.get('intent')} | "
            f"Purchase intent: {analysis.get('purchase_intent', 0)}",
            "INFO"
        )

        return {
            "success": True,
            "call_id": call_id,
            "analysis": analysis,
        }

    except Exception as e:
        SecurityLogger.log_error("Post-call webhook error", e)
        raise HTTPException(status_code=500, detail="Internal server error")


# ===========================
# Store Settings
# ===========================

@app.get("/api/stores/{store_id}/settings")
async def get_store_settings(store_id: str, request: Request):
    """Get widget settings for a store"""
    await require_store_owner(request, store_id)
    row = await db.fetchrow(
        "SELECT settings FROM stores WHERE id = $1::uuid", store_id
    )
    if not row:
        raise HTTPException(404, "Store not found")

    return StoreSettings(**row["settings"]) if row["settings"] else StoreSettings()


@app.put("/api/stores/{store_id}/settings")
async def update_store_settings(store_id: str, settings_data: StoreSettings, request: Request):
    """Update widget settings for a store"""
    await require_store_owner(request, store_id)
    await db.execute(
        "UPDATE stores SET settings = $1, updated_at = $2 WHERE id = $3::uuid",
        json.dumps(settings_data.model_dump()),
        datetime.utcnow(),
        store_id,
    )
    return {"message": "Settings updated", "settings": settings_data}


# ===========================
# Dashboard API
# ===========================

def _time_ago(dt: datetime) -> str:
    """Format datetime as 'X mins ago', etc."""
    delta = datetime.utcnow() - dt
    seconds = delta.total_seconds()
    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        mins = int(seconds / 60)
        return f"{mins} min{'s' if mins != 1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    else:
        days = int(seconds / 86400)
        return f"{days} day{'s' if days != 1 else ''} ago"


def _format_duration(seconds: int) -> str:
    """Format seconds as 'MM:SS'"""
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


@app.get("/api/dashboard/{store_id}/stats", response_model=DashboardStats)
async def get_dashboard_stats(store_id: str, request: Request):
    """Get dashboard statistics for a store"""
    await require_store_owner(request, store_id)
    if not db.pool:
        return DashboardStats()

    # Total conversations
    total = await db.fetchval(
        "SELECT COUNT(*) FROM conversations WHERE store_id = $1::uuid", store_id
    ) or 0

    if total == 0:
        return DashboardStats()

    # Products recommended
    total_recommended = await db.fetchval(
        """SELECT COUNT(*) FROM conversations
           WHERE store_id = $1::uuid AND products_recommended != '[]'::jsonb""",
        store_id,
    ) or 0

    # Add to cart rate
    cart_count = await db.fetchval(
        """SELECT COUNT(*) FROM conversations
           WHERE store_id = $1::uuid AND cart_actions != '[]'::jsonb""",
        store_id,
    ) or 0
    add_to_cart_rate = (cart_count / total * 100) if total > 0 else 0

    # Intent distribution
    intent_rows = await db.fetch(
        """SELECT intent, COUNT(*) as cnt FROM conversations
           WHERE store_id = $1::uuid GROUP BY intent ORDER BY cnt DESC""",
        store_id,
    )
    intent_data = [
        IntentDataPoint(name=str(r["intent"]), value=int(r["cnt"]))
        for r in intent_rows
    ]

    # Recent conversations
    recent_rows = await db.fetch(
        """SELECT session_id, sentiment, duration_seconds, started_at,
                  products_discussed, cart_actions
           FROM conversations WHERE store_id = $1::uuid
           ORDER BY started_at DESC LIMIT 10""",
        store_id,
    )
    recent = [
        ConversationSummary(
            session_id=str(r["session_id"] or ""),
            time_ago=_time_ago(r["started_at"]),
            duration=_format_duration(r["duration_seconds"]),
            sentiment=str(r["sentiment"]),
            products_count=len(json.loads(r["products_discussed"] or "[]")),
            cart_actions_count=len(json.loads(r["cart_actions"] or "[]")),
        )
        for r in recent_rows
    ]

    return DashboardStats(
        total_conversations=int(total),
        total_products_recommended=int(total_recommended),
        add_to_cart_rate=round(float(add_to_cart_rate), 1),
        conversion_rate=round(float(add_to_cart_rate), 1),
        intent_data=intent_data,
        recent_conversations=recent,
    )


# ===========================
# Voice Config (for widget)
# ===========================

@app.get("/api/voice/config")
async def get_voice_config(store_id: str = ""):
    """
    Return ElevenLabs Agent ID for the widget.
    Widget calls this on init so the agent_id is never hardcoded in the JS.
    """
    return {
        "agent_id": settings.ELEVENLABS_AGENT_ID or "",
        "has_agent": bool(settings.ELEVENLABS_AGENT_ID),
    }


# ===========================
# Global Dashboard Stats (for Next.js frontend - no store_id required)
# ===========================

@app.get("/api/dashboard/stats")
async def get_dashboard_stats_global():
    """
    Aggregated stats across all stores.
    Used by the Next.js SimplifyOps frontend dashboard.
    """
    if not db.pool:
        return {
            "total_calls": 0,
            "avg_lead_score": 0,
            "conversion_rate": 0,
            "call_data": [
                {"name": d, "calls": 0}
                for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            ],
            "intent_data": [],
            "recent_conversations": [],
        }
    try:
        total = await db.fetchval("SELECT COUNT(*) FROM conversations") or 0

        # Calculate real avg lead score from purchase_intent sentiment
        avg_score_raw = await db.fetchval(
            """SELECT AVG(
                CASE sentiment
                    WHEN 'Very Positive' THEN 9.0
                    WHEN 'Positive' THEN 7.0
                    WHEN 'Neutral' THEN 5.0
                    WHEN 'Negative' THEN 3.0
                    ELSE 5.0
                END
            ) FROM conversations"""
        ) or 0

        # Calculate real conversion rate from cart_actions
        cart_count = await db.fetchval(
            "SELECT COUNT(*) FROM conversations WHERE cart_actions != '[]'::jsonb"
        ) or 0
        if total > 0:
            conversion_rate_raw: float = (float(cart_count) / float(total)) * 100.0
            conversion_rate = round(conversion_rate_raw, 1)
        else:
            conversion_rate = 0.0

        recent_rows = await db.fetch(
            "SELECT session_id, started_at, duration_seconds, sentiment FROM conversations ORDER BY started_at DESC LIMIT 5"
        ) or []
        # Intent breakdown
        intent_rows = await db.fetch(
            """SELECT intent, COUNT(*) as cnt FROM conversations
               GROUP BY intent ORDER BY cnt DESC LIMIT 5"""
        ) or []
        total_intents = sum(int(r["cnt"]) for r in intent_rows) or 1
        intent_data = [
            {"name": r["intent"] or "General", "value": round(int(r["cnt"]) * 100 / total_intents)}
            for r in intent_rows
        ]
        # Call volume by day of week
        day_rows = await db.fetch(
            """SELECT TO_CHAR(started_at, 'Dy') as day, COUNT(*) as cnt
               FROM conversations
               WHERE started_at > NOW() - INTERVAL '7 days'
               GROUP BY day"""
        ) or []
        day_map = {r["day"]: int(r["cnt"]) for r in day_rows}
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        call_data = [{"name": d, "calls": day_map.get(d, 0)} for d in days]
        recent_conversations = []
        for r in recent_rows:
            started = r["started_at"]
            secs = int(r["duration_seconds"] or 0)
            recent_conversations.append({
                "caller_id": str(r["session_id"])[:8] + "...",
                "time_ago": started.strftime("%H:%M") if started else "--",
                "duration": f"{secs // 60}:{secs % 60:02d}",
                "sentiment": r["sentiment"] or "Neutral",
                "status": "Qualified",
            })
        return {
            "total_calls": int(total),
            "avg_lead_score": round(float(avg_score_raw), 1),
            "conversion_rate": conversion_rate,
            "call_data": call_data,
            "intent_data": intent_data,
            "recent_conversations": recent_conversations,
        }
    except Exception as e:
        SecurityLogger.log(f"Dashboard stats error: {e}", "ERROR")
        return {
            "total_calls": 0, "avg_lead_score": 0, "conversion_rate": 0,
            "call_data": [{"name": d, "calls": 0} for d in ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]],
            "intent_data": [], "recent_conversations": [],
        }


# ===========================
# Conversations & Reports
# ===========================

@app.get("/api/conversations")
async def get_conversations(request: Request, store_id: str = "", offset: int = 0, limit: int = 50):
    """
    Get conversations for a specific store with pagination.
    """
    if not store_id:
        raise HTTPException(400, "store_id query parameter is required")

    await require_store_owner(request, store_id)

    # Clamp limit to reasonable bounds
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    if not db.pool:
        return {"conversations": [], "total": 0, "offset": offset, "limit": limit}

    try:
        # Get total count for pagination
        total = await db.fetchval(
            "SELECT COUNT(*) FROM conversations WHERE store_id = $1::uuid",
            store_id,
        ) or 0

        rows = await db.fetch(
            """SELECT id, session_id, transcript, intent, sentiment,
                      products_discussed, cart_actions, started_at, customer_id
               FROM conversations
               WHERE store_id = $1::uuid
               ORDER BY started_at DESC
               LIMIT $2 OFFSET $3""",
            store_id, limit, offset,
        )

        conversations = []
        for r in rows:
            conversations.append({
                "id": str(r["id"]),
                "session_id": str(r["session_id"]),
                "transcript": r["transcript"] or "",
                "intent": r["intent"] or "Unknown",
                "sentiment": r["sentiment"] or "Neutral",
                "products_discussed": r["products_discussed"] if r["products_discussed"] else [],
                "cart_actions": len(r["cart_actions"]) if r["cart_actions"] else 0,
                "started_at": r["started_at"].isoformat() if r["started_at"] else "",
                "customer_id": r["customer_id"],
            })

        return {"conversations": conversations, "total": int(total), "offset": offset, "limit": limit}
    except Exception as e:
        SecurityLogger.log(f"Conversations fetch error: {e}", "ERROR")
        return {"conversations": [], "total": 0, "offset": offset, "limit": limit}


@app.get("/api/reports/sentiment")
async def get_sentiment_report():
    """
    Get sentiment distribution for Reports page.
    """
    if not db.pool:
        return {"sentiment_distribution": []}

    try:
        rows = await db.fetch(
            """SELECT sentiment, COUNT(*) as count
               FROM conversations
               WHERE sentiment IS NOT NULL
               GROUP BY sentiment
               ORDER BY count DESC"""
        )

        sentiment_distribution = [
            {"sentiment": r["sentiment"], "count": int(r["count"])}
            for r in rows
        ]

        return {"sentiment_distribution": sentiment_distribution}
    except Exception as e:
        SecurityLogger.log(f"Sentiment report error: {e}", "ERROR")
        return {"sentiment_distribution": []}


@app.get("/api/dashboard-stats")
async def get_dashboard_stats_simple():
    """
    Simplified dashboard stats endpoint for frontend.
    Returns aggregated metrics matching DashboardStats interface.
    """
    if not db.pool:
        return {
            "total_conversations": 0,
            "avg_lead_score": 0.0,
            "conversion_rate": 0.0,
            "top_intents": [],
        }

    try:
        total = await db.fetchval("SELECT COUNT(*) FROM conversations") or 0

        # Calculate real avg lead score from sentiment
        avg_score_raw = await db.fetchval(
            """SELECT AVG(
                CASE sentiment
                    WHEN 'Very Positive' THEN 9.0
                    WHEN 'Positive' THEN 7.0
                    WHEN 'Neutral' THEN 5.0
                    WHEN 'Negative' THEN 3.0
                    ELSE 5.0
                END
            ) FROM conversations"""
        ) or 0

        # Calculate real conversion rate from cart_actions
        cart_count = await db.fetchval(
            "SELECT COUNT(*) FROM conversations WHERE cart_actions != '[]'::jsonb"
        ) or 0
        conversion_rate = round(float(cart_count / total * 100), 1) if total > 0 else 0.0

        # Top intents
        intent_rows = await db.fetch(
            """SELECT intent, COUNT(*) as count
               FROM conversations
               WHERE intent IS NOT NULL
               GROUP BY intent
               ORDER BY count DESC
               LIMIT 5"""
        )

        top_intents = [
            {"intent": r["intent"], "count": int(r["count"])}
            for r in intent_rows
        ]

        return {
            "total_conversations": int(total),
            "avg_lead_score": round(float(avg_score_raw), 1),
            "conversion_rate": conversion_rate,
            "top_intents": top_intents,
        }
    except Exception as e:
        SecurityLogger.log(f"Dashboard stats error: {e}", "ERROR")
        return {
            "total_conversations": 0,
            "avg_lead_score": 0.0,
            "conversion_rate": 0.0,
            "top_intents": [],
        }


# ===========================
# Widget Installation (non-Shopify embed)
# ===========================

@app.post("/api/install")
async def install_widget(request: Request):
    """
    Register any website for widget installation.
    Returns ready-to-paste embed code with a unique store_id.
    """
    body = await request.body()
    data = json.loads(body) if body else {}
    site_url = sanitize_input(str(data.get("site_url", "")).strip().rstrip("/"))
    contact_email = sanitize_input(str(data.get("contact_email", "")).strip())

    if not site_url:
        raise HTTPException(400, "site_url is required")

    # Generate deterministic store_id from site URL
    import hashlib
    store_id = "site_" + hashlib.md5(site_url.encode()).hexdigest()[:12]
    api_url = str(settings.SHOPIFY_APP_URL or "https://ai-voice-shopping-assistant-production.up.railway.app")
    # Normalise to Railway URL if still localhost
    if "localhost" in api_url:
        api_url = "https://ai-voice-shopping-assistant-production.up.railway.app"

    # Save to DB if available
    if db.pool:
        try:
            await db.execute(
                """INSERT INTO stores (id, shop_domain, subscription_tier, created_at)
                   VALUES ($1, $2, 'trial', NOW())
                   ON CONFLICT (id) DO NOTHING""",
                store_id, site_url,
            )
        except Exception:
            pass  # Table may not exist yet — non-blocking

    embed_code = (
        f'<script\n'
        f'  src="{api_url}/widget-embed.js"\n'
        f'  data-store-id="{store_id}"\n'
        f'  data-api-url="{api_url}"\n'
        f'  data-color="#6366f1"\n'
        f'  data-position="bottom-right"\n'
        f'></script>'
    )
    return {
        "store_id": store_id,
        "site_url": site_url,
        "embed_code": embed_code,
        "widget_url": f"{api_url}/widget-embed.js",
        "preview_url": f"{api_url}/widget-preview",
    }


@app.get("/api/install/{store_id}")
async def get_install_info(store_id: str):
    """Return embed code for an existing installation."""
    api_url = "https://ai-voice-shopping-assistant-production.up.railway.app"
    embed_code = (
        f'<script\n'
        f'  src="{api_url}/widget-embed.js"\n'
        f'  data-store-id="{store_id}"\n'
        f'  data-api-url="{api_url}"\n'
        f'  data-color="#6366f1"\n'
        f'  data-position="bottom-right"\n'
        f'></script>'
    )
    return {"store_id": store_id, "embed_code": embed_code}


# ===========================
# Stripe Payments
# ===========================

@app.post("/api/stripe/checkout")
async def stripe_checkout(request: Request):
    """Create a Stripe Checkout session for subscription"""
    body = await request.body()
    data = json.loads(body) if body else {}
    store_id = data.get("store_id", "")
    plan = data.get("plan", "starter")

    if not store_id:
        raise HTTPException(400, "store_id is required")
    if plan not in ("starter", "growth", "scale"):
        raise HTTPException(400, "Invalid plan. Must be 'starter', 'growth', or 'scale'")

    await require_store_owner(request, store_id)

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    checkout_url = await create_checkout_session(
        store_id=store_id,
        plan=plan,
        success_url=f"{frontend_url}/dashboard?payment=success",
        cancel_url=f"{frontend_url}/pricing?payment=cancelled",
    )

    if not checkout_url:
        raise HTTPException(500, "Failed to create checkout session. Stripe may not be configured.")

    return {"checkout_url": checkout_url}


@app.post("/api/stripe/portal")
async def stripe_portal(request: Request):
    """Create a Stripe Customer Portal session"""
    body = await request.body()
    data = json.loads(body) if body else {}
    store_id = data.get("store_id", "")

    if not store_id:
        raise HTTPException(400, "store_id is required")

    await require_store_owner(request, store_id)

    frontend_url = settings.FRONTEND_URL.rstrip("/")
    portal_url = await create_portal_session(
        store_id=store_id,
        return_url=f"{frontend_url}/dashboard",
    )

    if not portal_url:
        raise HTTPException(500, "Failed to create portal session")

    return {"portal_url": portal_url}


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        success = await handle_webhook_event(payload, sig_header)
        if not success:
            raise HTTPException(400, "Webhook signature verification failed")
    except HTTPException:
        raise
    except Exception as e:
        SecurityLogger.log(f"Stripe webhook processing error: {e}", "ERROR")
        raise HTTPException(500, "Webhook processing failed — will retry")

    return {"received": True}


@app.get("/api/stripe/config")
async def stripe_config():
    """Return Stripe publishable key for frontend"""
    return {
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY or "",
        "has_stripe": bool(settings.STRIPE_SECRET_KEY),
    }


# ===========================
# User-Store Architecture
# ===========================

@app.get("/api/me")
async def get_current_user(request: Request):
    """
    Given an authenticated user, returns their store(s).
    Validates session cookie via Neon Auth.
    """
    user_id = await get_authenticated_user(request)

    if not db.pool:
        return {"user_id": user_id, "stores": [], "has_store": False}

    try:
        stores = await db.fetch(
            "SELECT id, shop_domain, subscription_tier, settings, created_at FROM stores WHERE owner_id = $1::uuid",
            user_id,
        )
        store_list = [
            {
                "id": str(s["id"]),
                "shop_domain": s["shop_domain"],
                "subscription_tier": s["subscription_tier"],
                "created_at": s["created_at"].isoformat() if s["created_at"] else None,
            }
            for s in stores
        ]
        return {"user_id": user_id, "stores": store_list, "has_store": len(store_list) > 0}
    except Exception as e:
        SecurityLogger.log_error("Get user stores error", e)
        return {"user_id": user_id, "stores": [], "has_store": False}


@app.post("/api/stores/create")
async def create_store(request: Request):
    """
    Create a store for non-Shopify users (manual website entry).
    """
    user_id = await get_authenticated_user(request)

    body = await request.body()
    data = json.loads(body) if body else {}
    site_url = sanitize_input(str(data.get("site_url", "")).strip().rstrip("/"))

    if not site_url:
        raise HTTPException(400, "site_url is required")

    store_id = str(uuid.uuid4())

    if db.pool:
        try:
            await db.execute(
                """INSERT INTO stores (id, shop_domain, owner_id, subscription_tier, settings, created_at)
                   VALUES ($1, $2, $3::uuid, 'trial', '{}', NOW())
                   ON CONFLICT (shop_domain) DO UPDATE SET owner_id = $3::uuid
                   RETURNING id""",
                store_id, site_url, user_id,
            )
        except Exception as e:
            SecurityLogger.log_error("Create store error", e)
            raise HTTPException(500, "Failed to create store")

    return {"store_id": store_id, "site_url": site_url, "subscription_tier": "trial"}


# ===========================
# Subscription & Reports Endpoints
# ===========================

@app.get("/api/stores/{store_id}/subscription")
async def get_store_subscription(store_id: str, request: Request):
    """Get real subscription info from Stripe for a store."""
    await require_store_owner(request, store_id)
    if not db.pool:
        return {"tier": "trial", "status": "active", "sessions_used": 0, "sessions_limit": 30}

    try:
        row = await db.fetchrow(
            """SELECT subscription_tier, stripe_customer_id, stripe_subscription_id
               FROM stores WHERE id = $1::uuid""",
            store_id,
        )
        if not row:
            raise HTTPException(404, "Store not found")

        tier = row["subscription_tier"] or "trial"
        result: dict[str, Any] = {
            "tier": tier,
            "status": "active",
            "sessions_used": 0,
            "sessions_limit": {"trial": 30, "starter": 100, "growth": 300, "scale": 1000}.get(tier, 30),
            "current_period_end": None,
            "payment_method_last4": None,
        }

        # Count sessions used this billing period
        sessions_used = await db.fetchval(
            """SELECT COUNT(*) FROM conversations
               WHERE store_id = $1::uuid
               AND started_at >= date_trunc('month', NOW())""",
            store_id,
        )
        result["sessions_used"] = int(sessions_used or 0)

        # Get Stripe details if available
        if row["stripe_subscription_id"] and settings.STRIPE_SECRET_KEY:
            try:
                sub = stripe.Subscription.retrieve(row["stripe_subscription_id"])
                result["status"] = sub.status
                result["current_period_end"] = datetime.fromtimestamp(sub.current_period_end).isoformat()

                # Get payment method
                if row["stripe_customer_id"]:
                    payment_methods = stripe.PaymentMethod.list(
                        customer=row["stripe_customer_id"],
                        type="card",
                        limit=1,
                    )
                    if payment_methods.data:
                        result["payment_method_last4"] = payment_methods.data[0].card.last4
            except Exception as e:
                SecurityLogger.log(f"Stripe fetch error: {e}", "WARNING")

        return result
    except HTTPException:
        raise
    except Exception as e:
        SecurityLogger.log_error("Subscription fetch error", e)
        return {"tier": "trial", "status": "active", "sessions_used": 0, "sessions_limit": 30}


@app.get("/api/stores/{store_id}/reports/insights")
async def get_store_reports(store_id: str, request: Request):
    """Get computed report insights for a store."""
    await require_store_owner(request, store_id)
    if not db.pool:
        return {"avg_duration": 0, "avg_products": 0, "cart_abandonment_rate": 0, "unique_users": 0}

    try:
        # Average duration
        avg_dur = await db.fetchval(
            "SELECT AVG(duration_seconds) FROM conversations WHERE store_id = $1::uuid",
            store_id,
        )
        avg_duration_mins = round(float(avg_dur or 0) / 60, 1)

        # Average products per conversation
        avg_products_raw = await db.fetchval(
            """SELECT AVG(jsonb_array_length(products_discussed))
               FROM conversations WHERE store_id = $1::uuid
               AND products_discussed != '[]'::jsonb""",
            store_id,
        )
        avg_products = round(float(avg_products_raw or 0), 1)

        # Cart abandonment rate (conversations with products discussed but no cart actions)
        total_with_products = await db.fetchval(
            """SELECT COUNT(*) FROM conversations
               WHERE store_id = $1::uuid AND products_discussed != '[]'::jsonb""",
            store_id,
        ) or 0
        total_with_cart = await db.fetchval(
            """SELECT COUNT(*) FROM conversations
               WHERE store_id = $1::uuid AND cart_actions != '[]'::jsonb""",
            store_id,
        ) or 0
        if total_with_products > 0:
            cart_abandonment = round((1 - float(total_with_cart) / float(total_with_products)) * 100, 1)
        else:
            cart_abandonment = 0.0

        # Unique users
        unique_users = await db.fetchval(
            "SELECT COUNT(DISTINCT session_id) FROM conversations WHERE store_id = $1::uuid",
            store_id,
        ) or 0

        return {
            "avg_duration": avg_duration_mins,
            "avg_products": avg_products,
            "cart_abandonment_rate": cart_abandonment,
            "unique_users": int(unique_users),
        }
    except Exception as e:
        SecurityLogger.log_error("Reports insights error", e)
        return {"avg_duration": 0, "avg_products": 0, "cart_abandonment_rate": 0, "unique_users": 0}


# ===========================
# GDPR Mandatory Endpoints
# ===========================

@app.post("/shopify/gdpr")
async def gdpr_unified(request: Request):
    """
    Unified GDPR compliance webhook.
    Handles topics: customers/data_request, customers/redact, shop/redact
    Topic is sent via X-Shopify-Topic header.
    """
    body = await request.body()

    # Verify HMAC signature (mandatory for GDPR webhooks)
    hmac_header = request.headers.get("X-Shopify-Hmac-SHA256", "")
    if not settings.SHOPIFY_API_SECRET:
        if settings.is_production:
            raise HTTPException(401, "HMAC verification not configured")
    elif not shopify_service.verify_hmac(body, hmac_header):
        raise HTTPException(401, "Invalid HMAC signature")

    topic = request.headers.get("X-Shopify-Topic", "")
    data = json.loads(body) if body else {}
    shop_domain = data.get("shop_domain", "")

    if topic == "customers/data_request":
        SecurityLogger.log(f"GDPR data request for shop: {shop_domain}", "INFO")
        # Return customer data for GDPR compliance
        if db.pool:
            customer = data.get("customer", {})
            customer_id = str(customer.get("id", ""))
            if customer_id:
                conversations = await db.fetch(
                    """SELECT id, session_id, transcript, intent, sentiment,
                              products_discussed, cart_actions, started_at
                       FROM conversations
                       WHERE store_id = (SELECT id FROM stores WHERE shop_domain = $1)
                       AND customer_id = $2
                       ORDER BY started_at DESC""",
                    shop_domain, customer_id,
                )
                customer_data = {
                    "customer_id": customer_id,
                    "shop_domain": shop_domain,
                    "conversations": [
                        {
                            "id": str(c["id"]),
                            "session_id": c["session_id"],
                            "transcript": c["transcript"],
                            "intent": c["intent"],
                            "sentiment": c["sentiment"],
                            "products_discussed": json.loads(c["products_discussed"] or "[]"),
                            "cart_actions": json.loads(c["cart_actions"] or "[]"),
                            "date": c["started_at"].isoformat() if c["started_at"] else None,
                        }
                        for c in conversations
                    ],
                }
                return {"customer_data": customer_data}
        return {"customer_data": {}}

    elif topic == "customers/redact":
        if db.pool:
            customer = data.get("customer", {})
            customer_id = str(customer.get("id", ""))
            if customer_id:
                await db.execute(
                    """DELETE FROM conversations
                       WHERE store_id = (SELECT id FROM stores WHERE shop_domain = $1)
                       AND customer_id = $2""",
                    shop_domain, customer_id,
                )
        SecurityLogger.log(f"GDPR customer redact for {shop_domain}", "INFO")

    elif topic == "shop/redact":
        if db.pool:
            await db.execute(
                "DELETE FROM stores WHERE shop_domain = $1", shop_domain
            )
        SecurityLogger.log(f"GDPR shop redact for {shop_domain}", "INFO")

    return {"received": True}




# ===========================
# Static Files & Widget Preview
# ===========================

from fastapi.staticfiles import StaticFiles  # type: ignore[import-not-found]
from fastapi.responses import FileResponse  # type: ignore[import-not-found]
import os

# Serve widget static files
_frontend_public = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
if os.path.isdir(_frontend_public):
    app.mount("/static", StaticFiles(directory=_frontend_public), name="static")


@app.get("/widget-preview")
async def widget_preview():
    """Serve widget preview page"""
    preview_path = os.path.join(_frontend_public, "widget-preview.html")
    if os.path.exists(preview_path):
        return FileResponse(preview_path, media_type="text/html")
    raise HTTPException(404, "Preview not found")


@app.get("/widget-embed.js")
async def widget_embed_js():
    """Serve widget embed script"""
    js_path = os.path.join(_frontend_public, "widget-embed.js")
    if os.path.exists(js_path):
        return FileResponse(js_path, media_type="application/javascript")
    raise HTTPException(404, "Widget script not found")


# ===========================
# Entry Point
# ===========================

if __name__ == "__main__":
    import uvicorn  # type: ignore[import-not-found]
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
