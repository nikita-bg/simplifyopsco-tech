# Phase 2: Knowledge Base - Research

**Researched:** 2026-03-13
**Domain:** ElevenLabs Knowledge Base API + Gemini Embeddings + pgvector + Product Sync Pipeline
**Confidence:** HIGH

## Summary

Phase 2 transforms the per-merchant ElevenLabs agents (built in Phase 1) from empty shells into product-knowledgeable sales assistants. The core challenge is a two-pipeline architecture: (1) an ElevenLabs Knowledge Base pipeline that uploads natural-language product documents for the agent's built-in RAG system, and (2) a pgvector embeddings pipeline that enables precision product search via ElevenLabs server tools (webhooks). These are complementary -- the KB gives the agent general product knowledge, while the server tool gives it structured search capability (e.g., "find me red shoes under $50").

The ElevenLabs Knowledge Base API is straightforward: create a text document via `POST /v1/convai/knowledge-base/text`, get back a `document_id`, then PATCH the agent's `conversation_config.agent.prompt.knowledge_base` array with that document's locator. The critical constraint is the **300k character / 20MB limit** for non-enterprise accounts. For a typical product (~300 chars in natural language format), this caps at ~1,000 products per merchant -- sufficient for most Shopify stores but needs monitoring and smart formatting. RAG mode is recommended for catalogs over ~500 bytes (practically all real stores), adding ~500ms latency but enabling much larger effective knowledge.

For pgvector embeddings, the project should use **Gemini `gemini-embedding-001`** (text-only, free tier available, $0.15/MTok paid) with **768 dimensions** instead of the current OpenAI `text-embedding-3-small` at 1536 dimensions. This requires a migration to change the vector column from `VECTOR(1536)` to `VECTOR(768)` plus enabling the HNSW index. The `google-genai` SDK v1.65.0 is already installed in the project's virtualenv.

**Primary recommendation:** Build a `backend/kb_service.py` service module that orchestrates the full sync pipeline: fetch products from DB, transform to natural language, upload to ElevenLabs KB API as a single text document per store, and update the agent. A separate embedding pipeline in the same service uses Gemini to generate embeddings stored in pgvector. Register a server tool (webhook) on each agent pointing to a new `/api/tools/product-search` endpoint for precision queries.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KB-01 | Shopify products auto-sync to ElevenLabs agent knowledge base (webhook-driven) | ElevenLabs KB text API (`POST /v1/convai/knowledge-base/text`) + agent PATCH to link document. Existing Shopify webhook handler in `main.py:202` already handles product create/update/delete -- extend to trigger KB rebuild. |
| KB-02 | Products transformed to natural language format for optimal RAG retrieval | ElevenLabs RAG best practices: break into focused sections, use descriptive headings, avoid tables/CSV. Transform each product to a prose paragraph with title, description, price, category, URL. |
| KB-03 | Knowledge base character count tracked per merchant (300k limit warning at 80%) | ElevenLabs limit is 300k chars / 20MB for non-enterprise. Track char count in `stores.kb_char_count`. Warning threshold at 240k chars. `GET /v1/convai/agent/{agent_id}/knowledge-base/size` returns page count but not chars directly -- track locally. |
| KB-04 | Manual product add/edit for non-Shopify merchants (name, description, price, URL) | New `manual_products` table or reuse existing `products` table with `source = 'manual'` flag. CRUD endpoints + frontend dashboard page. On save, trigger KB rebuild. |
| KB-05 | Sync status visible in dashboard (last synced, product count, health badge) | New columns on `stores`: `kb_last_synced`, `kb_product_count`, `kb_char_count`, `kb_sync_status`. Frontend dashboard component reads via existing store API pattern. |
| KB-06 | Manual "Sync Now" button for immediate re-sync | Existing `POST /api/stores/{store_id}/sync` endpoint syncs products from Shopify. Extend to also rebuild ElevenLabs KB document after product sync completes. |
| KB-07 | pgvector embeddings for precision product search via server tools | Gemini `gemini-embedding-001` at 768 dims (free tier). HNSW index on `products.embedding`. ElevenLabs server tool (webhook) pointing to `POST /api/tools/product-search` endpoint that queries pgvector. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | 0.28.1 | HTTP client for ElevenLabs KB API calls | Already installed; async support; consistent with Phase 1 pattern |
| google-genai | 1.65.0 | Gemini embedding generation | Already installed in project venv; free tier for embeddings |
| asyncpg | 0.31.0 | PostgreSQL async driver for pgvector queries | Already installed; used by `database.py` singleton |
| pgvector (Python) | 0.3.x | Register vector type with asyncpg + numpy helpers | Needed for proper vector type handling with asyncpg |
| numpy | latest | Vector array handling for pgvector inserts | Required by pgvector Python package |
| pydantic | 2.12.5 | Request/response models for KB endpoints | Already installed |
| FastAPI | 0.135.1 | Web framework for new KB endpoints | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| re (stdlib) | - | Strip HTML from Shopify `body_html` product descriptions | Product transformation to natural language |
| html (stdlib) | - | Unescape HTML entities in product descriptions | Product transformation |
| json (stdlib) | - | Serialize/deserialize KB configs and agent patches | Throughout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Gemini `gemini-embedding-001` (768d) | OpenAI `text-embedding-3-small` (1536d) | OpenAI is more mature but costs $0.02/MTok vs free/cheap Gemini. 768d is sufficient for product search. OpenAI already has key in project but Gemini SDK already installed. |
| Single text document per store | One document per product | Single document is simpler, avoids hitting document count limits, easier to rebuild atomically. Per-product requires managing hundreds of document IDs. |
| Server tool webhook for product search | Relying solely on ElevenLabs RAG | RAG alone cannot do structured queries (price ranges, categories). Server tool enables SQL-backed precision search. |
| `gemini-embedding-001` (text-only) | `gemini-embedding-2-preview` (multimodal) | Text-only is cheaper ($0.15 vs $0.20/MTok), more stable (GA vs preview), and product data is text-only. No benefit from multimodal. |

