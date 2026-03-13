"""
Knowledge Base Service — Product transformation, ElevenLabs KB sync,
Gemini embeddings, and pgvector semantic search.

Orchestrates the full KB pipeline:
  products -> natural language text -> ElevenLabs KB document -> agent link
  products -> Gemini embeddings -> pgvector storage -> semantic search
"""
import logging
import re
import html as html_module
from typing import Any, Optional

from google import genai  # type: ignore[import-not-found]
from google.genai import types  # type: ignore[import-not-found]

from backend.config import settings  # type: ignore[import]
from backend.database import db  # type: ignore[import]
from backend.elevenlabs_service import elevenlabs_service  # type: ignore[import]

logger = logging.getLogger("simplifyops.kb")


# ---------------------------------------------------------------------------
# Server Tool Constant — registered on each agent during KB sync
# ---------------------------------------------------------------------------

PRODUCT_SEARCH_TOOL: dict[str, Any] = {
    "type": "webhook",
    "name": "search_products",
    "description": (
        "Search for products in the store's catalog. Use this when the customer "
        "asks for specific products by name, category, price range, or other attributes. "
        "Returns matching products with names, prices, and descriptions."
    ),
    "api_schema": {
        "url": f"{settings.SHOPIFY_APP_URL}/api/tools/product-search",
        "method": "POST",
        "request_body_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language search query for products",
                },
                "store_id": {
                    "type": "string",
                    "description": "The store identifier",
                },
                "max_price": {
                    "type": "number",
                    "description": "Maximum price filter (optional)",
                },
                "category": {
                    "type": "string",
                    "description": "Product category filter (optional)",
                },
            },
            "required": ["query", "store_id"],
        },
    },
}


# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------

def strip_html(raw: str) -> str:
    """Remove HTML tags and unescape entities.

    Suitable for cleaning Shopify body_html product descriptions.
    """
    if not raw:
        return ""
    clean = re.sub(r"<[^>]+>", " ", raw)
    clean = html_module.unescape(clean)
    return " ".join(clean.split())  # Normalize whitespace


def format_price(price_min: float, price_max: float) -> str:
    """Format a price or price range for natural language output."""
    if price_min == price_max or price_max == 0:
        return f"${price_min:.2f}"
    return f"${price_min:.2f} - ${price_max:.2f}"


def transform_products_to_kb_text(products: list[dict]) -> str:
    """Transform product records into natural language optimized for RAG.

    ElevenLabs RAG best practices:
    - Use descriptive headings per product
    - Write in prose paragraphs, not tables/CSV
    - Keep each section focused on one product
    - Include all searchable attributes in natural language
    """
    sections = []
    for p in products:
        desc = strip_html(p.get("description", "") or "")
        price = format_price(
            float(p.get("price_min", 0)),
            float(p.get("price_max", 0)),
        )

        lines = [f"## {p['title']}"]
        if desc:
            # Truncate very long descriptions to preserve char budget
            lines.append(desc[:500])
        lines.append(f"This product is priced at {price}.")
        if p.get("category") and p["category"] != "general":
            lines.append(f"It belongs to the {p['category']} category.")
        if p.get("product_type"):
            lines.append(f"Product type: {p['product_type']}.")
        if p.get("tags"):
            tags = p["tags"] if isinstance(p["tags"], list) else []
            if tags:
                lines.append(f"Related tags: {', '.join(tags[:10])}.")

        sections.append("\n".join(lines))

    header = (
        f"# Product Catalog\n\n"
        f"This store offers {len(products)} products. "
        f"Below is detailed information about each product.\n\n"
    )
    return header + "\n\n---\n\n".join(sections)


# ---------------------------------------------------------------------------
# KBService Class
# ---------------------------------------------------------------------------

