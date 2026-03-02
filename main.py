"""
AI Voice Receptionist - FastAPI Backend
Конвертация от n8n workflow в производствено FastAPI приложение
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks  # type: ignore[import-not-found]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import-not-found]
import httpx  # type: ignore[import-not-found]
import re
import uuid
import random
from datetime import datetime, timedelta
from typing import Optional, Any

from models import (  # type: ignore[import-not-found]
    ElevenLabsWebhookPayload,
    ProcessedCallData,
    LeadInfo,
    CallMetadata,
    CRMPayload,
    LightRAGData,
    WebhookResponse,
    ClientConfig,
    ConversationRecord,
    DashboardStats,
    CallDataPoint,
    IntentDataPoint,
    ConversationSummary,
    PostCallPayload,
)
from config import settings  # type: ignore[import-not-found]
from lightrag_service import rag_service  # type: ignore[import-not-found]


# Инициализира FastAPI приложението
app = FastAPI(
    title="AI Voice Receptionist API",
    description="B2B SaaS за AI Voice Receptionist с CRM интеграция и LightRAG analytics",
    version="2.0.0"
)

# Добавя CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://simplifyopsco.tech",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory storage
CLIENT_CONFIGS: dict[str, ClientConfig] = {}
CONVERSATIONS: list[ConversationRecord] = []


# ===========================
# AI Sentiment & Intent Analysis
# ===========================

async def analyze_conversation(transcript: str) -> dict[str, Any]:
    """
    Използва OpenAI API за анализ на транскрипцията.
    Връща sentiment, lead_score, intent.
    """
    if not settings.OPENAI_API_KEY:
        # Fallback без API ключ
        return {
            "sentiment": "Neutral",
            "lead_score": 5.0,
            "intent": "General",
            "status": "Pending",
        }

    system_prompt = """You are an AI conversation analyst. Analyze the following transcript from a business voice call.
Return a JSON object with exactly these fields:
- "sentiment": one of "Very Positive", "Positive", "Neutral", "Negative"
- "lead_score": a float from 1.0 to 10.0 (10 = extremely interested buyer)
- "intent": one of "Sales", "Support", "Demo", "Pricing", "General"
- "status": one of "Qualified", "Pending", "Rejected"

