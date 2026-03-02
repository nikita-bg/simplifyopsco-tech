# Phase 1: Foundation & Infrastructure - Research

**Researched:** 2026-03-02
**Domain:** Next.js deployment, Supabase database, n8n workflow automation, infrastructure security
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational infrastructure for the SimplifyOps Voice AI platform. The stack is well-established with mature tooling: Vercel for Next.js deployment (automatic SSL, edge network, serverless functions), Supabase for PostgreSQL with pgvector extension (vector embeddings for RAG), and n8n for workflow automation (Google Drive → document processing → embeddings pipeline). All three platforms offer production-ready solutions with strong security features.

**Key findings:**
- Vercel provides zero-config deployment for Next.js with automatic HTTPS, environment variable encryption, and edge network distribution
- Supabase enables pgvector with a single dashboard click or SQL command, supports Row Level Security (RLS) for data isolation
- n8n offers pre-built workflow templates for Google Drive + Supabase + OpenAI RAG pipelines
- Security baseline is straightforward: NEXT_PUBLIC_ prefix for client-exposed variables, server-only secrets in Vercel environment variables, encryption at rest and in transit by default

**Primary recommendation:** Use Vercel for hosting, Supabase for database with pgvector, and n8n Cloud for initial deployment (migrate to self-hosted if cost becomes prohibitive). Configure environment variables through Vercel dashboard with proper NEXT_PUBLIC_ prefixes, enable RLS on all Supabase tables from day one, and leverage existing n8n workflow templates for RAG pipeline.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYS-01 | Deploy Next.js application to Vercel with serverless functions and edge network | Vercel automatic deployment, Git integration, serverless API routes |
| SYS-02 | Set up Supabase with PostgreSQL + pgvector extension for vector storage | pgvector enable via dashboard/SQL, HNSW indexing for performance |
| SYS-03 | Deploy n8n workflows (RAG pipeline automation) - cloud or self-hosted | n8n Cloud for simplicity vs Docker self-hosted for control, pre-built templates available |
| SYS-05 | Implement HTTPS encryption for all data transmission, secure environment variables | Vercel automatic SSL via Let's Encrypt, environment variable encryption, NEXT_PUBLIC_ prefix pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | Frontend framework and serverless API | Official Vercel integration, automatic SSR/SSG, API routes become serverless functions |
| Supabase | Latest | PostgreSQL database with auth, realtime, storage | Managed Postgres with pgvector support, built-in auth, RLS policies, generous free tier |
| pgvector | 0.6.0+ | Vector embeddings storage and similarity search | Native Postgres extension, HNSW indexing (30x faster builds), integrated with Supabase |
| n8n | Latest | Workflow automation for RAG pipeline | 400+ integrations, native Google Drive/Supabase/OpenAI nodes, fair-code license |
| Vercel | Platform | Deployment and hosting | Zero-config Next.js deployment, automatic SSL, edge network, serverless functions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | Latest | Supabase JavaScript client | Required for frontend/backend Supabase interaction |
| @supabase/ssr | Latest | Supabase SSR helpers for Next.js | Enables cookie-based auth, required for authenticated SSR |
| dotenv | Latest | Local environment variable management | Development only, Vercel handles production env vars |
| PostgreSQL | 15+ | Underlying database | Managed by Supabase, prefer external DB over SQLite for production |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel | Netlify, Cloudflare Pages | Vercel has tighter Next.js integration, but others work fine |
| Supabase | Firebase, PlanetScale, Railway | Supabase has native pgvector, others require separate vector DB |
| n8n | Zapier, Make.com | n8n is self-hostable and more cost-effective at scale, others are SaaS-only |
| n8n Cloud | n8n self-hosted Docker | Cloud for convenience ($24/mo starter), self-hosted for control (~$100/mo infrastructure) |
| pgvector | Pinecone, Weaviate, Qdrant | pgvector keeps vectors in same DB as relational data, dedicated vector DBs offer more features |