class KBService:
    """Knowledge base sync, embedding generation, and semantic search."""

    def __init__(self) -> None:
        self._gemini_client: Optional[genai.Client] = None

    @property
    def gemini_client(self) -> genai.Client:
        """Lazily initialize Gemini client (avoids import-time API key validation)."""
        if self._gemini_client is None:
            self._gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        return self._gemini_client

    @gemini_client.setter
    def gemini_client(self, value: Any) -> None:
        """Allow setting gemini_client directly (used in tests)."""
        self._gemini_client = value

    async def sync_kb_for_store(self, store_id: str) -> dict[str, Any]:
        """Full KB sync pipeline for a store.

        Steps:
          a. Set kb_sync_status = 'syncing'
          b. Fetch all products
          c. Transform to KB text
          d. Calculate char_count
          e. Get store's current kb_doc_id and agent_id
          f. Delete old KB doc (graceful failure)
          g. Create new KB doc
          h. Link doc to agent AND register server tool
          i. Update DB tracking columns
          j. On error: set status to 'error', re-raise
        """
        # a. Set status to syncing
        await db.execute(
            "UPDATE stores SET kb_sync_status = 'syncing' WHERE id = $1::uuid",
            store_id,
        )

        try:
            # b. Fetch all products for store
            products = await db.fetch(
                "SELECT * FROM products WHERE store_id = $1::uuid", store_id
            )

            # c. Transform to natural language
            kb_text = transform_products_to_kb_text(
                [dict(p) if not isinstance(p, dict) else p for p in products]
            )

            # d. Calculate char count
            char_count = len(kb_text)

            # e. Get store's current KB doc ID and agent ID
            store = await db.fetchrow(
                "SELECT elevenlabs_agent_id, kb_doc_id FROM stores WHERE id = $1::uuid",
                store_id,
            )

            # f. Delete old KB doc if it exists (handle failure gracefully)
            if store and store.get("kb_doc_id"):
                try:
                    await elevenlabs_service.delete_kb_document(store["kb_doc_id"])
                except Exception as e:
                    logger.warning(
                        f"Failed to delete old KB doc {store['kb_doc_id']}: {e}"
                    )

            # g. Create new KB document
            doc = await elevenlabs_service.create_kb_document_text(
                text=kb_text,
                name=f"Products - {store_id}",
            )

            # h. Link doc to agent AND register server tool
            if store and store.get("elevenlabs_agent_id"):
                await elevenlabs_service.update_agent(
                    agent_id=store["elevenlabs_agent_id"],
                    conversation_config={
                        "agent": {
                            "prompt": {
                                "knowledge_base": [
                                    {
                                        "type": "text",
                                        "id": doc["id"],
                                        "name": doc["name"],
                                        "usage_mode": "auto",
                                    }
                                ]
                            }
                        }
                    },
                    tools=[PRODUCT_SEARCH_TOOL],
                )

            # i. Update tracking columns
            await db.execute(
                """UPDATE stores SET
                    kb_doc_id = $1, kb_char_count = $2,
                    kb_product_count = $3, kb_last_synced = NOW(),
                    kb_sync_status = 'synced'
                   WHERE id = $4::uuid""",
                doc["id"],
                char_count,
                len(products),
                store_id,
            )

            return {
                "doc_id": doc["id"],
                "char_count": char_count,
                "product_count": len(products),
            }

        except Exception as e:
            # j. Set status to error on failure
            try:
                await db.execute(
                    "UPDATE stores SET kb_sync_status = 'error' WHERE id = $1::uuid",
                    store_id,
                )
            except Exception:
                logger.error(f"Failed to set error status for store {store_id}")
            logger.error(f"KB sync failed for {store_id}: {e}")
            raise

    async def generate_embeddings_for_store(self, store_id: str) -> int:
        """Generate Gemini embeddings for all products in a store.

        Returns the count of products embedded.
        """
        # Fetch products for the store
        products = await db.fetch(
            "SELECT id, store_id, title, description FROM products WHERE store_id = $1::uuid",
            store_id,
        )

        if not products:
            return 0

        count = 0
        # Batch in groups of 100
        batch_size = 100
        for i in range(0, len(products), batch_size):
            batch = products[i : i + batch_size]
            texts = [
                f"{p['title']}. {strip_html(p.get('description', '') or '')}"
                for p in batch
            ]

            # Generate embeddings using async Gemini client
            result = await self.gemini_client.aio.models.embed_content(
                model="gemini-embedding-001",
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=768,
                ),
            )

            # Store each embedding in DB
            for j, emb in enumerate(result.embeddings):
                product = batch[j]
                vec = emb.values
                await db.execute(
                    "UPDATE products SET embedding = $1 WHERE id = $2 AND store_id = $3::uuid",
                    str(vec),
                    product["id"],
                    product["store_id"] if isinstance(product["store_id"], str) else str(product["store_id"]),
                )
                count += 1

        return count

    async def search_products_semantic(
        self,
        store_id: str,
        query: str,
        max_price: Optional[float] = None,
        category: Optional[str] = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Semantic product search using pgvector cosine similarity.

        Returns products ranked by similarity to the query.
        """
        # Generate query embedding
        result = await self.gemini_client.aio.models.embed_content(
            model="gemini-embedding-001",
            contents=query,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=768,
            ),
        )
        query_vec = result.embeddings[0].values

        # Build SQL with optional filters
        conditions = ["store_id = $1::uuid", "embedding IS NOT NULL"]
        params: list[Any] = [store_id]
        param_idx = 2

        if max_price is not None:
            conditions.append(f"price_max <= ${param_idx}")
            params.append(max_price)
            param_idx += 1

        if category is not None:
            conditions.append(f"category = ${param_idx}")
            params.append(category)
            param_idx += 1

        where_clause = " AND ".join(conditions)

        # Add vector parameter
        params.append(str(query_vec))
        vec_param = f"${param_idx}"
        param_idx += 1

        params.append(limit)
        limit_param = f"${param_idx}"

        sql = f"""
            SELECT id, title, description, price_min, price_max,
                   category, product_type,
                   1 - (embedding <=> {vec_param}::vector) as similarity
            FROM products
            WHERE {where_clause}
            ORDER BY embedding <=> {vec_param}::vector
            LIMIT {limit_param}
        """

        rows = await db.fetch(sql, *params)
        return [dict(r) if not isinstance(r, dict) else r for r in rows]

    async def trigger_kb_rebuild(self, store_id: str) -> dict[str, Any]:
        """Trigger a full KB rebuild with debounce guard.

        Returns early if a sync is already in progress for this store.
        """
        # Debounce guard: check current status
        current_status = await db.fetchval(
            "SELECT kb_sync_status FROM stores WHERE id = $1::uuid",
            store_id,
        )

        if current_status == "syncing":
            logger.warning(f"KB rebuild skipped for {store_id}: already syncing")
            return {"skipped": True, "reason": "already syncing"}

        # Proceed with sync and embeddings
        sync_result = await self.sync_kb_for_store(store_id)
        embed_count = await self.generate_embeddings_for_store(store_id)

        return {
            **sync_result,
            "embeddings_generated": embed_count,
        }


# Singleton
kb_service = KBService()
