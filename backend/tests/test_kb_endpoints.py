"""Tests for KB management endpoints: manual CRUD, sync status, sync now, webhook KB rebuild."""
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
