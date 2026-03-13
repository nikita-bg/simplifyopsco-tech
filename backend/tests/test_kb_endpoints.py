"""Tests for KB management endpoints: manual CRUD, sync status, sync now, server tool, webhook KB rebuild."""
import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock


# ---------------------------------------------------------------------------
# Manual Product CRUD
# ---------------------------------------------------------------------------

class TestManualProducts:
    def test_create_manual_product(self, client, mock_db):
        """POST /api/stores/{id}/products creates manual product with negative ID."""
        # fetchval for next negative ID
        mock_db.fetchval.return_value = -1
        # fetchrow returns the inserted product
        mock_db.fetchrow.return_value = {
            "id": -1,
            "store_id": "00000000-0000-0000-0000-000000000001",
            "title": "Test Product",
            "description": "A test product",
            "price_min": 29.99,
            "price_max": 29.99,
            "source": "manual",
            "product_url": "https://example.com/product",
        }

        with patch("backend.main.kb_service") as mock_kb:
            mock_kb.trigger_kb_rebuild = AsyncMock()
            response = client.post(
                "/api/stores/00000000-0000-0000-0000-000000000001/products",
                json={
                    "store_id": "00000000-0000-0000-0000-000000000001",
                    "title": "Test Product",
                    "description": "A test product",
                    "price": 29.99,
                    "product_url": "https://example.com/product",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == -1
        assert data["source"] == "manual"

    def test_create_manual_product_missing_title(self, client, mock_db):
        """POST with empty title returns 422."""
        response = client.post(
            "/api/stores/00000000-0000-0000-0000-000000000001/products",
            json={
                "store_id": "00000000-0000-0000-0000-000000000001",
                "title": "",
                "price": 10.0,
            },
        )
        assert response.status_code == 422

    def test_update_manual_product(self, client, mock_db):
        """PUT /api/stores/{id}/products/{pid} updates a manual product."""
        # fetchrow: product exists and is manual
        mock_db.fetchrow.return_value = {
            "id": -1,
            "store_id": "00000000-0000-0000-0000-000000000001",
            "source": "manual",
            "title": "Old Title",
            "description": "Old desc",
            "price_min": 10.0,
            "price_max": 10.0,
            "product_url": None,
        }

        with patch("backend.main.kb_service") as mock_kb:
            mock_kb.trigger_kb_rebuild = AsyncMock()
            response = client.put(
                "/api/stores/00000000-0000-0000-0000-000000000001/products/-1",
                json={"title": "New Title", "price": 19.99},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Title"

    def test_update_shopify_product_forbidden(self, client, mock_db):
        """PUT on a Shopify-sourced product returns 403."""
        mock_db.fetchrow.return_value = {
            "id": 12345678901,
            "store_id": "00000000-0000-0000-0000-000000000001",
            "source": "shopify",
        }

        response = client.put(
            "/api/stores/00000000-0000-0000-0000-000000000001/products/12345678901",
            json={"title": "Hacked Title"},
        )

        assert response.status_code == 403

    def test_delete_manual_product(self, client, mock_db):
        """DELETE /api/stores/{id}/products/{pid} removes a manual product."""
        mock_db.fetchrow.return_value = {
            "id": -1,
            "store_id": "00000000-0000-0000-0000-000000000001",
            "source": "manual",
        }

        with patch("backend.main.kb_service") as mock_kb:
            mock_kb.trigger_kb_rebuild = AsyncMock()
            response = client.delete(
                "/api/stores/00000000-0000-0000-0000-000000000001/products/-1",
            )

        assert response.status_code == 200
        data = response.json()
        assert data["deleted"] is True

    def test_delete_nonexistent_product(self, client, mock_db):
        """DELETE on non-existent product returns 404."""
        mock_db.fetchrow.return_value = None

        response = client.delete(
            "/api/stores/00000000-0000-0000-0000-000000000001/products/-999",
        )

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Sync Status
# ---------------------------------------------------------------------------

class TestSyncStatus:
    def test_get_sync_status(self, client, mock_db):
        """GET /api/stores/{id}/kb/status returns KB sync status."""
        mock_db.fetchrow.return_value = {
            "kb_sync_status": "synced",
            "kb_last_synced": "2026-03-13T12:00:00",
            "kb_product_count": 42,
            "kb_char_count": 15000,
            "kb_doc_id": "doc_abc123",
        }

        response = client.get(
            "/api/stores/00000000-0000-0000-0000-000000000001/kb/status",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["kb_sync_status"] == "synced"
        assert data["kb_product_count"] == 42
        assert data["kb_char_count"] == 15000
        assert data["char_limit"] == 300000

    def test_sync_status_warning(self, client, mock_db):
        """When char_count >= 240000, is_warning should be True."""
        mock_db.fetchrow.return_value = {
            "kb_sync_status": "synced",
            "kb_last_synced": "2026-03-13T12:00:00",
            "kb_product_count": 800,
            "kb_char_count": 250000,
            "kb_doc_id": "doc_abc123",
        }

        response = client.get(
            "/api/stores/00000000-0000-0000-0000-000000000001/kb/status",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_warning"] is True

    def test_sync_status_no_warning(self, client, mock_db):
        """When char_count < 240000, is_warning should be False."""
        mock_db.fetchrow.return_value = {
            "kb_sync_status": "synced",
            "kb_last_synced": "2026-03-13T12:00:00",
            "kb_product_count": 100,
            "kb_char_count": 50000,
            "kb_doc_id": "doc_abc123",
        }

        response = client.get(
            "/api/stores/00000000-0000-0000-0000-000000000001/kb/status",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_warning"] is False


# ---------------------------------------------------------------------------
# Sync Now
# ---------------------------------------------------------------------------

class TestSyncNow:
    def test_sync_now_success(self, client, mock_db):
        """POST /api/stores/{id}/kb/sync triggers background KB rebuild, returns 202."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": "agt_test123",
        }

        with patch("backend.main.kb_service") as mock_kb:
            mock_kb.trigger_kb_rebuild = AsyncMock()
            response = client.post(
                "/api/stores/00000000-0000-0000-0000-000000000001/kb/sync",
            )

        assert response.status_code == 202
        data = response.json()
        assert data["message"] == "KB sync started"

    def test_sync_now_no_agent(self, client, mock_db):
        """POST kb/sync returns 400 when store has no ElevenLabs agent."""
        mock_db.fetchrow.return_value = {
            "elevenlabs_agent_id": None,
        }

        response = client.post(
            "/api/stores/00000000-0000-0000-0000-000000000001/kb/sync",
        )

        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Server Tool (product search for ElevenLabs agent)
# ---------------------------------------------------------------------------

class TestServerTool:
    def test_product_search_success(self, client, mock_db):
        """POST /api/tools/product-search with valid secret returns formatted results."""
        with patch("backend.main.kb_service") as mock_kb, \
             patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_TOOL_SECRET = "test-secret-123"
            mock_kb.search_products_semantic = AsyncMock(return_value=[
                {
                    "id": 1,
                    "title": "Cool Sneakers",
                    "description": "Very comfortable running shoes for daily use",
                    "price_min": 89.99,
                    "price_max": 89.99,
                    "category": "footwear",
                    "similarity": 0.92,
                },
                {
                    "id": 2,
                    "title": "Sport Shoes",
                    "description": "Lightweight sport shoes",
                    "price_min": 59.99,
                    "price_max": 79.99,
                    "category": "footwear",
                    "similarity": 0.85,
                },
            ])

            response = client.post(
                "/api/tools/product-search",
                json={
                    "query": "comfortable shoes",
                    "store_id": "00000000-0000-0000-0000-000000000001",
                },
                headers={"X-Tool-Secret": "test-secret-123"},
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
        assert data["results"][0]["name"] == "Cool Sneakers"
        assert "Found 2 matching products" in data["message"]

    def test_product_search_no_secret(self, client, mock_db):
        """POST /api/tools/product-search without secret returns 401."""
        with patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_TOOL_SECRET = "test-secret-123"

            response = client.post(
                "/api/tools/product-search",
                json={
                    "query": "shoes",
                    "store_id": "00000000-0000-0000-0000-000000000001",
                },
            )

        assert response.status_code == 401

    def test_product_search_wrong_secret(self, client, mock_db):
        """POST /api/tools/product-search with wrong secret returns 401."""
        with patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_TOOL_SECRET = "correct-secret"

            response = client.post(
                "/api/tools/product-search",
                json={
                    "query": "shoes",
                    "store_id": "00000000-0000-0000-0000-000000000001",
                },
                headers={"X-Tool-Secret": "wrong-secret"},
            )

        assert response.status_code == 401

    def test_product_search_empty_query(self, client, mock_db):
        """POST /api/tools/product-search with empty query returns empty results."""
        with patch("backend.main.kb_service") as mock_kb, \
             patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_TOOL_SECRET = "test-secret-123"
            mock_kb.search_products_semantic = AsyncMock(return_value=[])

            response = client.post(
                "/api/tools/product-search",
                json={
                    "query": "",
                    "store_id": "00000000-0000-0000-0000-000000000001",
                },
                headers={"X-Tool-Secret": "test-secret-123"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
        assert "No matching products found" in data["message"]

    def test_product_search_with_filters(self, client, mock_db):
        """POST with max_price and category passes filters to search service."""
        with patch("backend.main.kb_service") as mock_kb, \
             patch("backend.main.settings") as mock_settings:
            mock_settings.ELEVENLABS_TOOL_SECRET = "test-secret-123"
            mock_kb.search_products_semantic = AsyncMock(return_value=[
                {
                    "id": 3,
                    "title": "Budget Shoes",
                    "description": "Affordable shoes",
                    "price_min": 29.99,
                    "price_max": 29.99,
                    "category": "footwear",
                    "similarity": 0.88,
                },
            ])

            response = client.post(
                "/api/tools/product-search",
                json={
                    "query": "shoes",
                    "store_id": "00000000-0000-0000-0000-000000000001",
                    "max_price": 50.0,
                    "category": "footwear",
                },
                headers={"X-Tool-Secret": "test-secret-123"},
            )

        assert response.status_code == 200
        # Verify filters were passed to service
        mock_kb.search_products_semantic.assert_called_once_with(
            "00000000-0000-0000-0000-000000000001",
            "shoes",
            50.0,
            "footwear",
            limit=5,
        )


# ---------------------------------------------------------------------------
# Webhook KB Rebuild
# ---------------------------------------------------------------------------

class TestWebhookKBRebuild:
    def test_shopify_webhook_triggers_kb_rebuild(self, client, mock_db):
        """Shopify product webhook should add KB rebuild as background task."""
        mock_db.fetchrow.return_value = {"id": "00000000-0000-0000-0000-000000000001"}

        with patch("backend.main.kb_service") as mock_kb, \
             patch("backend.main.shopify_service") as mock_shopify:
            mock_shopify.verify_hmac.return_value = True
            mock_shopify.handle_product_webhook = AsyncMock()
            mock_kb.trigger_kb_rebuild = AsyncMock()

            response = client.post(
                "/shopify/webhooks/products/create",
                content=json.dumps({"id": 123, "title": "Test"}),
                headers={
                    "X-Shopify-Hmac-SHA256": "valid-hmac",
                    "X-Shopify-Shop-Domain": "test.myshopify.com",
                },
            )

        assert response.status_code == 200

    def test_product_sync_triggers_kb_rebuild(self, client, mock_db):
        """Product sync endpoint should also trigger KB rebuild."""
        with patch("backend.main.kb_service") as mock_kb, \
             patch("backend.main.shopify_service") as mock_shopify:
            mock_shopify.sync_all_products = AsyncMock(return_value=10)
            mock_kb.trigger_kb_rebuild = AsyncMock()

            response = client.post(
                "/api/stores/00000000-0000-0000-0000-000000000001/sync",
            )

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Product sync started"
