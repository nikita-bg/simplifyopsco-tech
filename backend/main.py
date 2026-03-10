"""
AI Voice Shopping Assistant — FastAPI Backend
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


# ===========================
# App Lifecycle
# ===========================

@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    """Startup and shutdown events"""
    # Startup
    await db.connect()

    print("=" * 60)
    print("   AI Voice Shopping Assistant API v1.0")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Debug Mode: {settings.DEBUG}")
    print(f"   Database: {'✓ connected' if db.pool else '✗ NOT connected'}")
    print(f"   OpenAI Key: {'✓ configured' if settings.OPENAI_API_KEY else '✗ MISSING'}")
    print(f"   ElevenLabs Key: {'✓ configured' if settings.ELEVENLABS_API_KEY else '✗ MISSING'}")
    print(f"   Shopify API Key: {'✓ configured' if settings.SHOPIFY_API_KEY else '✗ MISSING'}")
    print(f"   Encryption Key: {'✓ configured' if settings.ENCRYPTION_KEY else '✗ MISSING'}")
    print("=" * 60)

    yield

    # Shutdown
    await db.disconnect()


# Initialize FastAPI
app = FastAPI(
    title="AI Voice Shopping Assistant API",
    description="Intelligent voice-powered sales agent for Shopify stores",
    version="1.0.0",
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
        "service": "AI Voice Shopping Assistant",
        "status": "running",
        "version": "1.0.0",
        "database": "connected" if db.pool else "disconnected",
    }


# ===========================
# Shopify OAuth
# ===========================

@app.get("/shopify/auth")
async def shopify_auth(shop: str):
    """Initiate Shopify OAuth install flow"""
    if not shop or not shop.endswith(".myshopify.com"):
        raise HTTPException(400, "Invalid shop domain")

    install_url = shopify_service.get_install_url(shop)
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

        # Save store to database
        store_id = await shopify_service.register_store(shop, access_token)

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
    if settings.SHOPIFY_API_SECRET and not shopify_service.verify_hmac(body, hmac_header):
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
async def trigger_product_sync(store_id: str, background_tasks: BackgroundTasks):
    """Manually trigger a full product sync for a store"""
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

    if not transcript or not settings.OPENAI_API_KEY:
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
async def get_store_settings(store_id: str):
    """Get widget settings for a store"""
    row = await db.fetchrow(
        "SELECT settings FROM stores WHERE id = $1::uuid", store_id
    )
    if not row:
        raise HTTPException(404, "Store not found")

    return StoreSettings(**row["settings"]) if row["settings"] else StoreSettings()


@app.put("/api/stores/{store_id}/settings")
async def update_store_settings(store_id: str, settings_data: StoreSettings):
    """Update widget settings for a store"""
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
async def get_dashboard_stats(store_id: str):
    """Get dashboard statistics for a store"""
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
# GDPR Mandatory Endpoints
# ===========================

@app.post("/shopify/gdpr/customers/data-request")
async def gdpr_customer_data_request(request: Request):
    """Shopify mandatory: handle customer data request"""
    body = await request.body()
    data = json.loads(body)
    SecurityLogger.log(f"GDPR data request for shop: {data.get('shop_domain')}", "INFO")
    # In production: compile and send customer data
    return {"received": True}


@app.post("/shopify/gdpr/customers/redact")
async def gdpr_customer_redact(request: Request):
    """Shopify mandatory: redact customer data"""
    body = await request.body()
    data = json.loads(body)
    shop_domain = data.get("shop_domain", "")

    # Delete customer conversation data
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
    return {"received": True}


@app.post("/shopify/gdpr/shop/redact")
async def gdpr_shop_redact(request: Request):
    """Shopify mandatory: redact shop data (48h after uninstall)"""
    body = await request.body()
    data = json.loads(body)
    shop_domain = data.get("shop_domain", "")

    if db.pool:
        # Delete all store data (cascade deletes products, conversations, etc.)
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