**Installation:**
```bash
pip install pgvector numpy
# google-genai already installed (v1.65.0)
# httpx already installed (v0.28.1)
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
  kb_service.py              # NEW: Knowledge base sync + embedding pipeline
  elevenlabs_service.py      # EXTEND: Add KB document CRUD + agent KB link methods
  shopify_service.py          # EXISTING: Product sync (no changes needed)
  main.py                     # EXTEND: Add KB management endpoints + server tool endpoint
  models.py                   # EXTEND: Add KB-related Pydantic models
  database.py                 # EXTEND: Register pgvector type on pool init
  config.py                   # EXTEND: Add GOOGLE_API_KEY setting
frontend/
  src/app/dashboard/
    knowledge-base/
      page.tsx                # NEW: KB management dashboard page
migrations/
  004_knowledge_base.sql      # NEW: KB tracking columns, vector dimension change, HNSW index
```

### Pattern 1: Single-Document Knowledge Base Strategy
**What:** Each merchant gets ONE text document in ElevenLabs KB containing ALL their products formatted as natural language prose. On any product change, the entire document is rebuilt and re-uploaded.
**When to use:** All KB sync operations (initial sync, webhook-triggered updates, manual sync).
**Why:** Simpler than managing per-product documents. Atomic updates (no partial state). Avoids document count limits. ElevenLabs RAG chunks the document internally.
**Example:**
```python
# Source: ElevenLabs KB best practices + project patterns
def transform_products_to_kb_text(products: list[dict]) -> str:
    """Transform product records into natural language for ElevenLabs RAG."""
    sections = []
    for p in products:
        # Strip HTML from description
        description = strip_html(p.get("description", ""))
        price_str = format_price(p["price_min"], p["price_max"])

        section = (
            f"## {p['title']}\n"
            f"{description}\n"
            f"Price: {price_str}\n"
            f"Category: {p.get('category', 'general')}\n"
        )
        if p.get("tags"):
            section += f"Tags: {', '.join(p['tags'])}\n"
        if p.get("product_type"):
            section += f"Type: {p['product_type']}\n"
        sections.append(section)

    header = f"# Product Catalog\nThis store has {len(products)} products.\n\n"
    return header + "\n---\n\n".join(sections)
```

### Pattern 2: ElevenLabs KB Document Lifecycle
**What:** Create document, link to agent, track document ID. On update, delete old document, create new one, re-link.
**When to use:** Every time the product catalog changes.
**Example:**
```python
# Source: ElevenLabs API docs
async def sync_kb_for_store(store_id: str):
    """Full KB sync pipeline for a store."""
    # 1. Fetch all products for store
    products = await db.fetch(
        "SELECT * FROM products WHERE store_id = $1", store_id
    )

    # 2. Transform to natural language
    kb_text = transform_products_to_kb_text(products)
    char_count = len(kb_text)

    # 3. Get store's current KB document ID and agent ID
    store = await db.fetchrow(
        "SELECT elevenlabs_agent_id, kb_doc_id FROM stores WHERE id = $1::uuid",
        store_id,
    )

    # 4. Delete old document if exists
    if store["kb_doc_id"]:
        await elevenlabs_service.delete_kb_document(store["kb_doc_id"])

    # 5. Create new document
    doc = await elevenlabs_service.create_kb_document_text(
        text=kb_text,
        name=f"Products - {store_id}",
    )

    # 6. Link document to agent
    await elevenlabs_service.update_agent(
        agent_id=store["elevenlabs_agent_id"],
        conversation_config={
            "agent": {
                "prompt": {
                    "knowledge_base": [{
                        "type": "text",
                        "id": doc["id"],
                        "name": doc["name"],
                        "usage_mode": "auto",  # RAG mode
                    }]
                }
            }
        },
    )

    # 7. Update tracking columns
    await db.execute(
        """UPDATE stores SET
            kb_doc_id = $1, kb_char_count = $2,
            kb_product_count = $3, kb_last_synced = NOW(),
            kb_sync_status = 'synced'
           WHERE id = $4::uuid""",
        doc["id"], char_count, len(products), store_id,
    )
```