**Installation:**
```bash
# Next.js dependencies
npm install @supabase/supabase-js @supabase/ssr

# Development
npm install --save-dev dotenv

# Vercel CLI (optional, for local testing)
npm install -g vercel

# Supabase CLI (for local development, migrations)
npm install supabase --save-dev
```

## Architecture Patterns

### Recommended Project Structure
```
simplifyopsco.tech-v1/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Authentication routes (grouped)
│   ├── api/               # API routes (become serverless functions)
│   │   ├── voice/         # ElevenLabs voice endpoints
│   │   ├── rag/           # RAG query endpoints
│   │   └── webhooks/      # n8n webhook receivers
│   ├── dashboard/         # Protected dashboard routes
│   └── layout.tsx         # Root layout
├── lib/                   # Shared utilities
│   ├── supabase/          # Supabase client initialization
│   │   ├── client.ts      # Client-side Supabase client
│   │   ├── server.ts      # Server-side Supabase client
│   │   └── middleware.ts  # Auth middleware
│   └── utils/             # Helper functions
├── supabase/              # Supabase configuration
│   ├── migrations/        # Database migrations
│   └── config.toml        # Local Supabase config
├── public/                # Static assets
├── .env.local             # Local environment variables (gitignored)
├── .env.example           # Environment variable template
└── vercel.json            # Vercel deployment config (optional)
```

### Pattern 1: Supabase Client Initialization (Cookie-Based Auth for SSR)
**What:** Create separate Supabase clients for client-side and server-side contexts using @supabase/ssr package
**When to use:** Always - required for authenticated data fetches in Next.js App Router
**Example:**
```typescript
// lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

### Pattern 2: Environment Variables (Server vs Client)
**What:** Prefix client-exposed variables with NEXT_PUBLIC_, keep secrets server-only
**When to use:** Always - critical for security
**Example:**
```bash
# .env.local (development)
# Source: https://nextjs.org/docs/pages/guides/environment-variables

# PUBLIC (compiled into browser JS bundle)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# PRIVATE (server-only, NEVER exposed to browser)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ELEVENLABS_API_KEY=sk_371b4c3461eab91f33b4b61f54eedabe913513845349bae3
OPENAI_API_KEY=sk-...
N8N_WEBHOOK_SECRET=random-secret-string
```

### Pattern 3: Supabase pgvector Setup
**What:** Enable pgvector extension and create vector columns with HNSW indexing
**When to use:** For storing embeddings (knowledge base documents, conversation context)
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/extensions/pgvector

-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table with vector column (1536 dimensions for OpenAI ada-002)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create HNSW index for fast similarity search (recommended over IVFFlat)
-- m=16 is default, ef_construction=64 for good quality
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Enable RLS (CRITICAL - prevents data leaks)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust based on auth requirements)
CREATE POLICY "Users can read their own documents"
ON documents FOR SELECT
USING (auth.uid() = user_id);
```

### Pattern 4: Vercel Deployment Configuration
**What:** Deploy Next.js app with automatic Git integration
**When to use:** Always - primary deployment method
**Example:**
```bash
# Via Vercel CLI (one-time setup)
npm install -g vercel
vercel login
vercel

# Or via Git integration (recommended)
# 1. Push to GitHub
# 2. Import project in Vercel dashboard
# 3. Vercel auto-detects Next.js and configures build
# 4. Set environment variables in Vercel dashboard
# 5. Deploy on every push to main (production) or PR (preview)
```

### Pattern 5: n8n RAG Workflow Template
**What:** Use pre-built n8n workflow for Google Drive → chunking → embeddings → Supabase
**When to use:** For automating knowledge base document ingestion
**Example:**
```
n8n Workflow: AI Knowledge Base Assistant
Source: https://n8n.io/workflows/6538

Trigger: Google Drive (file created/modified)
  ↓
Google Drive Download: Fetch file content
  ↓
Split Text: Chunk document (500 char chunks, 50 char overlap)
  ↓
OpenAI Embeddings: Generate embeddings (text-embedding-ada-002)
  ↓
Supabase Insert: Store chunks with embeddings in documents table
```

