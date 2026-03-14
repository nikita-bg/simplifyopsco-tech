"""
SimplifyOps — FastAPI Backend
Intelligent voice-powered sales agent for Shopify stores
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Response  # type: ignore[import-not-found]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-not-found]
from fastapi.responses import JSONResponse  # type: ignore[import-not-found]
import httpx  # type: ignore[import-not-found]
import json
import uuid
from datetime import datetime, UTC
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
    AgentCreateRequest,
    AgentCreateResponse,
    AgentUpdateRequest,
    AgentInfo,
    AgentDeleteResponse,
    AgentTemplateInfo,
    ManualProductCreate,
    ManualProductUpdate,
    WidgetConfigResponse,
    AgentConfigResponse,
    AgentConfigUpdate,
    EmbedCodeResponse,
)
from backend.elevenlabs_service import elevenlabs_service  # type: ignore[import]
from backend.config import settings  # type: ignore[import]
from backend.database import db  # type: ignore[import]
from backend.shopify_service import shopify_service  # type: ignore[import]
from backend.kb_service import kb_service  # type: ignore[import]
from backend.agent_config_service import (  # type: ignore[import]
    get_curated_voices,
    get_personality_presets,
    get_supported_languages,
    generate_embed_code,
    CURATED_VOICES,
    PERSONALITY_PRESETS,
)
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
    TIER_LIMITS,
)
from backend.auth_middleware import (  # type: ignore[import]
    get_authenticated_user,
    verify_store_ownership,
    require_store_owner,
)
from backend.automation_service import automation_service  # type: ignore[import]
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
    await automation_service.start()

    print("=" * 60)
    print("   SimplifyOps API v1.0")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Debug Mode: {settings.DEBUG}")
    print(f"   Database: {'[OK]' if db.pool else '[MISSING]'}")
    print(f"   OpenAI Key: {'[OK]' if settings.OPENAI_API_KEY else '[MISSING]'}")
    print(f"   ElevenLabs Key: {'[OK]' if settings.ELEVENLABS_API_KEY else '[MISSING]'}")
    print(f"   Shopify API Key: {'[OK]' if settings.SHOPIFY_API_KEY else '[MISSING]'}")
    print(f"   Encryption Key: {'[OK]' if settings.ENCRYPTION_KEY else '[MISSING]'}")
    print(f"   Scheduler: [OK]")
    print("=" * 60)

    yield

    # Shutdown
    await automation_service.stop()
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
    # Trigger KB rebuild after product sync (BackgroundTasks run sequentially)
    background_tasks.add_task(kb_service.trigger_kb_rebuild, store_id)

    return {"received": True}


@app.post("/api/stores/{store_id}/sync")
async def trigger_product_sync(store_id: str, background_tasks: BackgroundTasks, request: Request):
    """Manually trigger a full product sync for a store"""
    await require_store_owner(request, store_id)
    async def _sync():
        count = await shopify_service.sync_all_products(store_id)
        SecurityLogger.log(f"Product sync complete: {count} products for store {store_id}", "INFO")

    background_tasks.add_task(_sync)
    # Also trigger KB rebuild after product sync
    background_tasks.add_task(kb_service.trigger_kb_rebuild, store_id)
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
        import math

        call_id = payload.call_id or str(uuid.uuid4())
        transcript = sanitize_input(payload.transcript or "", max_length=10000)

        # AI analysis of the shopping conversation
        analysis = await analyze_shopping_conversation(transcript)

        store_id = payload.store_id or ""

        # Resolve store_id from agent_id if not present in payload
        if not store_id and payload.agent_id and db.pool:
            row = await db.fetchrow(
                "SELECT id FROM stores WHERE elevenlabs_agent_id = $1",
                payload.agent_id,
            )
            if row:
                store_id = str(row["id"])

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
                datetime.now(UTC),
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

            # Track conversation minutes (round up to nearest minute)
            try:
                minutes = math.ceil((payload.duration or 0) / 60) if (payload.duration or 0) > 0 else 0
                if minutes > 0:
                    await db.execute(
                        "UPDATE stores SET minutes_used = COALESCE(minutes_used, 0) + $1 WHERE id = $2::uuid",
                        minutes,
                        store_id,
                    )
            except Exception as e:
                SecurityLogger.log(f"minutes_used update error: {e}", "WARNING")

            # Enforce 110% usage limit
            try:
                usage_row = await db.fetchrow(
                    "SELECT subscription_tier, minutes_used FROM stores WHERE id = $1::uuid",
                    store_id,
                )
                if usage_row:
                    tier_limit = TIER_LIMITS.get(usage_row["subscription_tier"] or "trial", 30)
                    if (usage_row["minutes_used"] or 0) * 10 >= tier_limit * 11:
                        await db.execute(
                            "UPDATE stores SET agent_status = 'limit_reached' WHERE id = $1::uuid AND agent_status = 'active'",
                            store_id,
                        )
                        SecurityLogger.log(
                            f"Usage limit reached: store={store_id} minutes={usage_row['minutes_used']}/{tier_limit}",
                            "WARNING",
                        )
            except Exception as e:
                SecurityLogger.log(f"Usage enforcement error: {e}", "WARNING")

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
        datetime.now(UTC),
        store_id,
    )
    return {"message": "Settings updated", "settings": settings_data}


# ===========================
# Dashboard API
# ===========================

def _time_ago(dt: datetime) -> str:
    """Format datetime as 'X mins ago', etc."""
    delta = datetime.now(UTC) - dt
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
# Agent Management
# ===========================


def _parse_jsonb(value: Any) -> dict:
    """Parse JSONB value -- asyncpg may return string or dict."""
    if isinstance(value, str):
        return json.loads(value)
    if isinstance(value, dict):
        return value
    return {}


@app.post("/api/agents/create", status_code=201)
async def create_agent_for_store(body: AgentCreateRequest, request: Request):
    """
    Create an ElevenLabs agent for a store from a template.
    Lifecycle: none -> pending -> active (or failed).
    """
    store_id = body.store_id
    await require_store_owner(request, store_id)

    # Check store exists and has no active agent
    store = await db.fetchrow(
        "SELECT agent_status, elevenlabs_agent_id, shop_domain FROM stores WHERE id = $1::uuid",
        store_id,
    )
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    if store["agent_status"] == "active" and store["elevenlabs_agent_id"]:
        raise HTTPException(status_code=409, detail="Store already has an active agent")

    # Fetch template
    template = await db.fetchrow(
        "SELECT id, conversation_config, platform_settings FROM agent_templates WHERE type = $1 AND is_default = TRUE",
        body.template_type,
    )
    if not template:
        raise HTTPException(status_code=404, detail=f"No template found for type: {body.template_type}")

    conversation_config = _parse_jsonb(template["conversation_config"])
    platform_settings = _parse_jsonb(template["platform_settings"])

    # Set pending status
    await db.execute(
        "UPDATE stores SET agent_status = 'pending' WHERE id = $1::uuid",
        store_id,
    )

    # Create ElevenLabs agent
    try:
        shop_domain = store.get("shop_domain", "unknown")
        result = await elevenlabs_service.create_agent(
            name=f"SimplifyOps - {shop_domain}",
            conversation_config=conversation_config,
            platform_settings=platform_settings,
        )
        agent_id = result["agent_id"]
    except Exception as e:
        # Set status to failed on error
        await db.execute(
            "UPDATE stores SET agent_status = 'failed' WHERE id = $1::uuid",
            store_id,
        )
        SecurityLogger.log(f"Agent creation failed for store {store_id}: {e}", "ERROR")
        raise HTTPException(status_code=502, detail="Failed to create agent via ElevenLabs API")

    # Update DB with successful agent creation
    await db.execute(
        """UPDATE stores
           SET elevenlabs_agent_id = $1,
               agent_status = 'active',
               agent_config = $2::jsonb,
               agent_template_id = $3::uuid,
               updated_at = NOW()
           WHERE id = $4::uuid""",
        agent_id,
        json.dumps(conversation_config),
        str(template["id"]),
        store_id,
    )

    return AgentCreateResponse(
        agent_id=agent_id,
        store_id=store_id,
        agent_status="active",
    )


@app.get("/api/agents/templates")
async def list_agent_templates(request: Request):
    """List all available agent templates."""
    await get_authenticated_user(request)

    rows = await db.fetch(
        "SELECT id, name, type, description, conversation_config, platform_settings, is_default FROM agent_templates ORDER BY type"
    )

    templates = []
    for row in rows:
        templates.append(AgentTemplateInfo(
            id=str(row["id"]),
            name=row["name"],
            type=row["type"],
            description=row.get("description"),
            conversation_config=_parse_jsonb(row["conversation_config"]),
            platform_settings=_parse_jsonb(row["platform_settings"]),
            is_default=row["is_default"],
        ))

    return templates


@app.get("/api/agents/{store_id}")
async def get_agent_info(store_id: str, request: Request):
    """Get agent information for a store."""
    await require_store_owner(request, store_id)

    row = await db.fetchrow(
        """SELECT elevenlabs_agent_id, agent_status, agent_config,
                  agent_template_id, minutes_used
           FROM stores WHERE id = $1::uuid""",
        store_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Store not found")

    # Look up template type if agent_template_id is set
    template_type = None
    if row.get("agent_template_id"):
        template_type = await db.fetchval(
            "SELECT type FROM agent_templates WHERE id = $1::uuid",
            str(row["agent_template_id"]),
        )

    return AgentInfo(
        store_id=store_id,
        elevenlabs_agent_id=row.get("elevenlabs_agent_id"),
        agent_status=row.get("agent_status", "none"),
        agent_config=_parse_jsonb(row.get("agent_config", {})),
        template_type=template_type,
        minutes_used=row.get("minutes_used", 0) or 0,
    )


@app.patch("/api/agents/{store_id}")
async def update_agent(store_id: str, body: AgentUpdateRequest, request: Request):
    """
    Update an agent's configuration.
    Writes to ElevenLabs FIRST, then DB (no config drift).
    """
    await require_store_owner(request, store_id)

    row = await db.fetchrow(
        "SELECT elevenlabs_agent_id, agent_status, agent_config FROM stores WHERE id = $1::uuid",
        store_id,
    )
    if not row or not row.get("elevenlabs_agent_id") or row.get("agent_status") != "active":
        raise HTTPException(status_code=404, detail="No active agent found for this store")

    agent_id = row["elevenlabs_agent_id"]

    # Build conversation_config from non-None fields
    merged_config: dict[str, Any] = {}
    if body.voice_id is not None:
        merged_config["tts"] = {"voice_id": body.voice_id}
    if body.greeting is not None:
        merged_config["agent"] = merged_config.get("agent", {})
        merged_config["agent"]["first_message"] = body.greeting
    if body.language is not None:
        merged_config["agent"] = merged_config.get("agent", {})
        merged_config["agent"]["language"] = body.language
    if body.system_prompt is not None:
        merged_config["agent"] = merged_config.get("agent", {})
        merged_config["agent"]["prompt"] = {"prompt": body.system_prompt}
    if body.max_duration_seconds is not None:
        merged_config["conversation"] = {"max_duration_seconds": body.max_duration_seconds}

    # Update ElevenLabs FIRST (per research pitfall #4)
    try:
        await elevenlabs_service.update_agent(agent_id, conversation_config=merged_config)
    except Exception as e:
        SecurityLogger.log(f"Agent update failed for store {store_id}: {e}", "ERROR")
        raise HTTPException(status_code=502, detail="Failed to update agent via ElevenLabs API")

    # Then update DB
    await db.execute(
        "UPDATE stores SET agent_config = agent_config || $1::jsonb, updated_at = NOW() WHERE id = $2::uuid",
        json.dumps(merged_config),
        store_id,
    )

    # Return updated info
    updated_config = _parse_jsonb(row.get("agent_config", {}))
    updated_config.update(merged_config)

    return AgentInfo(
        store_id=store_id,
        elevenlabs_agent_id=agent_id,
        agent_status="active",
        agent_config=updated_config,
    )


@app.delete("/api/agents/{store_id}")
async def delete_agent(store_id: str, request: Request):
    """
    Delete an agent from ElevenLabs and clean up DB.
    Logs warning if ElevenLabs deletion fails but continues with DB cleanup.
    """
    await require_store_owner(request, store_id)

    row = await db.fetchrow(
        "SELECT elevenlabs_agent_id, agent_status FROM stores WHERE id = $1::uuid",
        store_id,
    )
    if not row or not row.get("elevenlabs_agent_id"):
        raise HTTPException(status_code=404, detail="No agent found for this store")

    agent_id = row["elevenlabs_agent_id"]

    # Delete from ElevenLabs -- log warning if fails but continue
    try:
        await elevenlabs_service.delete_agent(agent_id)
    except Exception as e:
        SecurityLogger.log(f"Warning: ElevenLabs agent deletion failed for {agent_id}: {e}", "WARNING")

    # Clean up DB regardless
    await db.execute(
        """UPDATE stores
           SET elevenlabs_agent_id = NULL,
               agent_status = 'none',
               agent_config = '{}'::jsonb,
               agent_template_id = NULL,
               updated_at = NOW()
           WHERE id = $1::uuid""",
        store_id,
    )

    return AgentDeleteResponse(
        store_id=store_id,
        deleted=True,
        message="Agent deleted successfully",
    )


# ===========================
# Knowledge Base Management
# ===========================


@app.post("/api/stores/{store_id}/products", status_code=201)
async def create_manual_product(
    store_id: str,
    body: ManualProductCreate,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Create a manual (non-Shopify) product for a store."""
    await require_store_owner(request, store_id)

    # Generate next negative ID for manual products (avoids Shopify BIGINT collision)
    next_id = await db.fetchval(
        "SELECT COALESCE(MIN(id), 0) - 1 FROM products WHERE store_id = $1::uuid AND source = 'manual'",
        store_id,
    )

    # Insert the manual product
    await db.execute(
        """INSERT INTO products (id, store_id, title, description, price_min, price_max, source, product_url)
           VALUES ($1, $2::uuid, $3, $4, $5, $5, 'manual', $6)""",
        next_id, store_id, body.title, body.description, body.price, body.product_url,
    )

    # Fetch the inserted product for response
    product = await db.fetchrow(
        "SELECT id, store_id, title, description, price_min, price_max, source, product_url FROM products WHERE id = $1 AND store_id = $2::uuid",
        next_id, store_id,
    )

    # Trigger KB rebuild in background
    background_tasks.add_task(kb_service.trigger_kb_rebuild, store_id)

    return {
        "id": product["id"] if product else next_id,
        "store_id": str(product["store_id"]) if product else store_id,
        "title": product["title"] if product else body.title,
        "description": product["description"] if product else body.description,
        "price_min": float(product["price_min"]) if product else body.price,
        "price_max": float(product["price_max"]) if product else body.price,
        "source": "manual",
        "product_url": product["product_url"] if product else body.product_url,
    }


