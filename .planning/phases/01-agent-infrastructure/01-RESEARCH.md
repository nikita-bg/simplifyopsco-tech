# Phase 1: Agent Infrastructure - Research

**Researched:** 2026-03-13
**Domain:** ElevenLabs Conversational AI Agent API + Neon PostgreSQL schema migrations
**Confidence:** HIGH

## Summary

Phase 1 transforms SimplifyOps from a single-agent prototype (one global `ELEVENLABS_AGENT_ID` in env vars) into a multi-tenant system where each merchant store has its own isolated ElevenLabs agent. The existing backend already uses `httpx` for raw HTTP calls to ElevenLabs (signed URL endpoint), and the database layer uses `asyncpg` with raw SQL queries against Neon PostgreSQL. There is no ORM and no migration framework -- the project uses a single `migrations/001_shopify_schema.sql` file applied manually.

The ElevenLabs Conversational AI API provides full CRUD endpoints for agents: `POST /v1/convai/agents/create`, `PATCH /v1/convai/agents/{agent_id}`, `GET /v1/convai/agents/{agent_id}`, and `DELETE /v1/convai/agents/{agent_id}`. Each agent is configured with a `conversation_config` object containing ASR, TTS (voice), turn detection, conversation limits (`max_duration_seconds`), and an `agent` sub-object with `first_message`, `language`, and a `prompt` (system prompt + LLM config). Guardrails are set via `platform_settings.guardrails` with built-in types (prompt injection, content, focus) plus custom guardrail rules.

**Primary recommendation:** Use raw `httpx` calls (not the ElevenLabs Python SDK) for agent CRUD to stay consistent with the existing codebase pattern, minimize dependencies, and maintain full control over request/response handling. Create a dedicated `backend/elevenlabs_service.py` service module following the same singleton pattern as `shopify_service.py`. For DB migrations, continue the raw SQL migration file approach with numbered files in `migrations/`, adding an `applied_migrations` tracking table.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGT-01 | Each merchant gets their own ElevenLabs agent on signup (via Agent Create API) | ElevenLabs `POST /v1/convai/agents/create` endpoint documented with full schema; use `httpx` wrapper in `elevenlabs_service.py` |
| AGT-02 | Agent can be updated (voice, greeting, personality) via Agent Update API | ElevenLabs `PATCH /v1/convai/agents/{agent_id}` endpoint documented; partial update supported |
| AGT-03 | Agent can be deleted when merchant churns (via Agent Delete API) | ElevenLabs `DELETE /v1/convai/agents/{agent_id}` returns 200 on success |
| AGT-04 | Agent status tracked in DB (`stores.elevenlabs_agent_id`, `stores.agent_status`) | Additive migration adds columns to existing `stores` table; use `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
| AGT-05 | Agent guardrails set at creation (max_duration_seconds, daily_limit, blocked topics) | `conversation_config.conversation.max_duration_seconds` for duration; custom guardrails via `platform_settings.guardrails`; daily_limit not native -- must be tracked in our DB |
| AGT-06 | Agent templates exist per type: Online Store, Service Business, Lead Gen | New `agent_templates` table with pre-configured `conversation_config` JSON per type; seeded via migration |
| DB-01 | Additive migrations: agent columns on `stores` table | `ALTER TABLE stores ADD COLUMN IF NOT EXISTS` pattern; agent_id, agent_status, kb_doc_id, agent_config columns |
| DB-02 | pgvector extension enabled, product embeddings column | pgvector already enabled in `001_shopify_schema.sql`; `products.embedding VECTOR(1536)` column already exists |
| DB-03 | Agent templates table for agent type presets | New `agent_templates` table with id, name, type, conversation_config, platform_settings, description, is_default columns |
| DB-04 | Usage tracking columns (minutes_used, billing_period_start) | Add `minutes_used INTEGER DEFAULT 0`, `billing_period_start TIMESTAMP`, `daily_conversation_count INTEGER DEFAULT 0` to stores |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | 0.28.1 | HTTP client for ElevenLabs API calls | Already installed; async support; used by existing signed-url endpoint |
| asyncpg | 0.31.0 | PostgreSQL async driver | Already installed; used by `database.py` singleton |
| pydantic | 2.12.5 | Request/response models | Already installed; used for all API models |
| pydantic-settings | 2.13.1 | Settings management | Already installed; used by `config.py` |
| FastAPI | 0.135.1 | Web framework | Already installed; existing backend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid (stdlib) | - | Generate store and template IDs | Agent creation, template seeding |
| json (stdlib) | - | Serialize/deserialize agent configs | Storing conversation_config as JSONB |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw httpx | elevenlabs Python SDK (v2.39.0) | SDK adds type safety but introduces 15+ transitive deps, is oriented toward audio playback, and the project already established raw httpx pattern. Overhead not justified for 4 HTTP endpoints. |
| Raw SQL migrations | Alembic or asyncpg-trek | Adds framework complexity; project only needs ~3 additive migration files total. Not justified until 10+ migrations. |
| JSONB for agent_config | Separate columns per field | JSONB is flexible for storing full ElevenLabs conversation_config; avoids schema changes when ElevenLabs adds fields |

**Installation:**
```bash
# No new dependencies needed -- all libraries already installed
# The stack is: httpx + asyncpg + pydantic + FastAPI
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
  elevenlabs_service.py    # NEW: ElevenLabs agent CRUD service (singleton)
  main.py                   # Add agent CRUD API endpoints
  models.py                 # Add AgentTemplate, AgentConfig models
  config.py                 # Already has ELEVENLABS_API_KEY
  database.py               # Existing (no changes)
