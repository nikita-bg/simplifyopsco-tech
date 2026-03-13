"""RED phase tests for Task 1: KB foundation layer.

Tests:
- ElevenLabsService KB methods (create_kb_document_text, delete_kb_document, get_kb_document)
- update_agent supports tools parameter
- Config has GOOGLE_API_KEY and ELEVENLABS_TOOL_SECRET
- Database registers pgvector on pool init
- Pydantic models for KB operations
- Migration file exists with correct SQL
"""
import os
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from backend.elevenlabs_service import ElevenLabsService


def _make_mock_client(response_data=None, status_code=200, raise_for_status=None):
    """Build a mock httpx.AsyncClient context manager."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = response_data or {}

    if raise_for_status:
        mock_response.raise_for_status.side_effect = raise_for_status
    else:
        mock_response.raise_for_status.return_value = None

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.patch = AsyncMock(return_value=mock_response)
    mock_client.delete = AsyncMock(return_value=mock_response)
    return mock_client, mock_response


# ---------------------------------------------------------------------------
# ElevenLabs KB Document Methods
# ---------------------------------------------------------------------------

class TestCreateKBDocumentText:
    """Tests for elevenlabs_service.create_kb_document_text"""

    @pytest.mark.asyncio
    async def test_create_kb_document_text_success(self):
        """POST to knowledge-base/text returns doc id and name."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(
            response_data={"id": "doc_abc123", "name": "Products - store1"}
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.create_kb_document_text(
                text="# Product Catalog\n## Shoe\nA nice shoe.",
                name="Products - store1",
            )

        assert result["id"] == "doc_abc123"
        assert result["name"] == "Products - store1"
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "knowledge-base/text" in call_args[0][0]
        payload = call_args.kwargs.get("json") or call_args[1].get("json", {})
        assert payload["text"] == "# Product Catalog\n## Shoe\nA nice shoe."
        assert payload["name"] == "Products - store1"

    @pytest.mark.asyncio
    async def test_create_kb_document_text_timeout(self):
        """create_kb_document_text uses 60s timeout for large docs."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(response_data={"id": "doc_123"})

        with patch("httpx.AsyncClient", return_value=mock_client) as mock_cls:
            await service.create_kb_document_text(text="big text", name="test")

        # Verify the timeout was set to 60.0
        mock_cls.assert_called_once()
        call_kwargs = mock_cls.call_args
        timeout = call_kwargs.kwargs.get("timeout") or call_kwargs[1].get("timeout")
        assert timeout == 60.0


class TestDeleteKBDocument:
    """Tests for elevenlabs_service.delete_kb_document"""

    @pytest.mark.asyncio
    async def test_delete_kb_document_success(self):
        """DELETE returns True on 200."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(status_code=200)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.delete_kb_document("doc_to_delete")

        assert result is True
        mock_client.delete.assert_called_once()
        call_args = mock_client.delete.call_args
        assert "knowledge-base/doc_to_delete" in call_args[0][0]
        params = call_args.kwargs.get("params") or call_args[1].get("params", {})
        assert params.get("force") is True

    @pytest.mark.asyncio
    async def test_delete_kb_document_not_found(self):
        """DELETE returns False on 404."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(status_code=404)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.delete_kb_document("doc_nonexistent")

        assert result is False


class TestGetKBDocument:
    """Tests for elevenlabs_service.get_kb_document"""

    @pytest.mark.asyncio
    async def test_get_kb_document_success(self):
        """GET returns document metadata dict."""
        service = ElevenLabsService()
        doc_data = {"id": "doc_789", "name": "Products", "type": "text", "size_bytes": 5000}
        mock_client, _ = _make_mock_client(response_data=doc_data)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.get_kb_document("doc_789")

        assert result["id"] == "doc_789"
        assert result["type"] == "text"
        mock_client.get.assert_called_once()
        assert "knowledge-base/doc_789" in mock_client.get.call_args[0][0]


class TestUpdateAgentWithTools:
    """Tests for update_agent supporting tools parameter."""

    @pytest.mark.asyncio
    async def test_update_agent_with_tools(self):
        """PATCH includes tools in payload when provided."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(response_data={"agent_id": "agt_tools"})
        tools = [{"type": "webhook", "name": "search_products"}]

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await service.update_agent(
                "agt_tools",
                conversation_config={"agent": {}},
                tools=tools,
            )

        call_kwargs = mock_client.patch.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json", {})
        assert "tools" in payload
        assert payload["tools"] == tools

    @pytest.mark.asyncio
    async def test_update_agent_without_tools(self):
        """PATCH does not include tools when not provided."""
        service = ElevenLabsService()
        mock_client, _ = _make_mock_client(response_data={"agent_id": "agt_no_tools"})

        with patch("httpx.AsyncClient", return_value=mock_client):
            await service.update_agent("agt_no_tools", name="Updated")

        call_kwargs = mock_client.patch.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json", {})
        assert "tools" not in payload


# ---------------------------------------------------------------------------
# Config Extensions
# ---------------------------------------------------------------------------

