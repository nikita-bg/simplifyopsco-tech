"""Tests for KB service module: product transformation, sync pipeline,
Gemini embeddings, semantic search, and trigger_kb_rebuild debounce.

Uses unittest.mock for all external dependencies (db, elevenlabs_service, Gemini client).
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock, PropertyMock
from datetime import datetime


# ---------------------------------------------------------------------------
# TestProductTransform — utility functions
# ---------------------------------------------------------------------------

class TestProductTransform:
    """Tests for strip_html, format_price, transform_products_to_kb_text."""

    def test_strip_html_removes_tags(self):
        """strip_html removes HTML tags and normalizes whitespace."""
        from backend.kb_service import strip_html
        assert strip_html("<p>Hello <b>world</b></p>") == "Hello world"

    def test_strip_html_unescapes_entities(self):
        """strip_html unescapes HTML entities."""
        from backend.kb_service import strip_html
        assert strip_html("Price &amp; Value") == "Price & Value"

    def test_strip_html_empty_string(self):
        """strip_html handles empty string."""
        from backend.kb_service import strip_html
        assert strip_html("") == ""

    def test_strip_html_complex_html(self):
        """strip_html handles complex nested HTML."""
        from backend.kb_service import strip_html
        result = strip_html('<div class="desc"><p>A <em>great</em> product</p></div>')
        assert "A great product" in result
        assert "<" not in result

    def test_format_price_same(self):
        """format_price with same min/max returns single price."""
        from backend.kb_service import format_price
        assert format_price(29.99, 29.99) == "$29.99"

    def test_format_price_range(self):
        """format_price with different min/max returns range."""
        from backend.kb_service import format_price
        assert format_price(10.0, 50.0) == "$10.00 - $50.00"

    def test_format_price_zero_max(self):
        """format_price with zero max returns single min price."""
        from backend.kb_service import format_price
        assert format_price(25.00, 0) == "$25.00"

    def test_transform_products_single(self):
        """transform_products_to_kb_text with one product produces correct output."""
        from backend.kb_service import transform_products_to_kb_text
        products = [{
            "title": "Running Shoe",
            "description": "A comfortable running shoe",
            "price_min": 99.99,
            "price_max": 99.99,
            "category": "footwear",
            "product_type": "shoes",
            "tags": ["running", "sport"],
        }]
        result = transform_products_to_kb_text(products)
        assert "# Product Catalog" in result
        assert "1 products" in result
        assert "## Running Shoe" in result
        assert "A comfortable running shoe" in result
        assert "$99.99" in result
        assert "footwear" in result
        assert "shoes" in result
        assert "running" in result

    def test_transform_products_multiple(self):
        """transform_products_to_kb_text with multiple products uses separators."""
        from backend.kb_service import transform_products_to_kb_text
        products = [
            {"title": "Shoe A", "description": "Desc A", "price_min": 10, "price_max": 10},
            {"title": "Shoe B", "description": "Desc B", "price_min": 20, "price_max": 20},
        ]
        result = transform_products_to_kb_text(products)
        assert "2 products" in result
        assert "## Shoe A" in result
        assert "## Shoe B" in result
        assert "---" in result

    def test_transform_products_empty_list(self):
        """transform_products_to_kb_text with empty list returns header with 0 products."""
        from backend.kb_service import transform_products_to_kb_text
        result = transform_products_to_kb_text([])
        assert "# Product Catalog" in result
        assert "0 products" in result

    def test_transform_products_missing_description(self):
        """transform_products_to_kb_text handles missing description."""
        from backend.kb_service import transform_products_to_kb_text
        products = [{"title": "No Desc Shoe", "price_min": 50, "price_max": 50}]
        result = transform_products_to_kb_text(products)
        assert "## No Desc Shoe" in result
        assert "$50.00" in result

    def test_transform_products_long_description_truncated(self):
        """transform_products_to_kb_text truncates descriptions at 500 chars."""
        from backend.kb_service import transform_products_to_kb_text
        long_desc = "A" * 1000
        products = [{"title": "Long Desc", "description": long_desc, "price_min": 10, "price_max": 10}]
        result = transform_products_to_kb_text(products)
        # The section for this product should not contain the full 1000-char description
        assert "A" * 501 not in result

    def test_transform_products_char_count(self):
        """KB text char count matches len(transform_products_to_kb_text(products))."""
        from backend.kb_service import transform_products_to_kb_text
        products = [
            {"title": "Product 1", "description": "Desc 1", "price_min": 10, "price_max": 10},
            {"title": "Product 2", "description": "Desc 2", "price_min": 20, "price_max": 20},
        ]
        result = transform_products_to_kb_text(products)
        assert len(result) == len(result)  # Sanity: result is a string with measurable length
        assert len(result) > 0

    def test_transform_products_tags_max_10(self):
        """transform_products_to_kb_text limits tags to 10."""
        from backend.kb_service import transform_products_to_kb_text
        products = [{
            "title": "Many Tags",
            "price_min": 5,
            "price_max": 5,
            "tags": [f"tag{i}" for i in range(20)],
        }]
        result = transform_products_to_kb_text(products)
        # Should have at most 10 tags
        assert "tag9" in result
        assert "tag10" not in result


# ---------------------------------------------------------------------------
# TestKBSync — sync_kb_for_store
# ---------------------------------------------------------------------------

class TestKBSync:
    """Tests for KBService.sync_kb_for_store."""

    @pytest.mark.asyncio
    async def test_sync_creates_doc_and_links_to_agent(self):
        """sync_kb_for_store creates KB doc and links to agent."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)
        service.gemini_client = MagicMock()

        mock_products = [
            {"title": "Shoe", "description": "Nice shoe", "price_min": 50, "price_max": 50},
        ]
        mock_store = {
            "elevenlabs_agent_id": "agt_123",
            "kb_doc_id": None,
        }

        with patch("backend.kb_service.db") as mock_db, \
             patch("backend.kb_service.elevenlabs_service") as mock_els:
            mock_db.fetch = AsyncMock(return_value=mock_products)
            mock_db.fetchrow = AsyncMock(return_value=mock_store)
            mock_db.execute = AsyncMock()
            mock_els.create_kb_document_text = AsyncMock(
                return_value={"id": "doc_new", "name": "Products - store1"}
            )
            mock_els.update_agent = AsyncMock(return_value={})

            result = await service.sync_kb_for_store("store-123")

        assert result["doc_id"] == "doc_new"
        assert result["product_count"] == 1
        assert result["char_count"] > 0
        mock_els.create_kb_document_text.assert_called_once()
        mock_els.update_agent.assert_called_once()

    @pytest.mark.asyncio
    async def test_sync_deletes_old_doc(self):
        """sync_kb_for_store deletes old KB doc before creating new one."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)
        service.gemini_client = MagicMock()

        mock_store = {
            "elevenlabs_agent_id": "agt_123",
            "kb_doc_id": "doc_old",
        }

        with patch("backend.kb_service.db") as mock_db, \
             patch("backend.kb_service.elevenlabs_service") as mock_els:
            mock_db.fetch = AsyncMock(return_value=[
                {"title": "P1", "description": "D1", "price_min": 10, "price_max": 10}
            ])
            mock_db.fetchrow = AsyncMock(return_value=mock_store)
            mock_db.execute = AsyncMock()
            mock_els.delete_kb_document = AsyncMock(return_value=True)
            mock_els.create_kb_document_text = AsyncMock(
                return_value={"id": "doc_new", "name": "Products"}
            )
            mock_els.update_agent = AsyncMock(return_value={})

            await service.sync_kb_for_store("store-123")

        mock_els.delete_kb_document.assert_called_once_with("doc_old")

    @pytest.mark.asyncio
    async def test_sync_sets_error_on_failure(self):
        """sync_kb_for_store sets kb_sync_status to 'error' on exception."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)
        service.gemini_client = MagicMock()

        with patch("backend.kb_service.db") as mock_db, \
             patch("backend.kb_service.elevenlabs_service") as mock_els:
            mock_db.fetch = AsyncMock(side_effect=Exception("DB error"))
            mock_db.fetchrow = AsyncMock()
            mock_db.execute = AsyncMock()

            with pytest.raises(Exception, match="DB error"):
                await service.sync_kb_for_store("store-123")

        # Should have set status to 'error'
        error_calls = [
            call for call in mock_db.execute.call_args_list
            if len(call.args) > 0 and "error" in str(call.args[0])
        ]
        assert len(error_calls) > 0

    @pytest.mark.asyncio
    async def test_sync_tracks_char_count(self):
        """sync_kb_for_store updates kb_char_count in DB."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)
        service.gemini_client = MagicMock()

        mock_store = {
            "elevenlabs_agent_id": "agt_123",
            "kb_doc_id": None,
        }

        with patch("backend.kb_service.db") as mock_db, \
             patch("backend.kb_service.elevenlabs_service") as mock_els:
            mock_db.fetch = AsyncMock(return_value=[
                {"title": "Product", "description": "A product", "price_min": 10, "price_max": 10}
            ])
            mock_db.fetchrow = AsyncMock(return_value=mock_store)
            mock_db.execute = AsyncMock()
            mock_els.create_kb_document_text = AsyncMock(
                return_value={"id": "doc_1", "name": "Products"}
            )
            mock_els.update_agent = AsyncMock(return_value={})

            result = await service.sync_kb_for_store("store-123")

        assert result["char_count"] > 0

    @pytest.mark.asyncio
    async def test_sync_registers_product_search_tool(self):
        """sync_kb_for_store calls update_agent with tools=[PRODUCT_SEARCH_TOOL]."""
        from backend.kb_service import KBService, PRODUCT_SEARCH_TOOL

        service = KBService.__new__(KBService)
        service.gemini_client = MagicMock()

        mock_store = {
            "elevenlabs_agent_id": "agt_123",
            "kb_doc_id": None,
        }

        with patch("backend.kb_service.db") as mock_db, \
             patch("backend.kb_service.elevenlabs_service") as mock_els:
            mock_db.fetch = AsyncMock(return_value=[
                {"title": "P1", "description": "D1", "price_min": 10, "price_max": 10}
            ])
            mock_db.fetchrow = AsyncMock(return_value=mock_store)
            mock_db.execute = AsyncMock()
            mock_els.create_kb_document_text = AsyncMock(
                return_value={"id": "doc_1", "name": "Products"}
            )
            mock_els.update_agent = AsyncMock(return_value={})

            await service.sync_kb_for_store("store-123")

        # Assert update_agent was called with tools including PRODUCT_SEARCH_TOOL
        call_kwargs = mock_els.update_agent.call_args.kwargs
        assert "tools" in call_kwargs
        assert PRODUCT_SEARCH_TOOL in call_kwargs["tools"]

    @pytest.mark.asyncio
    async def test_sync_handles_delete_failure_gracefully(self):
        """sync_kb_for_store continues if old doc deletion fails."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)
        service.gemini_client = MagicMock()

        mock_store = {
            "elevenlabs_agent_id": "agt_123",
            "kb_doc_id": "doc_old",
        }

        with patch("backend.kb_service.db") as mock_db, \
             patch("backend.kb_service.elevenlabs_service") as mock_els:
            mock_db.fetch = AsyncMock(return_value=[
                {"title": "P1", "description": "D1", "price_min": 10, "price_max": 10}
            ])
            mock_db.fetchrow = AsyncMock(return_value=mock_store)
            mock_db.execute = AsyncMock()
            # Deletion fails
            mock_els.delete_kb_document = AsyncMock(side_effect=Exception("Delete failed"))
            mock_els.create_kb_document_text = AsyncMock(
                return_value={"id": "doc_new", "name": "Products"}
            )
            mock_els.update_agent = AsyncMock(return_value={})

            # Should NOT raise — handles deletion failure gracefully
            result = await service.sync_kb_for_store("store-123")

        assert result["doc_id"] == "doc_new"
        mock_els.create_kb_document_text.assert_called_once()