migrations/
  001_shopify_schema.sql    # Existing base schema
  002_agent_infrastructure.sql  # NEW: agent columns, templates table, usage tracking
  003_seed_agent_templates.sql  # NEW: seed data for 3 agent type templates
```

### Pattern 1: ElevenLabs Service Module (Singleton)
**What:** A dedicated service class that encapsulates all ElevenLabs API interactions, following the same pattern as `shopify_service.py`.
**When to use:** All agent CRUD operations.
**Example:**
```python
# Source: Based on existing shopify_service.py pattern + ElevenLabs API docs
import httpx
from typing import Optional, Any
from backend.config import settings

class ElevenLabsService:
    """ElevenLabs Conversational AI agent management."""

    BASE_URL = "https://api.elevenlabs.io/v1/convai"

    def _headers(self) -> dict[str, str]:
        return {
            "xi-api-key": settings.ELEVENLABS_API_KEY or "",
            "Content-Type": "application/json",
        }

    async def create_agent(
        self,
        name: str,
        conversation_config: dict[str, Any],
        platform_settings: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Create a new ElevenLabs agent. Returns full agent response including agent_id."""
        payload: dict[str, Any] = {
            "name": name,
            "conversation_config": conversation_config,
        }
        if platform_settings:
            payload["platform_settings"] = platform_settings

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/agents/create",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def update_agent(
        self,
        agent_id: str,
        conversation_config: Optional[dict[str, Any]] = None,
        platform_settings: Optional[dict[str, Any]] = None,
        name: Optional[str] = None,
    ) -> dict[str, Any]:
        """Patch an existing agent's configuration."""
        payload: dict[str, Any] = {}
        if conversation_config:
            payload["conversation_config"] = conversation_config
        if platform_settings:
            payload["platform_settings"] = platform_settings
        if name:
            payload["name"] = name

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.patch(
                f"{self.BASE_URL}/agents/{agent_id}",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an ElevenLabs agent. Returns True on success."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{self.BASE_URL}/agents/{agent_id}",
                headers=self._headers(),
            )
            return response.status_code == 200

    async def get_agent(self, agent_id: str) -> dict[str, Any]:
        """Retrieve agent configuration."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/agents/{agent_id}",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def get_signed_url(self, agent_id: str) -> str:
        """Get signed URL for WebRTC connection (already exists in main.py, will be migrated)."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/../convai/conversation/get-signed-url",
                params={"agent_id": agent_id},
                headers=self._headers(),
            )
            response.raise_for_status()
            data = response.json()
            return data.get("signed_url", "")