class TestConfigExtensions:
    """Tests for new config fields."""

    def test_google_api_key_exists(self):
        """Settings has GOOGLE_API_KEY field."""
        from backend.config import Settings
        s = Settings(GOOGLE_API_KEY="test-key")
        assert s.GOOGLE_API_KEY == "test-key"

    def test_google_api_key_default_none(self):
        """GOOGLE_API_KEY defaults to None."""
        from backend.config import Settings
        s = Settings()
        assert s.GOOGLE_API_KEY is None

    def test_elevenlabs_tool_secret_exists(self):
        """Settings has ELEVENLABS_TOOL_SECRET field."""
        from backend.config import Settings
        s = Settings(ELEVENLABS_TOOL_SECRET="tool-secret-123")
        assert s.ELEVENLABS_TOOL_SECRET == "tool-secret-123"

    def test_elevenlabs_tool_secret_default_none(self):
        """ELEVENLABS_TOOL_SECRET defaults to None."""
        from backend.config import Settings
        s = Settings()
        assert s.ELEVENLABS_TOOL_SECRET is None


# ---------------------------------------------------------------------------
# Database pgvector Registration
# ---------------------------------------------------------------------------

class TestDatabasePgvector:
    """Tests for pgvector registration in Database.connect()."""

    def test_database_imports_register_vector(self):
        """database module can import register_vector from pgvector.asyncpg."""
        from pgvector.asyncpg import register_vector
        assert callable(register_vector)

    @pytest.mark.asyncio
    async def test_connect_passes_init_callback(self):
        """Database.connect() passes init callback to create_pool."""
        from backend.database import Database

        db = Database()
        mock_pool = AsyncMock()

        with patch("backend.database.settings") as mock_settings:
            mock_settings.DATABASE_URL = "postgresql://user:pass@host/db?sslmode=require"
            with patch("asyncpg.create_pool", new_callable=AsyncMock, return_value=mock_pool) as mock_create:
                await db.connect()

        # Verify create_pool was called with init kwarg
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args.kwargs
        assert "init" in call_kwargs
        assert callable(call_kwargs["init"])


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class TestKBPydanticModels:
    """Tests for new KB-related Pydantic models."""

    def test_kb_sync_status_model(self):
        """KBSyncStatus model has correct fields and defaults."""
        from backend.models import KBSyncStatus
        status = KBSyncStatus(store_id="store-123")
        assert status.store_id == "store-123"
        assert status.kb_sync_status == "none"
        assert status.kb_last_synced is None
        assert status.kb_product_count == 0
        assert status.kb_char_count == 0
        assert status.kb_doc_id is None

    def test_manual_product_create_model(self):
        """ManualProductCreate model validates fields."""
        from backend.models import ManualProductCreate
        product = ManualProductCreate(
            store_id="store-123",
            title="Test Product",
            price=29.99,
        )
        assert product.store_id == "store-123"
        assert product.title == "Test Product"
        assert product.price == 29.99
        assert product.description is None
        assert product.product_url is None

    def test_manual_product_create_validation(self):
        """ManualProductCreate rejects invalid data."""
        from backend.models import ManualProductCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            ManualProductCreate(store_id="s", title="", price=29.99)  # title too short

        with pytest.raises(ValidationError):
            ManualProductCreate(store_id="s", title="Valid", price=-1)  # negative price

    def test_manual_product_update_model(self):
        """ManualProductUpdate model has all optional fields."""
        from backend.models import ManualProductUpdate
        update = ManualProductUpdate()
        assert update.title is None
        assert update.description is None
        assert update.price is None
        assert update.product_url is None

    def test_product_search_result_model(self):
        """ProductSearchResult model has correct fields."""
        from backend.models import ProductSearchResult
        result = ProductSearchResult(
            id=1,
            title="Nice Shoe",
            price_min=29.99,
            price_max=49.99,
        )
        assert result.id == 1
        assert result.title == "Nice Shoe"
        assert result.description is None
        assert result.price_min == 29.99
        assert result.price_max == 49.99
        assert result.category is None
        assert result.similarity is None


# ---------------------------------------------------------------------------
# Migration File
# ---------------------------------------------------------------------------

class TestMigrationFile:
    """Tests for migration 004_knowledge_base.sql."""

    def test_migration_file_exists(self):
        """Migration file exists."""
        migration_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "migrations", "004_knowledge_base.sql"
        )
        assert os.path.exists(migration_path), f"Missing: {migration_path}"

    def test_migration_has_kb_columns(self):
        """Migration adds KB tracking columns to stores."""
        migration_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "migrations", "004_knowledge_base.sql"
        )
        with open(migration_path) as f:
            sql = f.read()
        assert "kb_char_count" in sql
        assert "kb_product_count" in sql
        assert "kb_last_synced" in sql
        assert "kb_sync_status" in sql

    def test_migration_has_vector_768(self):
        """Migration changes embedding to VECTOR(768)."""
        migration_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "migrations", "004_knowledge_base.sql"
        )
        with open(migration_path) as f:
            sql = f.read()
        assert "VECTOR(768)" in sql

    def test_migration_has_hnsw_index(self):
        """Migration creates HNSW index with vector_cosine_ops."""
        migration_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "migrations", "004_knowledge_base.sql"
        )
        with open(migration_path) as f:
            sql = f.read()
        assert "hnsw" in sql.lower()
        assert "vector_cosine_ops" in sql

    def test_migration_has_source_column(self):
        """Migration adds source and product_url columns to products."""
        migration_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "migrations", "004_knowledge_base.sql"
        )
        with open(migration_path) as f:
            sql = f.read()
        assert "source" in sql
        assert "product_url" in sql