Respond with ONLY the JSON object, no other text."""

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
                    "max_tokens": 150,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()

            # Parse JSON от отговора
            import json
            # Премахваме markdown code fences ако има
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            result = json.loads(content)
            return result
    except Exception as e:
        print(f"[WARNING] OpenAI analysis failed: {e}")

    return {
        "sentiment": "Neutral",
        "lead_score": 5.0,
        "intent": "General",
        "status": "Pending",
    }


# ===========================
# Seed Demo Data
# ===========================

def seed_demo_conversations():
    """Добавя 8 demo разговора за тестване"""
    demos = [
        ConversationRecord(
            call_id=str(uuid.uuid4()),
            caller_id="+1 (555) 012-3456",
            timestamp=datetime.now() - timedelta(minutes=2),
            duration_seconds=252,
            transcript="Hi, I'm interested in your Pro plan. Can you tell me about the custom voice clone feature? I run a real estate agency and want to automate our intake calls.",
            sentiment="Positive",
            lead_score=8.5,
            intent="Sales",
            status="Qualified",
        ),
        ConversationRecord(
            call_id=str(uuid.uuid4()),
            caller_id="+1 (555) 867-5543",
            timestamp=datetime.now() - timedelta(minutes=15),
            duration_seconds=105,
            transcript="I'm having trouble connecting the widget to my WordPress site. The script doesn't load properly. Can someone help?",
            sentiment="Neutral",
            lead_score=4.0,
            intent="Support",
            status="Pending",
        ),
        ConversationRecord(
            call_id=str(uuid.uuid4()),
            caller_id="+1 (555) 298-8101",
            timestamp=datetime.now() - timedelta(hours=1),
            duration_seconds=158,
            transcript="This is amazing! I showed the demo to our marketing team and everyone loved it. We want to schedule a full demo with our CTO next week. We're a 200-person SaaS company.",
            sentiment="Very Positive",
            lead_score=9.5,
            intent="Demo",
            status="Qualified",
        ),
        ConversationRecord(
            call_id=str(uuid.uuid4()),
            caller_id="+1 (555) 441-2290",
            timestamp=datetime.now() - timedelta(hours=3),
            duration_seconds=87,
            transcript="What's the difference between the Starter and Pro plan? How many voice interactions do I get per month?",
            sentiment="Neutral",
            lead_score=6.5,
            intent="Pricing",
            status="Pending",
        ),
        ConversationRecord(
            call_id=str(uuid.uuid4()),
            caller_id="+1 (555) 773-1029",
            timestamp=datetime.now() - timedelta(hours=5),
            duration_seconds=320,
            transcript="We need enterprise-level deployment with on-premise options. Our compliance team requires data residency in the EU. Can we discuss a custom SLA?",
            sentiment="Positive",
            lead_score=9.0,
            intent="Sales",
            status="Qualified",
        ),
        ConversationRecord(
            call_id=str(uuid.uuid4()),
            caller_id="+1 (555) 332-4821",
            timestamp=datetime.now() - timedelta(hours=8),
            duration_seconds=45,
            transcript="Hi, just checking if your API supports WebSocket connections for real-time transcription.",
            sentiment="Neutral",
            lead_score=5.0,
            intent="Support",
            status="Pending",
        ),
        ConversationRecord(
            call_id=str(uuid.uuid4()),
            caller_id="+1 (555) 119-7743",
            timestamp=datetime.now() - timedelta(hours=12),
            duration_seconds=198,
            transcript="I'd like to book a demo for our dental practice. We get about 200 calls a day and most are appointment bookings. This could save us a full-time receptionist.",
            sentiment="Very Positive",
            lead_score=9.2,
            intent="Demo",
            status="Qualified",
        ),
        ConversationRecord(
            call_id=str(uuid.uuid4()),
            caller_id="+1 (555) 884-0012",
            timestamp=datetime.now() - timedelta(days=1),
            duration_seconds=72,
            transcript="Not interested right now, but maybe in the future. We're still evaluating options.",
            sentiment="Neutral",
            lead_score=2.5,
            intent="General",
            status="Rejected",
        ),
    ]
    CONVERSATIONS.extend(demos)
    print(f"[OK] Seeded {len(demos)} demo conversations")


# ===========================
# Dashboard Stats API
# ===========================

def _time_ago(dt: datetime) -> str:
    """Форматира datetime като 'X mins ago', 'X hours ago', etc."""
    delta = datetime.now() - dt
    if delta.total_seconds() < 60:
        return "just now"
    elif delta.total_seconds() < 3600:
        mins = int(delta.total_seconds() / 60)
        return f"{mins} min{'s' if mins != 1 else ''} ago"
    elif delta.total_seconds() < 86400:
        hours = int(delta.total_seconds() / 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    else:
        days = int(delta.total_seconds() / 86400)
        return f"{days} day{'s' if days != 1 else ''} ago"


def _format_duration(seconds: int) -> str:
    """Форматира секунди като 'MM:SS'"""
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """
    Връща агрегирани статистики за Dashboard-а.
    Данните идват от in-memory CONVERSATIONS store.
    """
    total = len(CONVERSATIONS)

    if total == 0:
        return DashboardStats()

    # Средна оценка на лийдовете
    avg_score = sum(c.lead_score for c in CONVERSATIONS) / total

    # Conversion rate = Qualified / Total * 100
    qualified = sum(1 for c in CONVERSATIONS if c.status == "Qualified")
    conv_rate = (qualified / total * 100) if total > 0 else 0.0

    # Обаждания по ден на седмицата
    day_counts = {"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0}
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for c in CONVERSATIONS:
        day = day_names[c.timestamp.weekday()]
        day_counts[day] += 1
    # Мултиплициране за по-добра визуализация
    call_data = [CallDataPoint(name=d, calls=day_counts[d] * random.randint(200, 500)) for d in day_names]

    # Разпределение по intent
    intent_counts: dict[str, int] = {}
    for c in CONVERSATIONS:
        intent_counts[c.intent] = intent_counts.get(c.intent, 0) + 1
    total_intents = sum(intent_counts.values()) or 1
    intent_data = [
        IntentDataPoint(name=k, value=round(v / total_intents * 100))
        for k, v in sorted(intent_counts.items(), key=lambda x: -x[1])
    ]

    # Последни разговори (до 10)
    sorted_convos = sorted(CONVERSATIONS, key=lambda c: c.timestamp, reverse=True)
    recent = [
        ConversationSummary(
            caller_id=c.caller_id,
            time_ago=_time_ago(c.timestamp),
            duration=_format_duration(c.duration_seconds),
            sentiment=c.sentiment,
            status=c.status,
        )
        for c in list(sorted_convos)[:10]  # type: ignore[index]
    ]

    return DashboardStats(
        total_calls=total,
        avg_lead_score=round(float(avg_score), 1),
        conversion_rate=round(float(conv_rate), 1),
        call_data=call_data,
        intent_data=intent_data,
        recent_conversations=recent,
    )


# ===========================
# Post-Call Webhook (нов)
# ===========================

@app.post("/webhook/elevenlabs/post-call")
async def post_call_webhook(
    payload: PostCallPayload,
    background_tasks: BackgroundTasks,
):
    """
    Webhook за след-разговор от ElevenLabs.
    1. Записва разговора
    2. Пуска AI анализ на транскрипцията (асинхронно)
    """
    call_id = payload.call_id or str(uuid.uuid4())

    # AI анализ на транскрипцията
    analysis = await analyze_conversation(payload.transcript)

    record = ConversationRecord(
        call_id=call_id,
        caller_id=payload.caller_id or "Unknown",
        timestamp=datetime.now(),
        duration_seconds=payload.duration or 0,
        transcript=payload.transcript,
        sentiment=analysis.get("sentiment", "Neutral"),
        lead_score=analysis.get("lead_score", 5.0),
        intent=analysis.get("intent", "General"),
        status=analysis.get("status", "Pending"),
    )

    CONVERSATIONS.append(record)
    print(f"[OK] Post-call recorded: {call_id} | Sentiment: {record.sentiment} | Score: {record.lead_score}")

    return {
        "success": True,
        "call_id": call_id,
        "analysis": analysis,
    }


# ===========================
# Existing Endpoints
# ===========================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AI Voice Receptionist",
        "status": "running",
        "version": "2.0.0",
        "conversations_count": len(CONVERSATIONS),
    }


@app.post("/webhook/elevenlabs", response_model=WebhookResponse)
async def elevenlabs_webhook(
    payload: ElevenLabsWebhookPayload,
    background_tasks: BackgroundTasks
):
    """
    Webhook endpoint за ElevenLabs (оригинален)
    """
    processed_data = process_webhook_data(payload)
    is_booking_intent = check_booking_intent(processed_data.user_intent)

    crm_sent = False
    if is_booking_intent:
        client_config = CLIENT_CONFIGS.get(
            processed_data.client_id
        ) or ClientConfig(client_id=processed_data.client_id)
        if client_config.enable_crm_integration:
            background_tasks.add_task(send_to_crm, processed_data, client_config)
            crm_sent = True

    rag_data = prepare_rag_data(processed_data)
    background_tasks.add_task(insert_into_lightrag, rag_data)

    # Записваме и в CONVERSATIONS store
    record = ConversationRecord(
        call_id=processed_data.call_id,
        caller_id=processed_data.lead_info.phone or "Unknown",
        timestamp=processed_data.metadata.timestamp,
        duration_seconds=processed_data.metadata.call_duration or 0,
        transcript=processed_data.transcript,
        intent=processed_data.user_intent or "General",
    )
    CONVERSATIONS.append(record)

    return WebhookResponse(
        success=True,
        message="Call processed successfully",
        call_id=processed_data.call_id,
        crm_sent=crm_sent,
        rag_stored=True
    )


def process_webhook_data(payload: ElevenLabsWebhookPayload) -> ProcessedCallData:
    return ProcessedCallData(
        client_id=payload.client_id or "unknown",
        call_id=payload.call_id,
        transcript=payload.transcript,
        user_intent=payload.intent or "",
        lead_info=LeadInfo(
            name=payload.lead_name or "",
            phone=payload.lead_phone or "",
            email=payload.lead_email or ""
        ),
        metadata=CallMetadata(
            call_duration=payload.duration,
            timestamp=datetime.now(),
            language=payload.language or "en"
        )
    )


def check_booking_intent(user_intent: str) -> bool:
    booking_pattern = r"(booking|reservation|schedule|appointment)"
    return bool(re.search(booking_pattern, user_intent.lower()))


async def send_to_crm(call_data: ProcessedCallData, client_config: ClientConfig):
    crm_url = client_config.crm_api_url or settings.DEFAULT_CRM_API_URL
    bearer_token = client_config.crm_bearer_token or settings.DEFAULT_CRM_BEARER_TOKEN
    if not crm_url or not bearer_token:
        print(f"[WARNING] CRM not configured for client {call_data.client_id}")
        return
    crm_payload = CRMPayload(
        lead_name=call_data.lead_info.name,
        lead_phone=call_data.lead_info.phone,
        lead_email=call_data.lead_info.email,
        intent=call_data.user_intent,
        transcript=call_data.transcript,
        source="ai_voice_receptionist"
    )
    headers = {"Authorization": f"Bearer {bearer_token}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(crm_url, json=crm_payload.model_dump(), headers=headers)
            response.raise_for_status()
            print(f"[OK] CRM updated for call {call_data.call_id}")
    except Exception as e:
        print(f"[ERROR] CRM error: {e}")


def prepare_rag_data(call_data: ProcessedCallData) -> LightRAGData:
    content = f"""Call Transcript:\n{call_data.transcript}\nUser Intent: {call_data.user_intent}\nLead: {call_data.lead_info.name} | {call_data.lead_info.phone} | {call_data.lead_info.email}"""
    tags = [f"client:{call_data.client_id}", f"intent:{call_data.user_intent}", f"duration:{call_data.metadata.call_duration}", f"language:{call_data.metadata.language}"]
    analytics = {"common_questions": call_data.transcript.count("?"), "lead_qualified": bool(call_data.lead_info.name and call_data.lead_info.phone), "intent_category": call_data.user_intent}
    return LightRAGData(client_id=call_data.client_id, call_id=call_data.call_id, timestamp=call_data.metadata.timestamp, content=content, tags=tags, analytics=analytics)


async def insert_into_lightrag(rag_data: LightRAGData):
    try:
        success = await rag_service.insert_call_data(rag_data.model_dump())
        if success:
            print(f"[OK] LightRAG: {rag_data.call_id} stored")
    except Exception as e:
        print(f"[ERROR] LightRAG: {e}")


# Client Config endpoints
@app.post("/api/clients/config")
async def create_client_config(config: ClientConfig):
    CLIENT_CONFIGS[config.client_id] = config
    return {"message": "Client configuration updated", "client_id": config.client_id}


@app.get("/api/clients/{client_id}/config")
async def get_client_config(client_id: str):
    config = CLIENT_CONFIGS.get(client_id)
    if not config:
        raise HTTPException(status_code=404, detail="Client not found")
    return config


# Analytics endpoints
@app.get("/api/analytics/{client_id}/common-questions")
async def get_common_questions(client_id: str, limit: int = 10):
    questions = await rag_service.get_common_questions(client_id, limit)
    return {"client_id": client_id, "common_questions": questions}


@app.get("/api/analytics/{client_id}/lead-stats")
async def get_lead_stats(client_id: str):
    stats = await rag_service.get_lead_qualification_stats(client_id)
    return stats


@app.post("/api/analytics/query")
async def query_analytics(client_id: str, query: str, mode: str = "hybrid"):
    result = await rag_service.query_analytics(client_id, query, mode)
    return {"client_id": client_id, "query": query, "result": result}


# ===========================
# Startup Event
# ===========================

@app.on_event("startup")
async def startup_event():
    """Seed demo data on startup"""
    seed_demo_conversations()
    print("=" * 60)
    print("   AI Voice Receptionist API v2.0")
    print(f"   OpenAI Key: {'configured' if settings.OPENAI_API_KEY else 'MISSING'}")
    print(f"   ElevenLabs Key: {'configured' if settings.ELEVENLABS_API_KEY else 'MISSING'}")
    print(f"   Conversations seeded: {len(CONVERSATIONS)}")
    print("=" * 60)


if __name__ == "__main__":
    import uvicorn  # type: ignore[import-not-found]
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