# Singleton
elevenlabs_service = ElevenLabsService()
```

### Pattern 2: Agent Template Configuration
**What:** Pre-configured conversation_config objects for each agent type, stored in DB and used as blueprints when creating new agents.
**When to use:** AGT-06 -- when a merchant selects their store type during signup.
**Example:**
```python
# Source: ElevenLabs API create agent docs
ONLINE_STORE_TEMPLATE = {
    "conversation_config": {
        "agent": {
            "first_message": "Hi! I'm your store's shopping assistant. What can I help you find today?",
            "language": "en",
            "prompt": {
                "prompt": (
                    "You are a friendly and knowledgeable shopping assistant for an online store. "
                    "Help customers find products, answer questions about availability and pricing, "
                    "and guide them toward making a purchase. Stay focused on the store's products. "
                    "Do not discuss competitors. Be concise and helpful."
                ),
                "llm": "gpt-4o-mini",
                "temperature": 0.7,
                "max_tokens": -1,
            },
        },
        "tts": {
            "voice_id": "cjVigY5qzO86Huf0OWal",  # ElevenLabs default voice
            "model_id": "eleven_flash_v2_5",
            "stability": 0.5,
            "similarity_boost": 0.8,
        },
        "conversation": {
            "max_duration_seconds": 600,  # 10 minutes max per call
        },
    },
    "platform_settings": {
        "guardrails": {
            "version": "1",
            "prompt_injection": {"isEnabled": True},
            "custom": {
                "config": {
                    "configs": [{
                        "is_enabled": True,
                        "name": "Stay on topic",
                        "prompt": "Block any requests unrelated to shopping, product inquiries, or customer service. Do not provide medical, legal, or financial advice.",
                        "model": "gemini-2.5-flash-lite",
                    }]
                }
            }
        }
    }
}
```

### Pattern 3: Additive SQL Migrations
**What:** Numbered SQL files that only ADD columns/tables, never DROP or ALTER existing ones destructively.
**When to use:** All schema changes in this phase.
**Example:**
```sql
-- migrations/002_agent_infrastructure.sql
-- Additive migration: agent columns on stores, agent_templates table, usage tracking

-- Track applied migrations
CREATE TABLE IF NOT EXISTS applied_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Agent columns on stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS elevenlabs_agent_id VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS agent_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS agent_template_id UUID;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_doc_id VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT '{}';

-- Usage tracking columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS daily_conversation_count INTEGER DEFAULT 0;

-- Indexes for agent lookups
CREATE INDEX IF NOT EXISTS idx_stores_agent_id ON stores(elevenlabs_agent_id);
CREATE INDEX IF NOT EXISTS idx_stores_agent_status ON stores(agent_status);

-- Agent templates table
CREATE TABLE IF NOT EXISTS agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,  -- 'online_store', 'service_business', 'lead_gen'
    description TEXT,
    conversation_config JSONB NOT NULL DEFAULT '{}',
    platform_settings JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(type, is_default) -- Only one default per type
);
```

### Pattern 4: Refactoring Signed URL to Per-Store Agent
**What:** The existing `/api/voice/signed-url` endpoint reads a global `ELEVENLABS_AGENT_ID` from env vars. It must be refactored to look up the `elevenlabs_agent_id` from the store's DB record.
**When to use:** When the widget requests a signed URL, it passes `store_id` and the backend resolves the correct per-store agent.
**Example:**
```python
# BEFORE (current -- global agent):
agent_id = settings.ELEVENLABS_AGENT_ID