### Pattern 3: Gemini Embedding + pgvector Integration
**What:** Generate embeddings using Gemini API, store in pgvector, query with cosine similarity for precision product search.
**When to use:** KB-07 -- when the agent needs structured search results (price filter, category filter, semantic similarity).
**Example:**
```python
# Source: google-genai docs + pgvector-python docs
from google import genai
from google.genai import types

gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)

async def generate_embedding(text: str) -> list[float]:
    """Generate 768-dim embedding using Gemini."""
    result = gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768,
        ),
    )
    return result.embeddings[0].values

async def search_products_by_embedding(
    store_id: str, query: str, limit: int = 5
) -> list[dict]:
    """Semantic product search using pgvector cosine similarity."""
    # Generate query embedding
    query_result = gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=query,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768,
        ),
    )
    query_vec = query_result.embeddings[0].values

    # Query pgvector with cosine distance
    rows = await db.fetch(
        """SELECT id, title, description, price_min, price_max,
                  category, product_type, images,
                  1 - (embedding <=> $1::vector) as similarity
           FROM products
           WHERE store_id = $2 AND embedding IS NOT NULL
           ORDER BY embedding <=> $1::vector
           LIMIT $3""",
        str(query_vec), store_id, limit,
    )
    return [dict(r) for r in rows]
```

### Pattern 4: ElevenLabs Server Tool for Product Search
**What:** Register a webhook-type tool on the agent that calls back to our FastAPI endpoint for precision product search. The agent invokes this tool when users ask for specific products.
**When to use:** KB-07 -- enables the agent to perform structured queries beyond RAG.
**Example:**
```python
# Tool configuration added when creating/updating agent
PRODUCT_SEARCH_TOOL = {
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
                    "description": "Natural language search query for products"
                },
                "store_id": {
                    "type": "string",
                    "description": "The store identifier"
                },
                "max_price": {
                    "type": "number",
                    "description": "Maximum price filter (optional)"
                },
                "category": {
                    "type": "string",
                    "description": "Product category filter (optional)"
                },
            },
            "required": ["query", "store_id"],
        },
    },
}
```

### Pattern 5: Async KB Rebuild with Status Tracking
**What:** KB rebuild runs as a background task with status tracking so the dashboard can show progress.
**When to use:** All sync operations (Shopify webhook, manual sync button, initial sync).
**Example:**
```python
# Source: FastAPI BackgroundTasks pattern from existing codebase
async def trigger_kb_rebuild(store_id: str):
    """Mark sync as in-progress, then rebuild in background."""
    await db.execute(
        "UPDATE stores SET kb_sync_status = 'syncing' WHERE id = $1::uuid",
        store_id,
    )
    try:
        await sync_kb_for_store(store_id)
    except Exception as e:
        await db.execute(
            "UPDATE stores SET kb_sync_status = 'error' WHERE id = $1::uuid",
            store_id,
        )
        SecurityLogger.log(f"KB sync failed for {store_id}: {e}", "ERROR")
        raise
```

### Anti-Patterns to Avoid
- **One document per product:** Creates hundreds of ElevenLabs KB documents per store. Hard to manage, harder to rebuild atomically, may hit document limits. Use one consolidated document per store.
- **Raw JSON/CSV in KB text:** ElevenLabs RAG best practices explicitly warn against tables and CSV. RAG cannot reliably extract structured data. Use natural language prose with clear headings.
- **Synchronous KB rebuild in request handler:** KB rebuild involves fetching products, transforming text, uploading to ElevenLabs, patching agent -- this can take 10+ seconds. Always use `BackgroundTasks`.
- **Storing embedding vectors as strings:** Use `pgvector` Python package to register proper vector type with asyncpg. Raw string casting loses precision.
- **Embedding the HTML description directly:** Shopify `body_html` contains tags, styles, etc. Strip HTML first, then embed the clean text.
- **Using `usage_mode: "prompt"` for large catalogs:** This forces the entire document into the system prompt context window. Use `"auto"` (RAG) for any catalog over a few products.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML stripping from Shopify descriptions | Regex-based HTML stripper | Python `re.sub(r'<[^>]+>', '', html)` + `html.unescape()` | Simple two-liner covers 99% of cases for product descriptions |
| Embedding generation | Custom embedding model or API wrapper | `google-genai` SDK `embed_content()` | Already installed, handles batching, retries, auth |
| Vector similarity search | Custom cosine distance calculation | pgvector `<=>` operator + HNSW index | Battle-tested, orders of magnitude faster than application-level search |
| KB character counting | Manually counting after upload | Track `len(kb_text)` before upload, store in DB | ElevenLabs size endpoint returns pages not chars; local tracking is more useful |
| Product text formatting | Template engine (Jinja2, etc.) | Simple Python f-strings | Product format is fixed and simple; a template engine adds unnecessary dependency |
| RAG chunking | Custom text chunking logic | ElevenLabs built-in RAG indexing | ElevenLabs handles chunking, indexing, and retrieval internally when RAG is enabled |