### Anti-Patterns to Avoid
- **Exposing secrets via NEXT_PUBLIC_ prefix:** Never use NEXT_PUBLIC_ for API keys, database credentials, or service role keys. These compile directly into browser JavaScript.
- **Disabling RLS on Supabase tables:** Always enable RLS. In January 2025, 170+ apps were exploited due to missing RLS (CVE-2025-48757).
- **Using SQLite for n8n in production:** Always use PostgreSQL for n8n production deployments. SQLite causes data loss and reliability issues.
- **Committing .env.local to Git:** Always gitignore environment files. Use .env.example as a template instead.
- **Skipping HNSW indexing on vector columns:** Without indexing, vector similarity searches are slow (full table scan). Always create HNSW indexes.
- **Not testing environment variables after deployment:** Vercel requires redeployment after adding/changing environment variables. New variables won't appear in already-deployed builds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **SSL/TLS certificate management** | Custom Let's Encrypt setup, certificate renewal scripts | Vercel automatic SSL | Vercel handles issuance, renewal, and wildcard certs automatically. Manual management introduces downtime risk and security gaps. |
| **Database hosting and backups** | Self-managed PostgreSQL server, backup scripts | Supabase managed database | Supabase includes automated backups, point-in-time recovery, replication, and monitoring. DIY Postgres requires DevOps expertise. |
| **Vector similarity search algorithms** | Custom cosine similarity calculations, manual indexing | pgvector with HNSW index | pgvector 0.6.0 has 30x faster index builds, optimized C implementation. Hand-rolled solutions are 100-1000x slower. |
| **OAuth authentication flows** | Custom Google OAuth implementation, JWT management | Supabase Auth | Supabase handles OAuth providers, session management, token refresh, and security best practices. Custom auth is a security liability. |
| **Workflow orchestration** | Custom task queues, cron jobs, API polling | n8n workflows | n8n provides visual workflow builder, error handling, retries, and 400+ integrations. Custom orchestration is brittle and hard to debug. |
| **Environment variable encryption** | Custom encryption libraries, key management | Vercel environment variables | Vercel encrypts env vars at rest and in transit, with role-based access control. DIY encryption introduces key management complexity. |
| **Edge network and CDN** | CloudFlare setup, cache invalidation logic | Vercel edge network | Vercel automatically deploys to 100+ edge locations with smart caching. Manual CDN config is error-prone. |

**Key insight:** Infrastructure management is a solved problem for this stack. Vercel, Supabase, and n8n are platform services that handle the hard parts (scaling, security, reliability) so you can focus on application logic. Hand-rolling any of these components adds weeks of development time and introduces production risks.

## Common Pitfalls

### Pitfall 1: Environment Variable Confusion (NEXT_PUBLIC_ Prefix)
**What goes wrong:** Developers prefix secrets with NEXT_PUBLIC_ expecting server-side protection, but secrets appear in browser DevTools
**Why it happens:** NEXT_PUBLIC_ variables are compiled into the browser JavaScript bundle at build time, making them publicly accessible
**How to avoid:** Only use NEXT_PUBLIC_ for truly public values (Supabase URL, anon key). Never use it for service role keys, API keys, or secrets.
**Warning signs:** API keys visible in browser Network tab, unauthorized API usage, security scanner alerts

### Pitfall 2: Missing RLS Policies on Supabase
**What goes wrong:** Database tables are accessible to anyone with the project URL and anon key, exposing all user data
**Why it happens:** Developers assume authentication provides data isolation, but Supabase requires explicit RLS policies
**How to avoid:** Enable RLS on every table immediately after creation. Create policies for SELECT, INSERT, UPDATE, DELETE operations. Test with different user roles.
**Warning signs:** Data from other users appearing in queries, security audit failures, ability to query tables without authentication

### Pitfall 3: Forgetting to Redeploy After Environment Variable Changes
**What goes wrong:** Application continues using old/undefined environment variables after updating Vercel dashboard
**Why it happens:** Environment variables are injected at build time, not runtime. Existing deployments don't see new values.
**How to avoid:** Always trigger a new deployment after changing environment variables (push to Git or manual redeploy in Vercel dashboard)
**Warning signs:** New environment variables returning undefined, application using outdated configuration, API calls failing with old credentials