# AFTER (per-store agent):
row = await db.fetchrow(
    "SELECT elevenlabs_agent_id, agent_status FROM stores WHERE id = $1::uuid",
    store_id,
)
if not row or not row["elevenlabs_agent_id"]:
    raise HTTPException(503, "Agent not configured for this store")
if row["agent_status"] != "active":
    raise HTTPException(503, "Agent is not active")
agent_id = row["elevenlabs_agent_id"]
```

### Anti-Patterns to Avoid
- **Global agent ID in env vars:** The current `ELEVENLABS_AGENT_ID` in `config.py` is for single-tenant mode. Multi-tenant MUST look up per-store `elevenlabs_agent_id` from DB.
- **Creating httpx.AsyncClient per request:** Expensive. Use a shared client instance or at minimum `async with` blocks (which is what the existing code does -- acceptable for now, but a shared client on the service singleton would be more efficient).
- **Storing sensitive config in JSONB without encryption:** Agent configs in `agent_config` JSONB column are NOT sensitive (they contain voice settings, prompts, etc.), so JSONB is fine. But never store API keys in JSONB.
- **Synchronous ElevenLabs calls in request handlers:** Always use `async` httpx calls to avoid blocking the event loop.
- **Destructive migrations:** Never use `DROP COLUMN`, `ALTER COLUMN ... TYPE`, or `DROP TABLE` in migrations. Only add.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retries on ElevenLabs API | Custom retry loop | `httpx` with `timeout` + simple retry decorator | ElevenLabs returns 429 for rate limits; a basic 3-retry with exponential backoff covers it |
| Agent config validation | Manual dict checking | Pydantic models for template configs | Type safety, auto-validation, serialization to/from JSON |
| UUID generation | Custom ID schemes | `uuid.uuid4()` (stdlib) | Already used throughout the codebase for store IDs |
| pgvector extension | Custom vector storage | `CREATE EXTENSION IF NOT EXISTS vector` | Already in migration 001; Neon supports it natively |
| Migration tracking | File timestamp guessing | `applied_migrations` table | Simple, reliable, no external tool needed |

**Key insight:** The ElevenLabs API is straightforward REST CRUD. The complexity is not in the API calls but in correctly wiring the per-store agent lifecycle (create on signup, update on settings change, delete on churn) and keeping the DB state synchronized with ElevenLabs state.

## Common Pitfalls

### Pitfall 1: ElevenLabs Agent Creation Failure Leaves Store Without Agent
**What goes wrong:** `POST /v1/convai/agents/create` fails (rate limit, validation error, network issue) but the store is already created in DB without an `elevenlabs_agent_id`.
**Why it happens:** Store creation and agent creation are two separate operations that can partially fail.
**How to avoid:** Set `agent_status = 'pending'` when creating the store, then update to `'active'` only after successful ElevenLabs agent creation. Implement a retry mechanism and a "stuck in pending" cleanup job.
**Warning signs:** Stores with `agent_status = 'pending'` for more than 5 minutes.

### Pitfall 2: ElevenLabs API Key Rate Limits
**What goes wrong:** All merchants share one ElevenLabs API key. Burst agent creation (many signups) can hit rate limits.
**Why it happens:** ElevenLabs rate limits are per-API-key, not per-agent.
**How to avoid:** Add retry with exponential backoff on 429 responses. Queue agent creation requests rather than creating inline during signup request.
**Warning signs:** HTTP 429 responses from ElevenLabs in logs.

### Pitfall 3: Orphaned ElevenLabs Agents
**What goes wrong:** Agent is created in ElevenLabs but the DB update fails, leaving an agent that exists in ElevenLabs but is not tracked in the DB.
**Why it happens:** Non-atomic operation across two systems (ElevenLabs API + PostgreSQL).
**How to avoid:** Create agent in ElevenLabs first, then store the `agent_id` in DB. If DB write fails, attempt to delete the ElevenLabs agent. Log orphaned agent IDs for manual cleanup.
**Warning signs:** ElevenLabs dashboard shows more agents than DB records with `elevenlabs_agent_id IS NOT NULL`.

### Pitfall 4: JSONB Config Drift Between DB and ElevenLabs
**What goes wrong:** Agent config is updated in the DB but the ElevenLabs PATCH call fails, leaving the DB showing one config and ElevenLabs using another.
**Why it happens:** Optimistic update pattern -- DB is updated before confirming ElevenLabs accepted the change.
**How to avoid:** Update ElevenLabs FIRST, then update DB only on success. On failure, keep DB as-is and return error to user.
**Warning signs:** User sees settings that don't match agent behavior.

### Pitfall 5: pgvector Extension Not Enabled Before Column Use
**What goes wrong:** Migration tries to add a `VECTOR(1536)` column before `CREATE EXTENSION IF NOT EXISTS vector`.
**Why it happens:** Migration ordering issue.
**How to avoid:** The base migration `001_shopify_schema.sql` already creates the vector extension. Ensure migration 002 runs after 001. The `IF NOT EXISTS` guard makes it safe to re-run.
**Warning signs:** `ERROR: type "vector" does not exist`.

### Pitfall 6: Neon PgBouncer + Statement Cache
**What goes wrong:** Prepared statement errors when using `asyncpg` with Neon's PgBouncer pooler.
**Why it happens:** PgBouncer does not support server-side prepared statements.
**How to avoid:** Already handled -- `database.py` sets `statement_cache_size=0`. Ensure any new database code does not re-enable statement caching.
**Warning signs:** `prepared statement does not exist` errors.

## Code Examples

### Creating an Agent for a New Store
```python
# Source: ElevenLabs API docs + project patterns
async def create_agent_for_store(store_id: str, template_type: str = "online_store"):
    """Create an ElevenLabs agent for a newly registered store."""
    # 1. Fetch template
    template = await db.fetchrow(
        "SELECT conversation_config, platform_settings FROM agent_templates WHERE type = $1 AND is_default = TRUE",
        template_type,
    )
    if not template:
        raise HTTPException(500, f"No default template for type: {template_type}")

    # 2. Get store info for naming
    store = await db.fetchrow("SELECT shop_domain FROM stores WHERE id = $1::uuid", store_id)
    agent_name = f"SimplifyOps - {store['shop_domain']}" if store else f"SimplifyOps - {store_id}"

    # 3. Mark as pending
    await db.execute(
        "UPDATE stores SET agent_status = 'pending' WHERE id = $1::uuid", store_id
    )

    # 4. Create agent in ElevenLabs
    try:
        import json
        config = json.loads(template["conversation_config"]) if isinstance(template["conversation_config"], str) else template["conversation_config"]
        platform = json.loads(template["platform_settings"]) if isinstance(template["platform_settings"], str) else template["platform_settings"]

        result = await elevenlabs_service.create_agent(
            name=agent_name,
            conversation_config=config,
            platform_settings=platform,
        )
        agent_id = result.get("agent_id")

        # 5. Store agent_id in DB
        await db.execute(
            """UPDATE stores
               SET elevenlabs_agent_id = $1, agent_status = 'active', agent_config = $2, updated_at = NOW()
               WHERE id = $3::uuid""",
            agent_id, json.dumps(config), store_id,
        )
        return agent_id

    except Exception as e:
        # Mark as failed
        await db.execute(
            "UPDATE stores SET agent_status = 'failed' WHERE id = $1::uuid", store_id
        )
        raise
