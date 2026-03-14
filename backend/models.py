"""
Pydantic models for AI Voice Shopping Assistant API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ==========================================
# Shopify Store Models
# ==========================================

class StoreInfo(BaseModel):
    """Shopify store information"""
    id: str
    shop_domain: str
    subscription_tier: str = "trial"
    settings: dict = {}
    created_at: datetime = Field(default_factory=datetime.now)


class StoreSettings(BaseModel):
    """Configurable settings for a store's voice widget"""
    widget_color: str = "#6366f1"  # Indigo
    widget_position: str = "bottom-right"  # bottom-right, bottom-left
    voice_id: Optional[str] = None  # ElevenLabs voice ID
    greeting_message: str = "Hi! I can help you find the perfect product. What are you looking for?"
    language: str = "en"
    enabled: bool = True


# ==========================================
# Product Models
# ==========================================

class ProductInfo(BaseModel):
    """Product synced from Shopify"""
    id: int
    store_id: str
    title: str
    description: Optional[str] = None
    product_type: Optional[str] = None
    category: str = "general"
    subcategory: Optional[str] = None
    tags: List[str] = []
    price_min: float = 0
    price_max: float = 0
    images: List[dict] = []


class ProductRecommendation(BaseModel):
    """A product recommendation result"""
    id: int
    title: str
    product_type: Optional[str] = None
    category: Optional[str] = None
    price: float = 0
    price_max: float = 0
    image: str = ""
    recommendation_type: str = "similar"  # similar, complementary, popular, search


# ==========================================
# Conversation Models
# ==========================================

class ConversationRecord(BaseModel):
    """Voice conversation session record"""
    id: str = ""
    store_id: str = ""
    session_id: str = ""
    customer_id: Optional[str] = None
    transcript: str = ""
    intent: str = "General"
    sentiment: str = "Neutral"
    products_discussed: List[int] = []
    products_recommended: List[int] = []
    cart_actions: List[dict] = []
    duration_seconds: int = 0
    started_at: datetime = Field(default_factory=datetime.now)


# ==========================================
# Webhook Payloads
# ==========================================

class ElevenLabsPostCallPayload(BaseModel):
    """Post-call webhook from ElevenLabs Conversational AI"""
    call_id: str = Field(default="")
    agent_id: Optional[str] = None
    transcript: str = Field(default="")
    caller_id: Optional[str] = None
    duration: Optional[int] = None
    language: Optional[str] = "en"
    metadata: Optional[dict] = None
    # Shopping-specific fields
    store_id: Optional[str] = None
    products_discussed: Optional[List[int]] = None
    cart_actions: Optional[List[dict]] = None


class ShopifyProductWebhook(BaseModel):
    """Shopify product webhook payload"""
    id: int
    title: str = ""
    body_html: Optional[str] = None
    vendor: Optional[str] = None
    product_type: Optional[str] = None
    tags: Optional[str] = None
    variants: List[dict] = []
    images: List[dict] = []


class ShopifyGDPRPayload(BaseModel):
    """Shopify mandatory GDPR webhook payload"""
    shop_id: Optional[int] = None
    shop_domain: Optional[str] = None
    customer: Optional[dict] = None
    orders_requested: Optional[List[int]] = None


# ==========================================
# API Request/Response Models
# ==========================================

class RecommendationRequest(BaseModel):
    """Request for product recommendations"""
    product_id: int
    store_id: str
    limit: int = 5
    query: Optional[str] = None  # Natural language filter


class CartAddRequest(BaseModel):
    """Request to add product to cart"""
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1


# ==========================================
# Dashboard Models
# ==========================================

class CallDataPoint(BaseModel):
    """Data point for conversation chart"""
    name: str
    calls: int


class IntentDataPoint(BaseModel):
    """Intent distribution data"""
    name: str
    value: int


class ConversationSummary(BaseModel):
    """Conversation summary for dashboard table"""
    session_id: str = ""
    time_ago: str = ""
    duration: str = ""
    sentiment: str = "Neutral"
    products_count: int = 0
    cart_actions_count: int = 0