**Key insight:** The complexity in this phase is not in any single API call -- it is in orchestrating the pipeline correctly: products change -> rebuild KB text -> upload to ElevenLabs -> link to agent -> generate embeddings -> store in pgvector. Each step can fail independently and the system must handle partial failures gracefully.

## Common Pitfalls

### Pitfall 1: ElevenLabs KB Document ID Not Linked to Agent
**What goes wrong:** A new KB document is created via `POST /v1/convai/knowledge-base/text` but the developer forgets to PATCH the agent with the document's locator in `conversation_config.agent.prompt.knowledge_base`.
**Why it happens:** The ElevenLabs KB API creates documents in a shared workspace, not per-agent. Documents must be explicitly linked to agents.
**How to avoid:** The KB sync pipeline MUST always: (1) create document, (2) PATCH agent with document locator, (3) verify the agent's knowledge_base includes the new document ID.
**Warning signs:** Agent cannot answer product questions despite KB document existing in the workspace.

### Pitfall 2: 300k Character Limit Exceeded Silently
**What goes wrong:** A merchant with a large catalog (1000+ products) hits the 300k character limit. The upload fails or content is truncated without clear feedback.
**Why it happens:** 300k chars / ~300 chars per product = ~1,000 products max. Stores with rich descriptions or many variants can hit this sooner.
**How to avoid:** Track `kb_char_count` per store. Warn at 80% (240k chars). When limit is hit, prioritize products (most popular, in-stock only) and truncate descriptions. Show clear dashboard warnings.
**Warning signs:** `kb_char_count` approaching 240k; API errors on document creation.

### Pitfall 3: Vector Dimension Mismatch
**What goes wrong:** Existing `products.embedding` column is `VECTOR(1536)` (OpenAI dimensions). Inserting Gemini 768-dim vectors fails or produces wrong results.
**Why it happens:** Phase 1 schema created `embedding VECTOR(1536)` for OpenAI. Switching to Gemini requires schema change.
**How to avoid:** Migration 004 must: (1) drop the HNSW index if it exists, (2) ALTER the column to `VECTOR(768)`, (3) recreate the HNSW index with correct dimensions.
**Warning signs:** `ERROR: expected 1536 dimensions, not 768` on insert.

### Pitfall 4: Shopify Webhook Triggers KB Rebuild Too Frequently
**What goes wrong:** A merchant bulk-updates 100 products. Each update triggers a Shopify webhook, which triggers a KB rebuild. The backend fires 100 concurrent KB rebuilds.
**Why it happens:** Shopify sends individual webhooks for each product operation.
**How to avoid:** Debounce KB rebuilds. When a product webhook arrives, set a "rebuild pending" flag and schedule a rebuild after a 30-60 second delay. If another webhook arrives during the delay, reset the timer. Only one rebuild runs at a time per store.
**Warning signs:** ElevenLabs rate limiting errors; multiple concurrent rebuilds for the same store.

### Pitfall 5: pgvector Not Registered with asyncpg Connection Pool
**What goes wrong:** Querying pgvector vectors returns raw binary data instead of Python lists/numpy arrays.
**Why it happens:** asyncpg does not natively understand the `vector` type. The `pgvector` Python package provides `register_vector()` to teach asyncpg how to encode/decode vectors.
**How to avoid:** Call `register_vector(conn)` on every connection acquired from the pool. Best approach: use the pool's `init` callback to register on each new connection.
**Warning signs:** `UndefinedType: cannot adapt type 'list'` errors; garbled binary data returned from vector queries.

### Pitfall 6: Gemini Embedding API Sync vs Async Mismatch
**What goes wrong:** The `google-genai` SDK's `embed_content()` method is synchronous by default, blocking the FastAPI async event loop.
**Why it happens:** The genai client uses `requests` (sync HTTP) under the hood.
**How to avoid:** Use `asyncio.to_thread()` to run embedding generation in a thread pool, or use the async client variant if available: `client.aio.models.embed_content()`.
**Warning signs:** Slow response times; event loop warnings; requests stacking up during embedding generation.