```

### Updating Agent Voice and Greeting
```python
# Source: ElevenLabs PATCH /v1/convai/agents/{agent_id} docs
async def update_agent_voice(store_id: str, voice_id: str, greeting: str):
    """Update an agent's voice and greeting message."""
    row = await db.fetchrow(
        "SELECT elevenlabs_agent_id FROM stores WHERE id = $1::uuid", store_id
    )
    if not row or not row["elevenlabs_agent_id"]:
        raise HTTPException(404, "No agent for this store")

    # Update ElevenLabs FIRST
    await elevenlabs_service.update_agent(
        agent_id=row["elevenlabs_agent_id"],
        conversation_config={
            "tts": {"voice_id": voice_id},
            "agent": {"first_message": greeting},
        },
    )

    # Then update DB
    await db.execute(
        """UPDATE stores SET agent_config = agent_config || $1::jsonb, updated_at = NOW()
           WHERE id = $2::uuid""",
        json.dumps({"voice_id": voice_id, "first_message": greeting}),
        store_id,
    )
```

### Deleting an Agent (Store Churn)
```python
# Source: ElevenLabs DELETE /v1/convai/agents/{agent_id} docs
async def delete_agent_for_store(store_id: str):
    """Delete ElevenLabs agent and clean up DB record."""
    row = await db.fetchrow(
        "SELECT elevenlabs_agent_id FROM stores WHERE id = $1::uuid", store_id
    )
    if row and row["elevenlabs_agent_id"]:
        # Delete from ElevenLabs first
        success = await elevenlabs_service.delete_agent(row["elevenlabs_agent_id"])
        if not success:
            logger.warning(f"Failed to delete ElevenLabs agent {row['elevenlabs_agent_id']}")

    # Clean up DB regardless (agent may have been manually deleted)
    await db.execute(
        """UPDATE stores
           SET elevenlabs_agent_id = NULL, agent_status = 'none', agent_config = '{}', updated_at = NOW()
           WHERE id = $1::uuid""",
        store_id,
    )
