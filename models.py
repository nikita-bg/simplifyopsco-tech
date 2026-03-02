"""
Pydantic модели за AI Voice Receptionist API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class LeadInfo(BaseModel):
    """Информация за потенциалния клиент (lead)"""
    name: Optional[str] = Field(None, description="Име на клиента")
    phone: Optional[str] = Field(None, description="Телефонен номер")
    email: Optional[str] = Field(None, description="Имейл адрес")


class CallMetadata(BaseModel):
    """Метаданни за обаждането"""
    call_duration: Optional[int] = Field(None, description="Продължителност в секунди")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp на обаждането")
    language: str = Field(default="en", description="Език на разговора")


class ElevenLabsWebhookPayload(BaseModel):
    """Webhook payload от ElevenLabs"""
    client_id: str = Field(default="default", description="Уникален идентификатор на клиента")
    call_id: str = Field(..., description="Уникален идентификатор на обаждането")
    transcript: str = Field(..., description="Транскрипция на разговора")
    intent: Optional[str] = Field(None, description="Разпознат intent от AI")
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    lead_email: Optional[str] = None
    duration: Optional[int] = None
    language: Optional[str] = "en"


class ProcessedCallData(BaseModel):
    """Обработени данни от обаждането"""
    client_id: str
    call_id: str
    transcript: str
    user_intent: str
    lead_info: LeadInfo
    metadata: CallMetadata


class CRMPayload(BaseModel):
    """Payload за изпращане към CRM система"""
    lead_name: Optional[str]
    lead_phone: Optional[str]
    lead_email: Optional[str]
    intent: str
    transcript: str
    source: str = "ai_voice_receptionist"


class LightRAGData(BaseModel):
    """Данни за вмъкване в LightRAG knowledge graph"""
    client_id: str
    call_id: str
    timestamp: datetime
    content: str
    tags: List[str]
    analytics: dict


class WebhookResponse(BaseModel):
    """Отговор на webhook заявката"""
    success: bool
    message: str
    call_id: str
    crm_sent: bool = False
    rag_stored: bool = False


class ClientConfig(BaseModel):
    """Конфигурация за конкретен клиент"""
    client_id: str
    crm_api_url: Optional[str] = None
    crm_bearer_token: Optional[str] = None
    enable_crm_integration: bool = True
    booking_keywords: List[str] = ["booking", "reservation", "schedule", "appointment"]


# ==========================================
# Нови модели за Dynamic Dashboard
# ==========================================

class ConversationRecord(BaseModel):
    """Запис от единичен разговор с AI"""
    call_id: str
    caller_id: str = "Unknown"
    timestamp: datetime = Field(default_factory=datetime.now)
    duration_seconds: int = 0
    transcript: str = ""
    sentiment: str = "Neutral"  # Positive, Neutral, Negative, Very Positive
    lead_score: float = 5.0     # 1.0 - 10.0
    intent: str = "General"     # Sales, Support, Demo, Pricing, General
    status: str = "Pending"     # Qualified, Pending, Rejected


class CallDataPoint(BaseModel):
    """Точка от графиката на обажданията"""
    name: str  # напр. "Mon", "Tue", ...
    calls: int


class IntentDataPoint(BaseModel):
    """Разпределение по intent"""
    name: str
    value: int


class ConversationSummary(BaseModel):
    """Резюме на разговор за таблицата"""
    caller_id: str
    time_ago: str
    duration: str
    sentiment: str
    status: str


class DashboardStats(BaseModel):
    """Пълна статистика за Dashboard-а"""
    total_calls: int = 0
    avg_lead_score: float = 0.0
    conversion_rate: float = 0.0
    call_data: List[CallDataPoint] = []
    intent_data: List[IntentDataPoint] = []
    recent_conversations: List[ConversationSummary] = []


class PostCallPayload(BaseModel):
    """Payload за post-call webhook от ElevenLabs"""
    call_id: str = Field(default="")
    agent_id: Optional[str] = None
    transcript: str = Field(default="")
    caller_id: Optional[str] = None
    duration: Optional[int] = None
    language: Optional[str] = "en"
    # ElevenLabs може да изпрати допълнителни полета
    metadata: Optional[dict] = None