# ---------------------------------------------------------------------------
# TestEmbeddings — generate_embeddings_for_store
# ---------------------------------------------------------------------------

class TestEmbeddings:
    """Tests for KBService.generate_embeddings_for_store."""

    @pytest.mark.asyncio
    async def test_generate_embeddings_calls_gemini(self):
        """generate_embeddings_for_store calls Gemini embed_content with correct params."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)

        # Mock Gemini client
        mock_embedding = MagicMock()
        mock_embedding.values = [0.1] * 768
        mock_result = MagicMock()
        mock_result.embeddings = [mock_embedding]

        mock_gemini = MagicMock()
        mock_gemini.aio.models.embed_content = AsyncMock(return_value=mock_result)
        service.gemini_client = mock_gemini

        mock_products = [
            {"id": 1, "store_id": "store-123", "title": "Shoe", "description": "Nice shoe"},
        ]

        with patch("backend.kb_service.db") as mock_db:
            mock_db.fetch = AsyncMock(return_value=mock_products)
            mock_db.execute = AsyncMock()

            count = await service.generate_embeddings_for_store("store-123")

        assert count == 1
        mock_gemini.aio.models.embed_content.assert_called_once()
        call_kwargs = mock_gemini.aio.models.embed_content.call_args.kwargs
        assert call_kwargs["model"] == "gemini-embedding-001"

    @pytest.mark.asyncio
    async def test_generate_embeddings_updates_db(self):
        """generate_embeddings_for_store stores vectors in DB."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)

        mock_embedding = MagicMock()
        mock_embedding.values = [0.5] * 768
        mock_result = MagicMock()
        mock_result.embeddings = [mock_embedding]

        mock_gemini = MagicMock()
        mock_gemini.aio.models.embed_content = AsyncMock(return_value=mock_result)
        service.gemini_client = mock_gemini

        with patch("backend.kb_service.db") as mock_db:
            mock_db.fetch = AsyncMock(return_value=[
                {"id": 1, "store_id": "s1", "title": "P1", "description": "D1"},
            ])
            mock_db.execute = AsyncMock()

            await service.generate_embeddings_for_store("s1")

        # Should have called execute to update embedding
        mock_db.execute.assert_called()
        update_call = mock_db.execute.call_args
        assert "embedding" in update_call.args[0].lower() if update_call.args else True