```

## ElevenLabs API Reference Summary

### Endpoints Used in This Phase

| Operation | Method | URL | Key Fields |
|-----------|--------|-----|------------|
| Create Agent | POST | `/v1/convai/agents/create` | `name`, `conversation_config` (required), `platform_settings` |
| Get Agent | GET | `/v1/convai/agents/{agent_id}` | Returns full config + `agent_id` |
| Update Agent | PATCH | `/v1/convai/agents/{agent_id}` | Partial update of any config field |
| Delete Agent | DELETE | `/v1/convai/agents/{agent_id}` | Returns 200 on success |
| Signed URL | GET | `/v1/convai/conversation/get-signed-url?agent_id=X` | Returns `{"signed_url": "wss://..."}` |

### Key conversation_config Fields

| Field Path | Type | Default | Purpose |
|------------|------|---------|---------|
| `agent.first_message` | string | "" | Greeting the agent speaks first |
| `agent.language` | string | "en" | Agent language (28+ options) |
| `agent.prompt.prompt` | string | - | System prompt (personality, rules) |
| `agent.prompt.llm` | string | "gpt-4o-mini" | LLM model to use |
| `agent.prompt.temperature` | number | 0 | LLM temperature (0-2) |
| `tts.voice_id` | string | "cjVigY5qzO86Huf0OWal" | ElevenLabs voice ID |
| `tts.model_id` | string | "eleven_flash_v2_5" | TTS model |
| `tts.stability` | number | 0.5 | Voice stability (0-1) |
| `conversation.max_duration_seconds` | integer | 600 | Max call length |
| `turn.turn_timeout` | number | 7 | Seconds of silence before re-engagement |

### Guardrails Configuration (platform_settings)

```json
{
  "guardrails": {
    "version": "1",
    "prompt_injection": { "isEnabled": true },
    "custom": {
      "config": {
        "configs": [
          {
            "is_enabled": true,
            "name": "Rule name",
            "prompt": "Natural language blocking rule (max 10000 chars)",
            "model": "gemini-2.5-flash-lite"
          }
        ]
      }
    }
  }
}
```

### Agent Status Lifecycle

```
none -> pending -> active
                -> failed -> pending (retry)