### Pitfall 7: Old KB Document Not Deleted Before New One Created
**What goes wrong:** Each sync creates a new document but doesn't delete the old one. Over time, the workspace accumulates hundreds of orphaned documents.
**Why it happens:** Create-before-delete pattern without cleanup.
**How to avoid:** Always delete the old document (using `kb_doc_id` stored in the store record) before creating the new one. Handle deletion failures gracefully (log and continue -- the old doc may have been manually deleted).
**Warning signs:** ElevenLabs dashboard shows many orphaned documents; workspace storage filling up.

## Code Examples

### ElevenLabs KB Service Extension
```python
# Source: ElevenLabs KB API docs
# Add to elevenlabs_service.py

async def create_kb_document_text(
    self, text: str, name: str
) -> dict[str, Any]:
    """Create a knowledge base document from text."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{self.BASE_URL.replace('/convai', '')}/v1/convai/knowledge-base/text",
            json={"text": text, "name": name},
            headers=self._headers(),
        )
        response.raise_for_status()
        return response.json()  # {"id": "doc_xxx", "name": "..."}

async def delete_kb_document(self, doc_id: str) -> bool:
    """Delete a knowledge base document."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.delete(
            f"{self.BASE_URL.replace('/convai', '')}/v1/convai/knowledge-base/{doc_id}",
            params={"force": True},
            headers=self._headers(),
        )
        return response.status_code == 200

async def get_kb_document(self, doc_id: str) -> dict[str, Any]:
    """Get knowledge base document metadata."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{self.BASE_URL.replace('/convai', '')}/v1/convai/knowledge-base/{doc_id}",
            headers=self._headers(),
        )
        response.raise_for_status()
        return response.json()
```

### Product Text Transformation (RAG-Optimized)
```python
# Source: ElevenLabs RAG best practices
import re
import html as html_module

def strip_html(raw: str) -> str:
    """Remove HTML tags and unescape entities."""
    clean = re.sub(r'<[^>]+>', ' ', raw)
    clean = html_module.unescape(clean)
    return ' '.join(clean.split())  # Normalize whitespace

def format_price(price_min: float, price_max: float) -> str:
    """Format price range for natural language."""
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
```

### Register pgvector with asyncpg Pool
```python
# Source: pgvector-python docs + Neon best practices
# Modify database.py connect() method

from pgvector.asyncpg import register_vector

async def connect(self) -> None:
    """Create connection pool with pgvector support."""
    # ... existing DSN setup ...

    async def init_connection(conn):
        """Register pgvector type on each new connection."""
        await register_vector(conn)

    self.pool = await asyncpg.create_pool(
        dsn=dsn,
        ssl='require',
        min_size=2,
        max_size=10,
        command_timeout=30,
        statement_cache_size=0,
        init=init_connection,  # Register pgvector on each connection
    )
```

### Server Tool Endpoint for Agent Product Search
```python
# Source: ElevenLabs server tools docs + project patterns
# Add to main.py

@app.post("/api/tools/product-search")
async def agent_product_search(request: Request):
    """Server tool endpoint called by ElevenLabs agent during conversation.

    This endpoint is called by the agent's webhook tool when a customer
    asks about specific products. Returns structured product data that
    the agent reads back to the customer.
    """
    body = await request.json()
    query = body.get("query", "")
    store_id = body.get("store_id", "")
    max_price = body.get("max_price")
    category = body.get("category")

    if not query or not store_id:
        return {"results": [], "message": "No products found."}

    # Semantic search via pgvector
    results = await kb_service.search_products_semantic(
        store_id=store_id,
        query=query,
        max_price=max_price,
        category=category,
        limit=5,
    )

    if not results:
        return {"results": [], "message": "No matching products found."}

    # Format for agent consumption
    formatted = []
    for r in results:
        formatted.append({
            "name": r["title"],
            "price": format_price(r["price_min"], r["price_max"]),
            "description": strip_html(r.get("description", ""))[:200],
            "category": r.get("category", ""),
        })

    return {
        "results": formatted,
        "message": f"Found {len(formatted)} matching products.",
    }
```

## ElevenLabs Knowledge Base API Reference

### Endpoints Used in This Phase

| Operation | Method | URL | Key Fields |
|-----------|--------|-----|------------|
| Create KB Document (text) | POST | `/v1/convai/knowledge-base/text` | `text`, `name` -> returns `{id, name}` |
| Delete KB Document | DELETE | `/v1/convai/knowledge-base/{documentation_id}` | `force=true` to remove from agents |
| Get KB Document | GET | `/v1/convai/knowledge-base/{documentation_id}` | Returns metadata + `type`, `size_bytes` |
| List KB Documents | GET | `/v1/convai/knowledge-base` | `page_size`, `search`, `types`, cursor pagination |
| Get KB Size | GET | `/v1/convai/agent/{agent_id}/knowledge-base/size` | Returns `{number_of_pages}` |
| Compute RAG Index | POST | `/v1/convai/knowledge-base/{documentation_id}/rag-index` | `model` (e5_mistral, multilingual_e5, qwen3) |
| Link KB to Agent | PATCH | `/v1/convai/agents/{agent_id}` | `conversation_config.agent.prompt.knowledge_base[]` |