@app.put("/api/stores/{store_id}/products/{product_id}")
async def update_manual_product(
    store_id: str,
    product_id: int,
    body: ManualProductUpdate,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Update a manual product. Only source='manual' products can be edited."""
    await require_store_owner(request, store_id)

    # Verify product exists and is manual
    product = await db.fetchrow(
        "SELECT id, store_id, source, title, description, price_min, price_max, product_url FROM products WHERE id = $1 AND store_id = $2::uuid",
        product_id, store_id,
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["source"] != "manual":
        raise HTTPException(status_code=403, detail="Only manual products can be edited")

    # Build UPDATE for non-None fields
    updates = []
    params: list = []
    param_idx = 1

    if body.title is not None:
        updates.append(f"title = ${param_idx}")
        params.append(body.title)
        param_idx += 1
    if body.description is not None:
        updates.append(f"description = ${param_idx}")
        params.append(body.description)
        param_idx += 1
    if body.price is not None:
        updates.append(f"price_min = ${param_idx}")
        params.append(body.price)
        param_idx += 1
        updates.append(f"price_max = ${param_idx}")
        params.append(body.price)
        param_idx += 1
    if body.product_url is not None:
        updates.append(f"product_url = ${param_idx}")
        params.append(body.product_url)
        param_idx += 1

    if updates:
        params.append(product_id)
        params.append(store_id)
        sql = f"UPDATE products SET {', '.join(updates)} WHERE id = ${param_idx} AND store_id = ${param_idx + 1}::uuid"
        await db.execute(sql, *params)

    # Trigger KB rebuild
    background_tasks.add_task(kb_service.trigger_kb_rebuild, store_id)

    # Return updated product data
    return {
        "id": product_id,
        "store_id": store_id,
        "title": body.title if body.title is not None else product["title"],
        "description": body.description if body.description is not None else product["description"],
        "price_min": body.price if body.price is not None else float(product["price_min"]),
        "price_max": body.price if body.price is not None else float(product["price_max"]),
        "source": "manual",
        "product_url": body.product_url if body.product_url is not None else product["product_url"],
    }


@app.delete("/api/stores/{store_id}/products/{product_id}")
async def delete_manual_product(
    store_id: str,
    product_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Delete a manual product. Only source='manual' products can be deleted."""
    await require_store_owner(request, store_id)

    # Verify product exists and is manual
    product = await db.fetchrow(
        "SELECT id, source FROM products WHERE id = $1 AND store_id = $2::uuid",
        product_id, store_id,
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["source"] != "manual":
        raise HTTPException(status_code=403, detail="Only manual products can be deleted")

    await db.execute(
        "DELETE FROM products WHERE id = $1 AND store_id = $2::uuid",
        product_id, store_id,
    )

    # Trigger KB rebuild
    background_tasks.add_task(kb_service.trigger_kb_rebuild, store_id)

    return {"deleted": True, "product_id": product_id}


@app.get("/api/stores/{store_id}/kb/status")
async def get_kb_sync_status(store_id: str, request: Request):
    """Get knowledge base sync status for a store."""
    await require_store_owner(request, store_id)

    row = await db.fetchrow(
        """SELECT kb_sync_status, kb_last_synced, kb_product_count,
                  kb_char_count, kb_doc_id
           FROM stores WHERE id = $1::uuid""",
        store_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Store not found")

    char_count = int(row["kb_char_count"] or 0)
    char_limit = 300000
    warning_threshold = 240000

    return {
        "store_id": store_id,
        "kb_sync_status": row["kb_sync_status"] or "none",
        "kb_last_synced": str(row["kb_last_synced"]) if row["kb_last_synced"] else None,
        "kb_product_count": int(row["kb_product_count"] or 0),
        "kb_char_count": char_count,
        "kb_doc_id": row["kb_doc_id"],
        "char_limit": char_limit,
        "warning_threshold": warning_threshold,
        "is_warning": char_count >= warning_threshold,
    }


@app.post("/api/stores/{store_id}/kb/sync", status_code=202)
async def kb_sync_now(
    store_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Trigger an immediate KB rebuild for a store."""
    await require_store_owner(request, store_id)

    # Check store has an agent
    store = await db.fetchrow(
        "SELECT elevenlabs_agent_id FROM stores WHERE id = $1::uuid",
        store_id,
    )
    if not store or not store.get("elevenlabs_agent_id"):
        raise HTTPException(
            status_code=400,
            detail="Store has no ElevenLabs agent. Create an agent first.",
        )

    background_tasks.add_task(kb_service.trigger_kb_rebuild, store_id)

    return {"message": "KB sync started", "store_id": store_id}


# ===========================
# Server Tool (ElevenLabs agent product search)
# ===========================


@app.post("/api/tools/product-search")
async def server_tool_product_search(request: Request):
    """
    Server tool endpoint called by ElevenLabs agent during conversation.
    Authenticates via X-Tool-Secret header (shared secret, NOT user auth).
    Returns formatted product search results for the voice agent.
    """
    # Authenticate via shared secret
    tool_secret = request.headers.get("X-Tool-Secret", "")
    if not tool_secret or tool_secret != settings.ELEVENLABS_TOOL_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing tool secret")

    # Parse request body
    body = await request.json()
    query = body.get("query", "")
    store_id = body.get("store_id", "")
    max_price = body.get("max_price")
    category = body.get("category")

    if not store_id:
        raise HTTPException(status_code=400, detail="store_id is required")

    # Search products
    results = await kb_service.search_products_semantic(
        store_id, query, max_price, category, limit=5
    )

    # Format results for agent consumption
    formatted = []
    for r in results:
        desc = r.get("description", "") or ""
        price_min = float(r.get("price_min", 0))
        price_max = float(r.get("price_max", 0))
        if price_min == price_max or price_max == 0:
            price_str = f"${price_min:.2f}"
        else:
            price_str = f"${price_min:.2f} - ${price_max:.2f}"

        formatted.append({
            "name": r["title"],
            "price": price_str,
            "description": desc[:200],
            "category": r.get("category"),
        })

    if formatted:
        message = f"Found {len(formatted)} matching products."
    else:
        message = "No matching products found."

    return {"results": formatted, "message": message}


# ===========================
# Widget Config (public, wildcard CORS)
# ===========================

@app.get("/api/widget/config", response_model=WidgetConfigResponse)
async def get_widget_config(response: Response, store_id: str = ""):
    """
    Return per-store widget initialization config for embed.js.
    Public endpoint — no auth required. Wildcard CORS for cross-origin widget access.
    """
    response.headers["Access-Control-Allow-Origin"] = "*"

    if not store_id:
        return WidgetConfigResponse(
            has_agent=False,
            enabled=False,
            status="no_store_id",
        )

    try:
        row = await db.fetchrow(
            "SELECT elevenlabs_agent_id, agent_status, settings FROM stores WHERE id = $1::uuid",
            store_id,
        )
    except Exception:
        return WidgetConfigResponse(
            has_agent=False,
            enabled=False,
            status="error",
        )

    if not row:
        return WidgetConfigResponse(
            has_agent=False,
            enabled=False,
            status="store_not_found",
        )

    # Parse settings JSONB (may be str, dict, or None)
    raw_settings = row.get("settings")
    if isinstance(raw_settings, str):
        try:
            store_settings = json.loads(raw_settings)
        except (json.JSONDecodeError, TypeError):
            store_settings = {}
    elif isinstance(raw_settings, dict):
        store_settings = raw_settings
    else:
        store_settings = {}

    agent_id = row.get("elevenlabs_agent_id")
    agent_status = row.get("agent_status", "none")
    enabled = store_settings.get("enabled", True)

    # Only expose agent_id when agent is active AND enabled
    exposed_agent_id = agent_id if (agent_status == "active" and enabled) else None

    return WidgetConfigResponse(
        has_agent=bool(agent_id),
        enabled=enabled,
        agent_id=exposed_agent_id,
        widget_color=store_settings.get("widget_color", "#256af4"),
        widget_position=store_settings.get("widget_position", "bottom-right"),
        greeting_message=store_settings.get("greeting_message"),
        status=agent_status,
    )


# ===========================
# Voice Config (for widget)
# ===========================

@app.get("/api/voice/config")
async def get_voice_config(store_id: str = ""):
    """
    Return ElevenLabs Agent ID for the widget.
    If store_id is provided, resolves per-store agent_id from DB.
    Falls back to global ELEVENLABS_AGENT_ID.
    """
    # Per-store lookup
    if store_id:
        try:
            row = await db.fetchrow(
                "SELECT elevenlabs_agent_id, agent_status FROM stores WHERE id = $1::uuid",
                store_id,
            )
            if row and row.get("elevenlabs_agent_id") and row.get("agent_status") == "active":
                return {
                    "agent_id": row["elevenlabs_agent_id"],
                    "has_agent": True,
                }
        except Exception:
            pass  # Fall through to global fallback

    # Global fallback
    return {
        "agent_id": settings.ELEVENLABS_AGENT_ID or "",
        "has_agent": bool(settings.ELEVENLABS_AGENT_ID),
    }


@app.get("/api/voice/signed-url")
async def get_voice_signed_url(response: Response, store_id: str = ""):
    """
    Generate a signed URL for ElevenLabs WebRTC connection.
    If store_id is provided, resolves per-store agent_id from DB.
    Falls back to global ELEVENLABS_AGENT_ID.
    Wildcard CORS for cross-origin widget access.
    """
    response.headers["Access-Control-Allow-Origin"] = "*"

    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="Voice AI not configured")

    agent_id = None

    # Per-store lookup
    if store_id:
        try:
            row = await db.fetchrow(
                "SELECT elevenlabs_agent_id, agent_status FROM stores WHERE id = $1::uuid",
                store_id,
            )
            if row:
                if row.get("agent_status") != "active":
                    raise HTTPException(status_code=503, detail="Agent is not active")
                agent_id = row.get("elevenlabs_agent_id")
        except HTTPException:
            raise
        except Exception:
            pass  # Fall through to global fallback

    # Global fallback
    if not agent_id:
        agent_id = settings.ELEVENLABS_AGENT_ID

    if not agent_id:
        raise HTTPException(status_code=503, detail="Agent not configured")

    # Use elevenlabs_service for per-store agents, httpx for global (backward compat)
    if store_id and agent_id != settings.ELEVENLABS_AGENT_ID:
        try:
            signed_url = await elevenlabs_service.get_signed_url(agent_id)
            return {"signed_url": signed_url}
        except Exception as e:
            SecurityLogger.log(f"Signed URL error for agent {agent_id}: {e}", "ERROR")
            raise HTTPException(status_code=502, detail="Failed to get signed URL")

    # Global fallback path (original logic)
    async with httpx.AsyncClient() as el_client:
        el_resp = await el_client.get(
            "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
            params={"agent_id": agent_id},
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            timeout=10.0,
        )
        if el_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to get signed URL")
        return el_resp.json()


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
                """INSERT INTO stores (id, shop_domain, subscription_tier, created_at, trial_ends_at)
                   VALUES ($1, $2, 'trial', NOW(), NOW() + INTERVAL '14 days')
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


VALID_STORE_TYPES = {"online_store", "service_business", "lead_gen"}


@app.post("/api/stores/create")
async def create_store(request: Request, background_tasks: BackgroundTasks):
    """
    Create a store for non-Shopify users (manual website entry).
    Accepts optional store_name and store_type fields.
    Triggers onboarding workflow (agent creation, KB sync, welcome email) in background.
    """
    user_id = await get_authenticated_user(request)

    body = await request.body()
    data = json.loads(body) if body else {}
    site_url = sanitize_input(str(data.get("site_url", "")).strip().rstrip("/"))

    if not site_url:
        raise HTTPException(400, "site_url is required")

    # Extract store_name (optional, max 100 chars)
    store_name = data.get("store_name")
    if store_name is not None:
        store_name = sanitize_input(str(store_name).strip()[:100])

    # Extract store_type (optional, defaults to 'online_store')
    store_type = data.get("store_type", "online_store")
    if store_type not in VALID_STORE_TYPES:
        raise HTTPException(400, f"Invalid store_type. Must be one of: {', '.join(sorted(VALID_STORE_TYPES))}")

    store_id = str(uuid.uuid4())

    if not db.pool:
        raise HTTPException(503, "Database unavailable, please try again")

    try:
        await db.execute(
            """INSERT INTO stores (id, shop_domain, owner_id, subscription_tier, settings, created_at, store_name, onboarding_step, trial_ends_at)
               VALUES ($1, $2, $3::uuid, 'trial', '{}', NOW(), $4, 'pending', NOW() + INTERVAL '14 days')
               ON CONFLICT (shop_domain) DO UPDATE SET owner_id = $3::uuid, store_name = $4, onboarding_step = 'pending'
               RETURNING id""",
            store_id, site_url, user_id, store_name,
        )
    except Exception as e:
        SecurityLogger.log_error("Create store error", e)
        raise HTTPException(500, "Failed to create store")

    # Trigger onboarding workflow in background (fire-and-forget)
    # owner_email=None: the workflow resolves it from DB using owner_id
    background_tasks.add_task(
        automation_service.run_onboarding,
        store_id,
        None,
        store_type,
    )

    return {
        "store_id": store_id,
        "site_url": site_url,
        "subscription_tier": "trial",
        "store_name": store_name,
        "store_type": store_type,
    }


ONBOARDING_STEPS_SEQUENCE = ["pending", "creating_agent", "syncing_kb", "sending_email", "complete"]


@app.get("/api/stores/{store_id}/onboarding-status")
async def get_onboarding_status(store_id: str, request: Request):
    """Get current onboarding step and completion state for a store."""
    user_id = await get_authenticated_user(request)

    if not db.pool:
        raise HTTPException(503, "Database not available")

    row = await db.fetchrow(
        """SELECT onboarding_step, onboarding_error, agent_status, store_name,
                  elevenlabs_agent_id, owner_id
           FROM stores WHERE id = $1::uuid""",
        store_id,
    )
    if not row:
        raise HTTPException(404, "Store not found")

    # Verify ownership
    if str(row["owner_id"]) != user_id:
        raise HTTPException(403, "Access denied")

    step = row["onboarding_step"] or "none"
    is_failed = step == "failed"
    is_complete = step == "complete"

    # Derive completed_steps from sequence position
    if is_failed:
        completed_steps = []
    elif step in ONBOARDING_STEPS_SEQUENCE:
        idx = ONBOARDING_STEPS_SEQUENCE.index(step)
        completed_steps = ONBOARDING_STEPS_SEQUENCE[:idx + 1]
    else:
        completed_steps = []

    has_agent = (
        row["elevenlabs_agent_id"] is not None
        and row["agent_status"] == "active"
    )

    return {
        "store_id": store_id,
        "step": step,
        "completed_steps": completed_steps,
        "is_complete": is_complete,
        "is_failed": is_failed,
        "error": row["onboarding_error"],
        "has_agent": has_agent,
    }


# ===========================
# Subscription & Reports Endpoints
# ===========================

@app.get("/api/stores/{store_id}/subscription")
async def get_store_subscription(store_id: str, request: Request):
    """Get real subscription info from Stripe for a store."""
    await require_store_owner(request, store_id)
    if not db.pool:
        return {"tier": "trial", "status": "active", "minutes_used": 0, "minutes_limit": 30, "is_trial_expired": False, "trial_ends_at": None}

    try:
        row = await db.fetchrow(
            """SELECT subscription_tier, stripe_customer_id, stripe_subscription_id,
                      minutes_used, trial_ends_at
               FROM stores WHERE id = $1::uuid""",
            store_id,
        )
        if not row:
            raise HTTPException(404, "Store not found")

        tier = row["subscription_tier"] or "trial"
        minutes_used = row["minutes_used"] or 0
        trial_ends_at = row["trial_ends_at"]

        # Determine trial expiry
        is_trial_expired = False
        if tier == "trial" and trial_ends_at is not None:
            if hasattr(trial_ends_at, 'tzinfo') and trial_ends_at.tzinfo is None:
                from datetime import timezone
                trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
            is_trial_expired = trial_ends_at < datetime.now(UTC)

        result: dict[str, Any] = {
            "tier": tier,
            "status": "active",
            "minutes_used": minutes_used,
            "minutes_limit": TIER_LIMITS.get(tier, 30),
            "current_period_end": None,
            "payment_method_last4": None,
            "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None,
            "is_trial_expired": is_trial_expired,
        }

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
        return {"tier": "trial", "status": "active", "minutes_used": 0, "minutes_limit": 30, "is_trial_expired": False, "trial_ends_at": None}


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
# Agent Configuration Endpoints
# ===========================


@app.get("/api/agent/config/{store_id}", response_model=AgentConfigResponse)
async def get_agent_config(store_id: str, request: Request):
    """Get full agent configuration for a store (voice, widget, personality, language)."""
    await require_store_owner(request, store_id)

    row = await db.fetchrow(
        "SELECT elevenlabs_agent_id, agent_status, agent_config, settings FROM stores WHERE id = $1::uuid",
        store_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Store not found")

    settings_data = _parse_jsonb(row.get("settings", {}))
    agent_config = _parse_jsonb(row.get("agent_config", {}))

    # Resolve voice_id from settings or agent_config
    voice_id = settings_data.get("voice_id") or agent_config.get("tts", {}).get("voice_id")

    # Look up voice name from curated voices
    voice_name = None
    if voice_id:
        for v in CURATED_VOICES:
            if v["id"] == voice_id:
                voice_name = v["name"]
                break

    return AgentConfigResponse(
        voice_id=voice_id,
        voice_name=voice_name,
        greeting=settings_data.get("greeting_message", "Hi! I can help you find the perfect product."),
        widget_color=settings_data.get("widget_color", "#256af4"),
        widget_position=settings_data.get("widget_position", "bottom-right"),
        enabled=settings_data.get("enabled", True),
        language=settings_data.get("language", "en"),
        personality_preset=settings_data.get("personality_preset"),
        agent_status=row.get("agent_status", "none"),
    )


@app.put("/api/agent/config/{store_id}", response_model=AgentConfigResponse)
async def update_agent_config(store_id: str, body: AgentConfigUpdate, request: Request):
    """
    Update agent configuration. Separates ElevenLabs-bound fields from DB-only fields.
    ElevenLabs-bound: voice_id, greeting, language, personality_preset
    DB-only: widget_color, widget_position, enabled
    """
    await require_store_owner(request, store_id)

    row = await db.fetchrow(
        "SELECT elevenlabs_agent_id, agent_status, agent_config, settings, shop_domain FROM stores WHERE id = $1::uuid",
        store_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Store not found")

    agent_id = row.get("elevenlabs_agent_id")
    current_settings = _parse_jsonb(row.get("settings", {}))
    current_status = row.get("agent_status", "none")
    shop_domain = row.get("shop_domain", "your store")

    # Determine which fields are ElevenLabs-bound
    el_config: dict[str, Any] = {}
    has_el_changes = False

    if body.voice_id is not None:
        el_config["tts"] = {"voice_id": body.voice_id}
        has_el_changes = True

    if body.greeting is not None:
        el_config.setdefault("agent", {})["first_message"] = body.greeting
        has_el_changes = True

    if body.language is not None:
        el_config.setdefault("agent", {})["language"] = body.language
        has_el_changes = True

    if body.personality_preset is not None:
        # Look up preset system_prompt
        preset = next((p for p in PERSONALITY_PRESETS if p["id"] == body.personality_preset), None)
        if preset:
            prompt_text = preset["system_prompt"].replace("{store_name}", shop_domain)
            el_config.setdefault("agent", {})["prompt"] = {"prompt": prompt_text}
            has_el_changes = True

    # Push to ElevenLabs FIRST (only if agent exists and has el changes)
    if has_el_changes and agent_id:
        try:
            await elevenlabs_service.update_agent(agent_id, conversation_config=el_config)
        except Exception as e:
            SecurityLogger.log(f"Agent config update failed for store {store_id}: {e}", "ERROR")
            raise HTTPException(status_code=502, detail="Failed to update agent via ElevenLabs API")

    # Build settings JSONB update
    settings_update: dict[str, Any] = {}
    if body.voice_id is not None:
        settings_update["voice_id"] = body.voice_id
    if body.greeting is not None:
        settings_update["greeting_message"] = body.greeting
    if body.widget_color is not None:
        settings_update["widget_color"] = body.widget_color
    if body.widget_position is not None:
        settings_update["widget_position"] = body.widget_position
    if body.language is not None:
        settings_update["language"] = body.language
    if body.personality_preset is not None:
        settings_update["personality_preset"] = body.personality_preset

    # Handle enabled toggle
    new_status = current_status
    if body.enabled is not None:
        settings_update["enabled"] = body.enabled
        new_status = "active" if body.enabled else "inactive"
        await db.execute(
            "UPDATE stores SET agent_status = $1, settings = COALESCE(settings, '{}'::jsonb) || $2::jsonb, updated_at = NOW() WHERE id = $3::uuid",
            new_status,
            json.dumps(settings_update),
            store_id,
        )
    elif settings_update:
        await db.execute(
            "UPDATE stores SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE id = $2::uuid",
            json.dumps(settings_update),
            store_id,
        )

    # Also update agent_config JSONB if ElevenLabs fields changed
    if has_el_changes:
        await db.execute(
            "UPDATE stores SET agent_config = COALESCE(agent_config, '{}'::jsonb) || $1::jsonb WHERE id = $2::uuid",
            json.dumps(el_config),
            store_id,
        )

    # Build response from merged settings
    merged = {**current_settings, **settings_update}

    voice_id = merged.get("voice_id") or body.voice_id
    voice_name = None
    if voice_id:
        for v in CURATED_VOICES:
            if v["id"] == voice_id:
                voice_name = v["name"]
                break

    return AgentConfigResponse(
        voice_id=voice_id,
        voice_name=voice_name,
        greeting=merged.get("greeting_message", "Hi!"),
        widget_color=merged.get("widget_color", "#256af4"),
        widget_position=merged.get("widget_position", "bottom-right"),
        enabled=merged.get("enabled", True) if body.enabled is None else body.enabled,
        language=merged.get("language", "en"),
        personality_preset=merged.get("personality_preset"),
        agent_status=new_status,
    )


@app.get("/api/voices")
async def get_voices():
    """Return curated voices, supported languages, and personality presets.

    Single endpoint for all agent configuration options.
    No auth required -- public catalog data.
    """
    voices = get_curated_voices()
    languages = get_supported_languages()
    presets = get_personality_presets()

    return {
        "voices": [v.model_dump() for v in voices],
        "languages": [l.model_dump() for l in languages],
        "personality_presets": [p.model_dump() for p in presets],
    }


@app.get("/api/agent/embed-code/{store_id}", response_model=EmbedCodeResponse)
async def get_embed_code(store_id: str, request: Request):
    """Generate copy-paste embed code for a store's voice widget."""
    await require_store_owner(request, store_id)

    # Verify store exists
    row = await db.fetchrow(
        "SELECT id, elevenlabs_agent_id FROM stores WHERE id = $1::uuid",
        store_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Store not found")

    # Use request base URL or settings for API URL
    api_url = str(request.base_url).rstrip("/")
    embed_code = generate_embed_code(store_id, api_url)

    return EmbedCodeResponse(embed_code=embed_code, store_id=store_id)


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
# Analytics API
# ===========================


def _parse_period(period: str) -> int:
    """Map period string to integer days. Default 7."""
    mapping = {"7d": 7, "30d": 30, "90d": 90}
    return mapping.get(period, 7)


@app.get("/api/analytics/overview")
async def analytics_overview(request: Request, store_id: str, period: str = "7d"):
    """
    Analytics overview: total conversations, avg duration, trend vs previous period.
    """
    await require_store_owner(request, store_id)

    days = _parse_period(period)

    if not db.pool:
        return {
            "total_conversations": 0,
            "prev_total_conversations": 0,
            "avg_duration_seconds": 0,
            "prev_avg_duration_seconds": 0,
            "total_duration_seconds": 0,
            "period": period,
        }

    try:
        # Current period
        total = await db.fetchval(
            f"SELECT COUNT(*) FROM conversations WHERE store_id = $1::uuid AND started_at >= NOW() - interval '{days} days'",
            store_id,
        ) or 0

        avg_dur = await db.fetchval(
            f"SELECT AVG(duration_seconds) FROM conversations WHERE store_id = $1::uuid AND started_at >= NOW() - interval '{days} days'",
            store_id,
        )
        avg_dur = round(float(avg_dur), 1) if avg_dur else 0

        total_dur = await db.fetchval(
            f"SELECT COALESCE(SUM(duration_seconds), 0) FROM conversations WHERE store_id = $1::uuid AND started_at >= NOW() - interval '{days} days'",
            store_id,
        ) or 0

        # Previous period
        prev_total = await db.fetchval(
            f"SELECT COUNT(*) FROM conversations WHERE store_id = $1::uuid AND started_at >= NOW() - interval '{days * 2} days' AND started_at < NOW() - interval '{days} days'",
            store_id,
        ) or 0

        prev_avg_dur = await db.fetchval(
            f"SELECT AVG(duration_seconds) FROM conversations WHERE store_id = $1::uuid AND started_at >= NOW() - interval '{days * 2} days' AND started_at < NOW() - interval '{days} days'",
            store_id,
        )
        prev_avg_dur = round(float(prev_avg_dur), 1) if prev_avg_dur else 0

        return {
            "total_conversations": int(total),
            "prev_total_conversations": int(prev_total),
            "avg_duration_seconds": avg_dur,
            "prev_avg_duration_seconds": prev_avg_dur,
            "total_duration_seconds": int(total_dur),
            "period": period,
        }
    except Exception as e:
        SecurityLogger.log(f"Analytics overview error: {e}", "ERROR")
        return {
            "total_conversations": 0,
            "prev_total_conversations": 0,
            "avg_duration_seconds": 0,
            "prev_avg_duration_seconds": 0,
            "total_duration_seconds": 0,
            "period": period,
        }


@app.get("/api/analytics/intents")
async def analytics_intents(request: Request, store_id: str, period: str = "7d"):
    """
    Top customer intents with counts, filtered by period.
    """
    await require_store_owner(request, store_id)

    days = _parse_period(period)

    if not db.pool:
        return {"intents": [], "period": period}

    try:
        rows = await db.fetch(
            f"""SELECT intent, COUNT(*) as count
                FROM conversations
                WHERE store_id = $1::uuid
                  AND started_at >= NOW() - interval '{days} days'
                  AND intent IS NOT NULL
                GROUP BY intent
                ORDER BY count DESC
                LIMIT 10""",
            store_id,
        )

        intents = [{"intent": r["intent"], "count": int(r["count"])} for r in rows]
        return {"intents": intents, "period": period}
    except Exception as e:
        SecurityLogger.log(f"Analytics intents error: {e}", "ERROR")
        return {"intents": [], "period": period}


@app.get("/api/analytics/peak-hours")
async def analytics_peak_hours(request: Request, store_id: str, period: str = "7d"):
    """
    Hourly distribution of conversations, returns all 24 hours (zero-filled).
    """
    await require_store_owner(request, store_id)

    days = _parse_period(period)

    if not db.pool:
        return {"hours": [{"hour": h, "count": 0} for h in range(24)], "period": period}

    try:
        rows = await db.fetch(
            f"""SELECT EXTRACT(HOUR FROM started_at) as hour, COUNT(*) as count
                FROM conversations
                WHERE store_id = $1::uuid
                  AND started_at >= NOW() - interval '{days} days'
                GROUP BY hour
                ORDER BY hour""",
            store_id,
        )

        hour_map = {int(r["hour"]): int(r["count"]) for r in rows}
        hours = [{"hour": h, "count": hour_map.get(h, 0)} for h in range(24)]

        return {"hours": hours, "period": period}
    except Exception as e:
        SecurityLogger.log(f"Analytics peak hours error: {e}", "ERROR")
        return {"hours": [{"hour": h, "count": 0} for h in range(24)], "period": period}


@app.get("/api/analytics/unanswered")
async def analytics_unanswered(request: Request, store_id: str, period: str = "7d"):
    """
    Aggregated unanswered questions from conversations (negative sentiment or unknown intent).
    """
    await require_store_owner(request, store_id)

    days = _parse_period(period)

    if not db.pool:
        return {"questions": [], "total": 0, "period": period}

    try:
        rows = await db.fetch(
            f"""SELECT intent, transcript, started_at, sentiment
                FROM conversations
                WHERE store_id = $1::uuid
                  AND started_at >= NOW() - interval '{days} days'
                  AND (intent ILIKE '%unanswered%' OR intent ILIKE '%unknown%' OR sentiment = 'Negative')
                ORDER BY started_at DESC
                LIMIT 50""",
            store_id,
        )

        questions = []
        for r in rows:
            # Extract summary from transcript (first 200 chars as text)
            transcript = r["transcript"]
            if isinstance(transcript, list):
                summary = " ".join(
                    item.get("text", "") if isinstance(item, dict) else str(item)
                    for item in transcript
                )[:200]
            elif isinstance(transcript, str):
                summary = transcript[:200]
            else:
                summary = str(transcript)[:200] if transcript else ""

            questions.append({
                "intent": r["intent"],
                "summary": summary,
                "date": r["started_at"].isoformat() if r["started_at"] else None,
            })

        return {"questions": questions, "total": len(questions), "period": period}
    except Exception as e:
        SecurityLogger.log(f"Analytics unanswered error: {e}", "ERROR")
        return {"questions": [], "total": 0, "period": period}


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
