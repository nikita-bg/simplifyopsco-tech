"""Tests for Pydantic models."""
import pytest
from datetime import datetime

from backend.models import (
    StoreInfo,
    StoreSettings,
    ProductInfo,
    ProductRecommendation,
    ConversationRecord,
    ElevenLabsPostCallPayload,
    ShopifyProductWebhook,
    ShopifyGDPRPayload,
    RecommendationRequest,
    CartAddRequest,
    CallDataPoint,
    IntentDataPoint,
    ConversationSummary,
    DashboardStats,
)


class TestStoreModels:
    def test_store_info_defaults(self):
        store = StoreInfo(id="abc", shop_domain="test.myshopify.com")
        assert store.subscription_tier == "trial"
        assert store.settings == {}

    def test_store_settings_defaults(self):
        s = StoreSettings()
        assert s.widget_color == "#6366f1"
        assert s.widget_position == "bottom-right"
        assert s.enabled is True
        assert s.language == "en"

    def test_store_settings_custom(self):
        s = StoreSettings(widget_color="#ff0000", enabled=False, language="bg")
        assert s.widget_color == "#ff0000"
        assert s.enabled is False
        assert s.language == "bg"


class TestProductModels:
    def test_product_info_defaults(self):
        p = ProductInfo(id=1, store_id="store-1", title="T-Shirt")
        assert p.category == "general"
        assert p.tags == []
        assert p.price_min == 0
        assert p.price_max == 0

    def test_product_recommendation(self):
        r = ProductRecommendation(id=1, title="Pants")
        assert r.recommendation_type == "similar"
        assert r.price == 0
        assert r.image == ""


class TestConversationModels:
    def test_conversation_record_defaults(self):
        c = ConversationRecord()
        assert c.intent == "General"
        assert c.sentiment == "Neutral"
        assert c.products_discussed == []
        assert c.duration_seconds == 0

    def test_conversation_summary(self):
        cs = ConversationSummary(session_id="s1", time_ago="5 mins ago", duration="02:30")
        assert cs.sentiment == "Neutral"
        assert cs.products_count == 0


class TestWebhookPayloads:
    def test_elevenlabs_payload_defaults(self):
        p = ElevenLabsPostCallPayload()
        assert p.call_id == ""
        assert p.transcript == ""
        assert p.language == "en"

    def test_elevenlabs_payload_with_data(self):
        p = ElevenLabsPostCallPayload(
            call_id="call-1",
            transcript="Hello",
            store_id="store-1",
            products_discussed=[1, 2, 3],
            cart_actions=[{"action": "add", "product_id": 1}],
        )
        assert p.call_id == "call-1"
        assert len(p.products_discussed) == 3
        assert p.cart_actions[0]["action"] == "add"

    def test_shopify_product_webhook(self):
        p = ShopifyProductWebhook(id=123, title="Test Product")
        assert p.tags is None
        assert p.variants == []

    def test_shopify_gdpr_payload(self):
        g = ShopifyGDPRPayload(shop_domain="test.myshopify.com")
        assert g.shop_id is None
        assert g.customer is None


class TestRequestModels:
    def test_recommendation_request(self):
        r = RecommendationRequest(product_id=1, store_id="s1")
        assert r.limit == 5
        assert r.query is None

    def test_cart_add_request_defaults(self):
        c = CartAddRequest(product_id=1)
        assert c.quantity == 1
        assert c.variant_id is None


class TestDashboardModels:
    def test_dashboard_stats_defaults(self):
        d = DashboardStats()
        assert d.total_conversations == 0
        assert d.add_to_cart_rate == 0.0
        assert d.call_data == []
        assert d.recent_conversations == []

    def test_call_data_point(self):
        c = CallDataPoint(name="Mon", calls=5)
        assert c.name == "Mon"
        assert c.calls == 5

    def test_intent_data_point(self):
        i = IntentDataPoint(name="Buying", value=10)
        assert i.name == "Buying"
        assert i.value == 10