### Knowledge Base Locator Structure (for Agent PATCH)
```json
{
  "type": "text",
  "id": "doc_abc123",
  "name": "Products - store-uuid",
  "usage_mode": "auto"
}
```

- `usage_mode: "auto"` = RAG mode (recommended for catalogs). Agent retrieves relevant chunks on demand.
- `usage_mode: "prompt"` = Always injected into system prompt. Use only for very small documents (< 500 bytes).

### Knowledge Base Limits
| Tier | Character Limit | File Size Limit | RAG Index Limit |
|------|----------------|-----------------|-----------------|
| Free | 300,000 chars | 20 MB | 1 MB |
| Business/Enterprise | Higher | Higher | Up to 1 GB |

**RAG Requirements:**
- Minimum document size for RAG: 500 bytes
- RAG adds ~500ms latency to responses
- RAG embedding models: `e5_mistral_7b_instruct`, `multilingual_e5_large_instruct`, `qwen3_embedding_4b`
- RAG indexing is automatic when document is added to RAG-enabled agent

### Server Tool (Webhook) Structure
```json
{
  "type": "webhook",
  "name": "search_products",
  "description": "Search for products by name, category, or attributes",
  "api_schema": {
    "url": "https://your-backend.railway.app/api/tools/product-search",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "properties": {
        "query": {"type": "string", "description": "Search query"},
        "store_id": {"type": "string", "description": "Store ID"},
        "max_price": {"type": "number", "description": "Max price filter"},
        "category": {"type": "string", "description": "Category filter"}
      },
      "required": ["query", "store_id"]
    }
  }
}
```

## Gemini Embedding Reference

### Model Selection
| Model | Dimensions | Pricing (Free) | Pricing (Paid) | Status |
|-------|-----------|-----------------|----------------|--------|
| `gemini-embedding-001` | 768 (default 3072, configurable) | Free | $0.15/MTok | GA |
| `gemini-embedding-2-preview` | 768 (default 3072, configurable) | Free | $0.20/MTok | Preview |
| `text-embedding-004` | 768 | Free | Deprecated Jan 2026 | Deprecated |

**Recommendation:** Use `gemini-embedding-001` with `output_dimensionality=768` for cost efficiency and storage optimization.

### Task Types for Product Search
- `RETRIEVAL_DOCUMENT` -- when embedding product catalog entries
- `RETRIEVAL_QUERY` -- when embedding user search queries
- Using different task types for documents vs queries improves retrieval quality

### Batch Embedding
```python
# Batch embed all products for a store
texts = [f"{p['title']}. {strip_html(p['description'])}" for p in products]
result = gemini_client.models.embed_content(
    model="gemini-embedding-001",
    contents=texts,
    config=types.EmbedContentConfig(
        task_type="RETRIEVAL_DOCUMENT",
        output_dimensionality=768,
    ),
)
# result.embeddings is a list of embedding objects
```

## State of the Art

| Old Approach (Current Codebase) | New Approach (Phase 2) | Impact |
|--------------------------------|------------------------|--------|
| No product knowledge in agent | Per-store KB document with RAG | Agent can answer "what products do you have?" |
| No embeddings generated | Gemini 768-dim embeddings in pgvector | Semantic product search |
| ILIKE text search only | pgvector cosine similarity + HNSW | Sub-10ms semantic search at scale |
| `VECTOR(1536)` column (OpenAI) | `VECTOR(768)` column (Gemini) | 50% storage savings, cheaper embeddings |
| No sync status tracking | `kb_sync_status`, `kb_last_synced`, `kb_char_count` | Dashboard shows sync health |
| Webhook only syncs to `products` table | Webhook triggers KB rebuild + embedding generation | Agent knowledge stays current |
| No structured product search for agent | Server tool webhook for precision queries | Agent can filter by price, category |
| HNSW index commented out | HNSW index active with cosine ops | Fast approximate nearest neighbor search |

**Deprecated/outdated:**
- `products.embedding VECTOR(1536)`: Will be altered to `VECTOR(768)` for Gemini embeddings
- Text-only `ILIKE` product search: Supplemented (not replaced) by semantic pgvector search

## Database Schema Changes