active -> deleting -> none
active -> disabled (via agent config toggle)
```

## State of the Art

| Old Approach (Current Codebase) | New Approach (Phase 1) | Impact |
|--------------------------------|------------------------|--------|
| Single global `ELEVENLABS_AGENT_ID` env var | Per-store `elevenlabs_agent_id` in DB | Multi-tenant agent isolation |
| One agent for all merchants | Dedicated agent per merchant | Independent voice, greeting, prompt per merchant |
| No agent lifecycle management | Full CRUD via ElevenLabs API | Create on signup, update on config change, delete on churn |
| Settings stored as JSONB `settings` blob | Separate `agent_config` JSONB + agent columns | Clear separation of widget settings vs agent configuration |
| No usage tracking | `minutes_used`, `billing_period_start` columns | Foundation for Phase 7 billing enforcement |
| No agent templates | `agent_templates` table with 3 types | Quick setup for different business types |

**Deprecated/outdated in current codebase:**
- `settings.ELEVENLABS_AGENT_ID` in `config.py`: Will become a fallback-only field after Phase 1. Per-store lookup takes priority.
- Global `/api/voice/config` returning one agent_id: Must be refactored to per-store lookup.
- Store creation without agent creation: `POST /api/stores/create` currently creates a DB record only. Must trigger agent creation.

## DB Schema: Current vs Target

### Current `stores` Table
```sql
stores (
    id UUID PRIMARY KEY,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token_encrypted TEXT,
    owner_id UUID,
    subscription_tier VARCHAR(50) DEFAULT 'trial',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)
```

### Target `stores` Table (After Migration 002)
```sql
stores (
    -- Existing columns (unchanged)
    id UUID PRIMARY KEY,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token_encrypted TEXT,
    owner_id UUID,
    subscription_tier VARCHAR(50) DEFAULT 'trial',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- NEW: Agent infrastructure columns
    elevenlabs_agent_id VARCHAR(255),
    agent_status VARCHAR(50) DEFAULT 'none',
    agent_template_id UUID,
    kb_doc_id VARCHAR(255),
    agent_config JSONB DEFAULT '{}',
    -- NEW: Usage tracking columns
    minutes_used INTEGER DEFAULT 0,
    billing_period_start TIMESTAMP,
    daily_conversation_count INTEGER DEFAULT 0
)
```

## Open Questions

1. **ElevenLabs Agent Limits Per Account**
   - What we know: ElevenLabs has per-plan concurrency limits (concurrent calls) and KB limits (300k chars / 20MB for non-enterprise).
   - What's unclear: Is there a maximum NUMBER of agents per account? At 100+ merchants, could we hit an agent count limit?
   - Recommendation: Start with per-merchant agents. If a limit is hit, contact ElevenLabs sales or implement agent pooling. The architecture supports either approach since agent_id is stored per-store.

2. **Daily Conversation Limit Enforcement**
   - What we know: `max_duration_seconds` is a native ElevenLabs field. Daily conversation count limits are NOT native to ElevenLabs.
   - What's unclear: Should we enforce daily limits at the API level (before creating signed URL) or rely on future Phase 7 billing enforcement?
   - Recommendation: Add the `daily_conversation_count` column now but defer enforcement to Phase 7 billing. For Phase 1, just set `max_duration_seconds` on agent creation.

3. **Agent Template Versioning**
   - What we know: ElevenLabs supports agent versioning (optional `enable_versioning` parameter).
   - What's unclear: Do we need versioning for our templates, or is a simple "update in place" sufficient?
   - Recommendation: Skip ElevenLabs agent versioning for now. Our templates are stored as JSONB in our DB; we can version them later if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (already installed) |
| Config file | None (uses default discovery; conftest.py in `backend/tests/`) |
| Quick run command | `cd backend && python -m pytest tests/ -x -q` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGT-01 | Create agent on signup | unit | `cd backend && python -m pytest tests/test_elevenlabs_service.py::TestCreateAgent -x` | No - Wave 0 |
| AGT-02 | Update agent (voice, greeting, personality) | unit | `cd backend && python -m pytest tests/test_elevenlabs_service.py::TestUpdateAgent -x` | No - Wave 0 |
| AGT-03 | Delete agent on churn | unit | `cd backend && python -m pytest tests/test_elevenlabs_service.py::TestDeleteAgent -x` | No - Wave 0 |
| AGT-04 | Agent status tracked in DB | unit | `cd backend && python -m pytest tests/test_agent_endpoints.py::TestAgentStatus -x` | No - Wave 0 |
| AGT-05 | Guardrails set at creation | unit | `cd backend && python -m pytest tests/test_elevenlabs_service.py::TestAgentGuardrails -x` | No - Wave 0 |
| AGT-06 | Agent templates per type | unit | `cd backend && python -m pytest tests/test_agent_templates.py -x` | No - Wave 0 |
| DB-01 | Agent columns on stores | smoke | `cd backend && python -m pytest tests/test_migrations.py::TestMigration002 -x` | No - Wave 0 |
| DB-02 | pgvector extension enabled | smoke | Already verified by existing schema test / migration 001 | Existing |
| DB-03 | Agent templates table | smoke | `cd backend && python -m pytest tests/test_migrations.py::TestMigration003 -x` | No - Wave 0 |
| DB-04 | Usage tracking columns | smoke | `cd backend && python -m pytest tests/test_migrations.py::TestMigration002 -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/ -x -q`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_elevenlabs_service.py` -- covers AGT-01, AGT-02, AGT-03, AGT-05 (mocked httpx calls)
- [ ] `tests/test_agent_endpoints.py` -- covers AGT-04 (API endpoint tests for agent CRUD)
- [ ] `tests/test_agent_templates.py` -- covers AGT-06 (template CRUD and seeding)
- [ ] `tests/test_migrations.py` -- covers DB-01, DB-03, DB-04 (verify SQL syntax is valid)