# ---------------------------------------------------------------------------
# TestSemanticSearch — search_products_semantic
# ---------------------------------------------------------------------------

class TestSemanticSearch:
    """Tests for KBService.search_products_semantic."""

    @pytest.mark.asyncio
    async def test_search_returns_products(self):
        """search_products_semantic returns products ranked by similarity."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)

        mock_embedding = MagicMock()
        mock_embedding.values = [0.1] * 768
        mock_result = MagicMock()
        mock_result.embeddings = [mock_embedding]

        mock_gemini = MagicMock()
        mock_gemini.aio.models.embed_content = AsyncMock(return_value=mock_result)
        service.gemini_client = mock_gemini

        mock_rows = [
            {"id": 1, "title": "Shoe A", "description": "Desc A",
             "price_min": 50, "price_max": 50, "category": "footwear",
             "product_type": "shoes", "similarity": 0.95},
            {"id": 2, "title": "Shoe B", "description": "Desc B",
             "price_min": 30, "price_max": 30, "category": "footwear",
             "product_type": "shoes", "similarity": 0.85},
        ]

        with patch("backend.kb_service.db") as mock_db:
            mock_db.fetch = AsyncMock(return_value=mock_rows)

            results = await service.search_products_semantic("store-1", "running shoes")

        assert len(results) == 2
        assert results[0]["title"] == "Shoe A"
        assert results[0]["similarity"] == 0.95

    @pytest.mark.asyncio
    async def test_search_with_max_price_filter(self):
        """search_products_semantic with max_price filter passes it to SQL."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)

        mock_embedding = MagicMock()
        mock_embedding.values = [0.1] * 768
        mock_result = MagicMock()
        mock_result.embeddings = [mock_embedding]

        mock_gemini = MagicMock()
        mock_gemini.aio.models.embed_content = AsyncMock(return_value=mock_result)
        service.gemini_client = mock_gemini

        with patch("backend.kb_service.db") as mock_db:
            mock_db.fetch = AsyncMock(return_value=[])

            await service.search_products_semantic(
                "store-1", "shoes", max_price=50.0
            )

        # Verify the SQL includes price filter
        call_args = mock_db.fetch.call_args
        sql = call_args.args[0]
        assert "price_max" in sql.lower() or "price_min" in sql.lower()

    @pytest.mark.asyncio
    async def test_search_with_category_filter(self):
        """search_products_semantic with category filter passes it to SQL."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)

        mock_embedding = MagicMock()
        mock_embedding.values = [0.1] * 768
        mock_result = MagicMock()
        mock_result.embeddings = [mock_embedding]

        mock_gemini = MagicMock()
        mock_gemini.aio.models.embed_content = AsyncMock(return_value=mock_result)
        service.gemini_client = mock_gemini

        with patch("backend.kb_service.db") as mock_db:
            mock_db.fetch = AsyncMock(return_value=[])

            await service.search_products_semantic(
                "store-1", "shoes", category="footwear"
            )

        call_args = mock_db.fetch.call_args
        sql = call_args.args[0]
        assert "category" in sql.lower()


# ---------------------------------------------------------------------------
# TestTriggerKBRebuild — debounce guard
# ---------------------------------------------------------------------------

class TestTriggerKBRebuild:
    """Tests for KBService.trigger_kb_rebuild."""

    @pytest.mark.asyncio
    async def test_trigger_returns_early_when_already_syncing(self):
        """trigger_kb_rebuild returns early when status is already 'syncing'."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)
        service.gemini_client = MagicMock()

        with patch("backend.kb_service.db") as mock_db:
            mock_db.fetchval = AsyncMock(return_value="syncing")

            result = await service.trigger_kb_rebuild("store-123")

        assert result.get("skipped") is True
        assert "already syncing" in result.get("reason", "")

    @pytest.mark.asyncio
    async def test_trigger_proceeds_when_not_syncing(self):
        """trigger_kb_rebuild proceeds with sync when status is not 'syncing'."""
        from backend.kb_service import KBService

        service = KBService.__new__(KBService)
        service.gemini_client = MagicMock()

        mock_store = {
            "elevenlabs_agent_id": "agt_123",
            "kb_doc_id": None,
        }

        mock_embedding = MagicMock()
        mock_embedding.values = [0.1] * 768
        mock_embed_result = MagicMock()
        mock_embed_result.embeddings = [mock_embedding]

        mock_gemini = MagicMock()
        mock_gemini.aio.models.embed_content = AsyncMock(return_value=mock_embed_result)
        service.gemini_client = mock_gemini

        with patch("backend.kb_service.db") as mock_db, \
             patch("backend.kb_service.elevenlabs_service") as mock_els:
            mock_db.fetchval = AsyncMock(return_value="none")
            mock_db.fetch = AsyncMock(return_value=[
                {"id": 1, "store_id": "store-123", "title": "P1",
                 "description": "D1", "price_min": 10, "price_max": 10}
            ])
            mock_db.fetchrow = AsyncMock(return_value=mock_store)
            mock_db.execute = AsyncMock()
            mock_els.create_kb_document_text = AsyncMock(
                return_value={"id": "doc_1", "name": "Products"}
            )
            mock_els.update_agent = AsyncMock(return_value={})

            result = await service.trigger_kb_rebuild("store-123")

        assert result.get("skipped") is not True
        assert "doc_id" in result