### Migration 004: Knowledge Base Infrastructure
```sql
-- Knowledge base tracking columns on stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_char_count INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_product_count INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_last_synced TIMESTAMP;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_sync_status VARCHAR(50) DEFAULT 'none';

-- Change embedding dimension from 1536 (OpenAI) to 768 (Gemini)
-- Drop HNSW index if it exists (it's commented out in 001 but be safe)
DROP INDEX IF EXISTS idx_products_embedding;
-- Alter column dimension
ALTER TABLE products ALTER COLUMN embedding TYPE VECTOR(768);

-- Create HNSW index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_products_embedding
    ON products USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Index for KB sync status lookups
CREATE INDEX IF NOT EXISTS idx_stores_kb_status ON stores(kb_sync_status);

-- Manual products support: add source column to distinguish Shopify vs manual
ALTER TABLE products ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'shopify';
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_url TEXT;

-- Record migration
INSERT INTO applied_migrations (filename) VALUES ('004_knowledge_base.sql')
ON CONFLICT (filename) DO NOTHING;
```

### Target `stores` Table (After Migration 004)
```sql
stores (
    -- Existing columns
    id UUID PRIMARY KEY,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token_encrypted TEXT, owner_id UUID,
    subscription_tier, stripe_customer_id, stripe_subscription_id,
    settings JSONB, created_at, updated_at,
    -- Phase 1 agent columns
    elevenlabs_agent_id, agent_status, agent_template_id,
    kb_doc_id, agent_config JSONB,
    minutes_used, billing_period_start, daily_conversation_count,
    -- NEW Phase 2 KB tracking columns
    kb_char_count INTEGER DEFAULT 0,
    kb_product_count INTEGER DEFAULT 0,
    kb_last_synced TIMESTAMP,
    kb_sync_status VARCHAR(50) DEFAULT 'none'  -- none, syncing, synced, error
)
```

### Target `products` Table (After Migration 004)
```sql
products (
    id BIGINT NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id),
    title TEXT NOT NULL, description TEXT,
    product_type VARCHAR(255), category VARCHAR(100),
    subcategory VARCHAR(100), tags TEXT[],
    price_min DECIMAL(10,2), price_max DECIMAL(10,2),
    images JSONB, synced_at TIMESTAMP,
    -- CHANGED: embedding dimension
    embedding VECTOR(768),         -- Was VECTOR(1536), now Gemini 768-dim
    -- NEW columns
    source VARCHAR(50) DEFAULT 'shopify',  -- 'shopify' or 'manual'
    product_url TEXT,                       -- Product page URL
    PRIMARY KEY (id, store_id)
)
```

## Open Questions

1. **Manual Product ID Generation for Non-Shopify Merchants**
   - What we know: The `products` table uses `id BIGINT` (Shopify product IDs are large integers). Non-Shopify manual products need IDs too.
   - What's unclear: Should manual product IDs use a separate sequence, negative IDs, or UUIDs?
   - Recommendation: Use a PostgreSQL sequence starting at 1 for manual products. Shopify IDs are in the billions range, so there's no collision risk. Add `source` column to distinguish.

2. **Embedding Generation Timing**
   - What we know: Gemini `embed_content()` is synchronous in the default client. Generating embeddings for 500 products takes ~30 seconds.
   - What's unclear: Should embeddings be generated during KB sync or as a separate background job?
   - Recommendation: Generate embeddings in the same background task as KB sync, using `client.aio.models.embed_content()` (async variant) or `asyncio.to_thread()`. Batch products in groups of 100 to avoid timeouts.

3. **Server Tool Authentication**
   - What we know: The `/api/tools/product-search` endpoint will be called by ElevenLabs servers. It needs authentication to prevent abuse.
   - What's unclear: Best authentication method for ElevenLabs server tool callbacks.
   - Recommendation: Use a shared secret in a custom header. Store the secret in ElevenLabs tool config and verify it in the endpoint. Simpler than OAuth for a same-system webhook.

4. **RAG Index Model Selection**
   - What we know: ElevenLabs offers 3 RAG index models: `e5_mistral_7b_instruct`, `multilingual_e5_large_instruct`, `qwen3_embedding_4b`.
   - What's unclear: Which model performs best for product catalog retrieval.
   - Recommendation: Use `multilingual_e5_large_instruct` for its multilingual support (important for international stores). The RAG indexing happens server-side at ElevenLabs and is automatic -- no cost to us.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (already installed) |