class DashboardStats(BaseModel):
    """Complete dashboard statistics"""
    total_conversations: int = 0
    total_products_recommended: int = 0
    add_to_cart_rate: float = 0.0
    conversion_rate: float = 0.0
    call_data: List[CallDataPoint] = []
    intent_data: List[IntentDataPoint] = []
    recent_conversations: List[ConversationSummary] = []


# ==========================================
# Agent System Models
# ==========================================

class AgentTemplateInfo(BaseModel):
    """Agent template configuration from agent_templates table"""
    id: str
    name: str
    type: str  # 'online_store', 'service_business', 'lead_gen'
    description: Optional[str] = None
    conversation_config: dict = {}
    platform_settings: dict = {}
    is_default: bool = False


class AgentCreateRequest(BaseModel):
    """Request to create an ElevenLabs agent for a store"""
    store_id: str
    template_type: str = "online_store"  # Which template to use


class AgentCreateResponse(BaseModel):
    """Response after creating an ElevenLabs agent"""
    agent_id: str
    store_id: str
    agent_status: str


class AgentUpdateRequest(BaseModel):
    """Request to update an agent's configuration"""
    voice_id: Optional[str] = None
    greeting: Optional[str] = None
    language: Optional[str] = None
    system_prompt: Optional[str] = None
    max_duration_seconds: Optional[int] = None


class AgentInfo(BaseModel):
    """Agent information for a store"""
    store_id: str
    elevenlabs_agent_id: Optional[str] = None
    agent_status: str = "none"
    agent_config: dict = {}
    template_type: Optional[str] = None
    minutes_used: int = 0


class AgentDeleteResponse(BaseModel):
    """Response after deleting an agent"""
    store_id: str
    deleted: bool
    message: str


# ==========================================
# Knowledge Base Models
# ==========================================

class KBSyncStatus(BaseModel):
    """Knowledge base sync status for a store"""
    store_id: str
    kb_sync_status: str = "none"
    kb_last_synced: Optional[datetime] = None
    kb_product_count: int = 0
    kb_char_count: int = 0
    kb_doc_id: Optional[str] = None


class ManualProductCreate(BaseModel):
    """Request to create a manual (non-Shopify) product"""
    store_id: str
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    price: float = Field(ge=0)
    product_url: Optional[str] = None


class ManualProductUpdate(BaseModel):
    """Request to update a manual product (all fields optional)"""
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    product_url: Optional[str] = None


class ProductSearchResult(BaseModel):
    """Result from semantic product search"""
    id: int
    title: str
    description: Optional[str] = None
    price_min: float
    price_max: float
    category: Optional[str] = None
    similarity: Optional[float] = None


# ==========================================
# Widget Config Models
# ==========================================

class WidgetConfigResponse(BaseModel):
    """Widget initialization config returned to embed.js"""
    has_agent: bool = False
    enabled: bool = False
    agent_id: Optional[str] = None
    widget_color: str = "#256af4"
    widget_position: str = "bottom-right"
    greeting_message: Optional[str] = None
    status: str = "unknown"


# ==========================================
# Agent Configuration Models
# ==========================================

class VoiceOption(BaseModel):
    """Curated ElevenLabs voice option."""
    id: str
    name: str
    preview_url: str
    gender: str
    accent: str
    description: str


class PersonalityPreset(BaseModel):
    """Personality preset with system prompt template."""
    id: str
    name: str
    description: str
    system_prompt: str


class LanguageOption(BaseModel):
    """Supported language for voice agent."""
    code: str
    name: str


class AgentConfigResponse(BaseModel):
    """Full agent configuration response."""
    voice_id: Optional[str] = None
    voice_name: Optional[str] = None
    greeting: str
    widget_color: str
    widget_position: str
    enabled: bool
    language: str
    personality_preset: Optional[str] = None
    agent_status: str


class AgentConfigUpdate(BaseModel):
    """Partial agent configuration update (all fields optional)."""
    voice_id: Optional[str] = None
    greeting: Optional[str] = None
    widget_color: Optional[str] = None
    widget_position: Optional[str] = None
    enabled: Optional[bool] = None
    language: Optional[str] = None
    personality_preset: Optional[str] = None


class EmbedCodeResponse(BaseModel):
    """Embed code snippet response."""
    embed_code: str
    store_id: str