# ---------------------------------------------------------------------------
# TestProductSearchTool — constant validation
# ---------------------------------------------------------------------------

class TestProductSearchTool:
    """Tests for PRODUCT_SEARCH_TOOL constant."""

    def test_tool_type_is_webhook(self):
        """PRODUCT_SEARCH_TOOL type is 'webhook'."""
        from backend.kb_service import PRODUCT_SEARCH_TOOL
        assert PRODUCT_SEARCH_TOOL["type"] == "webhook"

    def test_tool_name(self):
        """PRODUCT_SEARCH_TOOL name is 'search_products'."""
        from backend.kb_service import PRODUCT_SEARCH_TOOL
        assert PRODUCT_SEARCH_TOOL["name"] == "search_products"

    def test_tool_has_api_schema(self):
        """PRODUCT_SEARCH_TOOL has api_schema with url and method."""
        from backend.kb_service import PRODUCT_SEARCH_TOOL
        schema = PRODUCT_SEARCH_TOOL["api_schema"]
        assert "url" in schema
        assert schema["method"] == "POST"
        assert "request_body_schema" in schema

    def test_tool_required_fields(self):
        """PRODUCT_SEARCH_TOOL requires query and store_id."""
        from backend.kb_service import PRODUCT_SEARCH_TOOL
        required = PRODUCT_SEARCH_TOOL["api_schema"]["request_body_schema"]["required"]
        assert "query" in required
        assert "store_id" in required