| Config file | None (uses default discovery; conftest.py in `backend/tests/`) |
| Quick run command | `cd backend && python -m pytest tests/ -x -q` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KB-01 | Shopify webhook triggers KB rebuild | unit | `cd backend && python -m pytest tests/test_kb_service.py::TestShopifySync -x` | No - Wave 0 |
| KB-02 | Products transformed to natural language | unit | `cd backend && python -m pytest tests/test_kb_service.py::TestProductTransform -x` | No - Wave 0 |
| KB-03 | Character count tracked, 80% warning | unit | `cd backend && python -m pytest tests/test_kb_service.py::TestCharTracking -x` | No - Wave 0 |
| KB-04 | Manual product CRUD | unit | `cd backend && python -m pytest tests/test_kb_endpoints.py::TestManualProducts -x` | No - Wave 0 |
| KB-05 | Sync status in dashboard API | unit | `cd backend && python -m pytest tests/test_kb_endpoints.py::TestSyncStatus -x` | No - Wave 0 |
| KB-06 | Sync Now button triggers rebuild | unit | `cd backend && python -m pytest tests/test_kb_endpoints.py::TestSyncNow -x` | No - Wave 0 |
| KB-07 | pgvector search via server tool | unit | `cd backend && python -m pytest tests/test_kb_service.py::TestSemanticSearch -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/ -x -q`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_kb_service.py` -- covers KB-01, KB-02, KB-03, KB-07 (mocked ElevenLabs + Gemini API calls)
- [ ] `tests/test_kb_endpoints.py` -- covers KB-04, KB-05, KB-06 (API endpoint tests for KB management)
- [ ] `pip install pgvector numpy` -- required for vector type registration
- [ ] `GOOGLE_API_KEY` env var in conftest.py test defaults

## Sources

### Primary (HIGH confidence)
- [ElevenLabs KB Text API](https://elevenlabs.io/docs/eleven-agents/api-reference/knowledge-base/create-from-text) - POST endpoint for creating text documents
- [ElevenLabs Agent Update API](https://elevenlabs.io/docs/api-reference/agents/update) - PATCH endpoint with `knowledge_base` locator structure
- [ElevenLabs KB Delete API](https://elevenlabs.io/docs/api-reference/knowledge-base/delete) - DELETE endpoint with `force` parameter
- [ElevenLabs KB List API](https://elevenlabs.io/docs/api-reference/knowledge-base/list) - GET with cursor pagination
- [ElevenLabs KB Size API](https://elevenlabs.io/docs/api-reference/knowledge-base/size) - GET agent KB size (pages)
- [ElevenLabs RAG Compute Index](https://elevenlabs.io/docs/api-reference/knowledge-base/compute-rag-index) - POST to trigger RAG indexing
- [ElevenLabs Server Tools](https://elevenlabs.io/docs/agents-platform/customization/tools/server-tools) - Webhook tool configuration
- [ElevenLabs Agent Create API](https://elevenlabs.io/docs/api-reference/agents/create) - Full schema showing tools + knowledge_base structure
- [Gemini Embeddings Guide](https://ai.google.dev/gemini-api/docs/embeddings) - SDK usage, dimensions, task types
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) - Free tier + paid pricing for embeddings
- [pgvector Python README](https://github.com/pgvector/pgvector-python) - asyncpg registration, insert/query patterns
- [Neon pgvector Extension](https://neon.com/docs/extensions/pgvector) - HNSW index, vector_cosine_ops
- Existing codebase: `backend/elevenlabs_service.py`, `backend/shopify_service.py`, `backend/main.py`, `migrations/001_shopify_schema.sql`

### Secondary (MEDIUM confidence)
- [ElevenLabs RAG Documentation](https://elevenlabs.io/docs/eleven-agents/customization/knowledge-base/rag) - RAG best practices, document formatting, usage_mode
- [ElevenLabs KB Best Practices Blog](https://elevenlabs.io/blog/deploying-enterprise-knowledge-to-voice-agents) - Enterprise KB patterns
- [Neon pgvector Optimization](https://neon.com/docs/ai/ai-vector-search-optimization) - HNSW tuning parameters
- [Gemini Embedding GA Blog](https://developers.googleblog.com/gemini-embedding-available-gemini-api/) - Model comparison, MRL training

### Tertiary (LOW confidence)
- Server tool authentication patterns: No official ElevenLabs docs on best auth method for webhook callbacks. Shared secret is inferred from general webhook patterns.
- Gemini embedding batch limits: Free tier rate limits not explicitly documented. Assumed sufficient for product catalogs of < 5,000 items.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - google-genai already installed, pgvector well-documented, ElevenLabs KB API verified
- Architecture: HIGH - single-document-per-store strategy validated against ElevenLabs best practices
- ElevenLabs KB API: HIGH - all endpoints verified against official API docs, locator structure confirmed
- Gemini Embeddings: HIGH - SDK usage verified, pricing confirmed, model GA
- pgvector integration: MEDIUM - asyncpg registration pattern from docs, but not yet tested in this project
- Server tools: MEDIUM - configuration structure verified from create agent schema, but authentication patterns inferred
- Pitfalls: HIGH - derived from API limits (300k chars), dimension mismatch risk, and webhook debouncing needs

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (ElevenLabs KB API stable; Gemini embedding-001 is GA; pgvector stable)