### Pitfall 4: Using IVFFlat Instead of HNSW for pgvector Indexing
**What goes wrong:** Vector similarity search performance degrades as data grows, recall accuracy drops significantly
**Why it happens:** IVFFlat is faster to build initially, but HNSW is more robust and performant for production
**How to avoid:** Always use HNSW indexing for pgvector. Accept slightly longer initial index build time for better long-term performance.
**Warning signs:** Slow vector searches (>1s), decreasing accuracy over time, query timeouts on large datasets

### Pitfall 5: n8n Credentials Exposed in Environment Variables
**What goes wrong:** n8n workflows access server environment variables containing secrets, potentially leaking to untrusted users
**Why it happens:** n8n allows workflows to read process.env via expressions by default
**How to avoid:** Set N8N_BLOCK_ENV_ACCESS_IN_NODE=true to prevent workflows from accessing environment variables. Use n8n credential system instead.
**Warning signs:** Workflow expressions reading process.env, credentials appearing in workflow logs, unauthorized API access

### Pitfall 6: Running n8n with SQLite in Production
**What goes wrong:** Data loss, workflow execution failures, concurrent write conflicts
**Why it happens:** SQLite is the default database for n8n, but it's unsuitable for production (not concurrent-safe)
**How to avoid:** Always use PostgreSQL for n8n production deployments. Configure DB_TYPE=postgresdb and provide connection string.
**Warning signs:** Workflow data disappearing, "database locked" errors, execution history missing

### Pitfall 7: Not Indexing RLS Policy Columns
**What goes wrong:** Database queries become extremely slow as tables grow (100ms+ for simple queries)
**Why it happens:** RLS policies check conditions on every row, and without indexes, Postgres does full table scans
**How to avoid:** Create indexes on all columns referenced in RLS policies (especially user_id, auth.uid() comparisons)
**Warning signs:** Slow queries on small datasets, query performance degrading with table size, high CPU usage on Supabase dashboard

### Pitfall 8: Mixing Vercel Nameservers with External DNS
**What goes wrong:** SSL wildcard certificate generation fails, custom domains don't resolve
**Why it happens:** Vercel requires control over DNS for wildcard SSL (Let's Encrypt DNS challenges)
**How to avoid:** If using wildcard domains (*.example.com), switch to Vercel nameservers. For single domains, external DNS works with A/CNAME records.
**Warning signs:** SSL certificate generation stuck "pending", wildcard domains not resolving, intermittent HTTPS errors

## Code Examples

Verified patterns from official sources:

### Vercel Deployment - Environment Variable Configuration
```typescript
// Source: https://vercel.com/docs/environment-variables
// Set in Vercel Dashboard: Project Settings > Environment Variables

// Production environment
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ELEVENLABS_API_KEY=sk_371b4c3...
OPENAI_API_KEY=sk-...
N8N_WEBHOOK_SECRET=random-secret

// Preview environment (optional - different database for testing)
NEXT_PUBLIC_SUPABASE_URL=https://xxx-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

// Development environment (uses .env.local)
```

### Supabase - Enable pgvector and Create Indexed Table
```sql
-- Source: https://supabase.com/docs/guides/database/extensions/pgvector
-- Run in Supabase SQL Editor

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create table with vector column
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 dimensions
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create HNSW index for fast similarity search
-- Source: https://supabase.com/docs/guides/ai/going-to-prod
CREATE INDEX knowledge_base_embedding_idx
ON knowledge_base
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 4: Enable RLS (CRITICAL)
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can read their own knowledge base"
ON knowledge_base FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge base"
ON knowledge_base FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 6: Index user_id for RLS performance
CREATE INDEX knowledge_base_user_id_idx ON knowledge_base(user_id);
```

### Next.js API Route - RAG Query with pgvector
```typescript
// app/api/rag/query/route.ts
// Source: https://supabase.com/docs/guides/ai/vector-columns

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { query, topK = 5 } = await request.json()

  // Server-side Supabase client (uses cookies for auth)
  const supabase = createClient()

  // Step 1: Generate embedding for user query (call OpenAI)
  const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: query,
    }),
  })
  const { data } = await openaiResponse.json()
  const queryEmbedding = data[0].embedding

  // Step 2: Perform vector similarity search with RLS
  const { data: results, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: topK,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ results })
}
```

### Supabase - Vector Similarity Search Function
```sql
-- Source: https://supabase.com/docs/guides/ai/vector-columns
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.content,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
    AND knowledge_base.user_id = auth.uid() -- RLS enforcement
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### n8n - Environment Configuration for Docker
```yaml
# docker-compose.yml
# Source: https://docs.n8n.io/hosting/installation/docker-compose/

version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      # Database (REQUIRED for production)
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}

      # Encryption key (REQUIRED - generate with openssl rand -hex 32)
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}

      # Security
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=true

      # External access
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PROTOCOL=https

    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  n8n_data:
  postgres_data:
```

### Supabase Client - Server vs Client Initialization
```typescript
// lib/supabase/client.ts (Client-side)
// Source: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (Server-side - see Pattern 1 above)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IVFFlat indexing | HNSW indexing for pgvector | pgvector 0.5.0 (2023) | 10x better recall, more robust performance, faster for most use cases |
| Pages Router | App Router for Next.js | Next.js 13 (stable in 15) | Better server components, streaming SSR, cleaner data fetching patterns |
| Manual SSL certificates | Automatic SSL via Vercel/Let's Encrypt | 2019 | Zero-config HTTPS, automatic renewal, no downtime |
| SQLite for n8n | PostgreSQL for production n8n | Always recommended | Data reliability, concurrent writes, production-ready persistence |
| IVFFlat 100 lists default | HNSW m=16 default | pgvector 0.6.0 (2024) | 30x faster index builds, parallel construction |
| Separate vector databases | pgvector in Postgres | pgvector 0.4.0+ maturity (2024) | Simpler architecture, no data synchronization, lower operational cost |
| Session storage auth | Cookie-based SSR auth | @supabase/ssr (2024) | Secure server-side rendering, better Next.js App Router integration |

**Deprecated/outdated:**
- **Pages Router for new Next.js projects:** App Router is the recommended approach as of Next.js 13+
- **IVFFlat indexing for pgvector:** HNSW is superior in almost all cases (use IVFFlat only if you can't afford RAM)
- **SQLite for n8n production:** Always use PostgreSQL to avoid data loss
- **Manual environment variable management:** Use platform-provided encrypted env var systems (Vercel, n8n)
- **Custom OAuth implementations:** Supabase Auth handles all major providers with better security

## Open Questions

1. **n8n Cloud vs Self-Hosted for Production**
   - What we know: n8n Cloud is $24/month (2.5K executions), self-hosted is ~$100/month infrastructure cost
   - What's unclear: Expected RAG pipeline execution volume, whether 2.5K/month is sufficient
   - Recommendation: Start with n8n Cloud for simplicity. Monitor execution count in first month. If exceeding 2.5K, migrate to self-hosted Docker on DigitalOcean/Railway (~$20/mo for basic setup + $20 for Postgres)

2. **Custom Domain Setup**
   - What we know: Vercel provides free .vercel.app subdomain, custom domains require DNS configuration
   - What's unclear: Whether simplifyopsco.tech domain is already owned, DNS provider
   - Recommendation: If domain exists, use Vercel nameservers for wildcard SSL. If buying new, purchase through Vercel for automatic configuration.

3. **Supabase Pricing Tier for pgvector Storage**
   - What we know: Free tier includes 500MB database, Pro tier ($25/mo) includes 8GB
   - What's unclear: Expected knowledge base size (documents × chunks × embedding dimensions)
   - Recommendation: Start with free tier. 1536-dimension embeddings = ~6KB per vector. 500MB = ~80K document chunks, sufficient for MVP. Upgrade to Pro when approaching limit.

4. **ElevenLabs API Key Security**
   - What we know: API key provided (sk_371b4c3...), should be server-only
   - What's unclear: Whether this key should be rotated before production, usage limits
   - Recommendation: Store in Vercel environment variables (server-only, no NEXT_PUBLIC_). Consider rotating key before public demo to prevent accidental quota exhaustion. Monitor usage in ElevenLabs dashboard.

5. **Preview Environment Strategy**
   - What we know: Vercel creates preview deployments for every PR
   - What's unclear: Should preview environments use production Supabase or separate staging database
   - Recommendation: Use separate Supabase project for preview environments to prevent test data pollution. Configure preview environment variables in Vercel to point to staging Supabase instance.

## Sources

### Primary (HIGH confidence)
- [Vercel Environment Variables Documentation](https://vercel.com/docs/environment-variables) - Environment variable management, encryption, deployment workflow
- [Supabase pgvector Extension Guide](https://supabase.com/docs/guides/database/extensions/pgvector) - pgvector setup, HNSW indexing, vector similarity search
- [Next.js Environment Variables Guide](https://nextjs.org/docs/pages/guides/environment-variables) - NEXT_PUBLIC_ prefix pattern, security best practices
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policies, authentication integration
- [n8n Docker Installation Guide](https://docs.n8n.io/hosting/installation/docker/) - Production deployment, PostgreSQL configuration
- [ElevenLabs Security Best Practices](https://elevenlabs.io/docs/eleven-api/best-practices/security) - API key security, single-use tokens
- [Vercel Automatic SSL Documentation](https://vercel.com/blog/automatic-ssl-with-vercel-lets-encrypt) - SSL certificate issuance and renewal

### Secondary (MEDIUM confidence)
- [n8n Cloud vs Self-Hosted Comparison 2026](https://dev.to/ciphernutz/n8n-self-hosted-vs-n8n-cloud-which-one-should-you-choose-in-2025-1653) - Cost analysis, deployment tradeoffs
- [Supabase RLS Complete Guide 2026](https://vibeappscanner.com/supabase-row-level-security) - CVE-2025-48757 incident, security warnings
- [pgvector Performance Optimization Guide](https://medium.com/@dikhyantkrishnadalai/optimizing-vector-search-at-scale-lessons-from-pgvector-supabase-performance-tuning-ce4ada4ba2ed) - HNSW tuning, memory considerations
- [Vercel Deployment Troubleshooting](https://vercel.com/docs/deployments/troubleshoot-a-build) - Common build failures, environment variable issues
- [Next.js Supabase Integration Template](https://vercel.com/templates/next.js/supabase) - Cookie-based auth pattern, SSR setup
- [n8n RAG Workflow Templates](https://n8n.io/workflows/6538-ai-knowledge-base-assistant-with-openai-supabase-and-google-drive-doc-sync/) - Pre-built Google Drive + Supabase + OpenAI workflows

### Tertiary (LOW confidence)
- [Vitest vs Jest for Next.js 2026](https://www.wisp.blog/blog/vitest-vs-jest-which-should-i-use-for-my-nextjs-app) - Testing framework recommendations (not critical for Phase 1)
- [n8n Self-Hosted Architecture Guide 2026](https://northflank.com/blog/how-to-self-host-n8n-setup-architecture-and-pricing-guide) - Detailed self-hosting architecture (deferred until cost becomes issue)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components are industry-standard with extensive documentation and production usage
- Architecture: HIGH - Patterns verified from official documentation (Vercel, Supabase, n8n, Next.js)
- Pitfalls: HIGH - Based on official troubleshooting guides and documented security incidents (CVE-2025-48757)
- n8n deployment choice: MEDIUM - Cost analysis requires actual usage data, may need adjustment after first month

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (30 days - stable stack, Next.js 15 is current major version)

**Notes:**
- No CONTEXT.md exists for this phase, so all research decisions are Claude's discretion
- ElevenLabs API key is already provided in project context (sk_371b4c3...) - store as server-only environment variable
- Existing HTML files (landing-page.html, dashboard.html, voice-widget.html) use Tailwind CSS - compatible with Next.js
- n8n workflow for RAG pipeline already designed according to project context - leverage existing n8n templates for implementation