## Sources

### Primary (HIGH confidence)
- [ElevenLabs Create Agent API](https://elevenlabs.io/docs/api-reference/agents/create) - Full request/response schema, endpoint URL, all conversation_config fields
- [ElevenLabs Update Agent API](https://elevenlabs.io/docs/api-reference/agents/update) - PATCH endpoint, partial update support
- [ElevenLabs Delete Agent API](https://elevenlabs.io/docs/api-reference/agents/delete) - DELETE endpoint, 200 response on success
- [ElevenLabs Get Agent API](https://elevenlabs.io/docs/api-reference/agents/get) - GET endpoint, full response schema
- [ElevenLabs Guardrails](https://elevenlabs.io/docs/eleven-agents/best-practices/guardrails) - Custom guardrail config structure, model options
- [Neon pgvector extension](https://neon.com/docs/extensions/pgvector) - Extension setup, HNSW index, vector types
- Existing codebase: `backend/main.py`, `backend/database.py`, `backend/config.py`, `backend/shopify_service.py`, `migrations/001_shopify_schema.sql`

### Secondary (MEDIUM confidence)
- [ElevenLabs Python SDK PyPI](https://pypi.org/project/elevenlabs/) - Version 2.39.0, Python 3.8+ required
- [ElevenLabs Knowledge Base](https://elevenlabs.io/docs/agents-platform/customization/knowledge-base) - 300k char limit for non-enterprise
- [ElevenLabs Agent Concurrency Limits](https://help.elevenlabs.io/hc/en-us/articles/31601651829393) - Per-plan concurrency, burst pricing

### Tertiary (LOW confidence)
- Agent count limits per account: Not documented anywhere found. Assumed no hard limit but may exist for non-enterprise plans.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed, no new dependencies needed
- Architecture: HIGH - following existing codebase patterns (singleton services, raw SQL, httpx)
- ElevenLabs API: HIGH - endpoints verified against official API reference docs
- Guardrails config: MEDIUM - custom guardrail structure verified, but `daily_limit` is not a native ElevenLabs concept
- Agent count limits: LOW - no documentation found on max agents per account
- Pitfalls: HIGH - derived from analysis of existing code patterns and two-system sync challenges

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (ElevenLabs API is stable; Neon pgvector is stable)
