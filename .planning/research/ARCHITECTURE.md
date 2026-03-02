# Architecture Research: Voice AI Platform

**Domain:** Voice AI Conversational Platform
**Research Date:** 2026-03-02
**Focus:** Real-time audio streaming, LLM integration, RAG, web automation

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                               │
│ ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐│
│ │  Voice Widget    │  │   Dashboard     │  │  Landing Page  ││
│ │  (WebSocket)     │  │  (SSR/Client)   │  │  (Static)      ││
│ └────────┬─────────┘  └────────┬────────┘  └────────────────┘│
└──────────┼─────────────────────┼────────────────────────────────┘
           │                     │
           │                     │ HTTPS/REST
           │                     │
           │ WebSocket           │
           │ (Audio Stream)      │
           │                     │
┌──────────▼─────────────────────▼──────────────────────────────┐
│ VERCEL EDGE NETWORK (30+ regions)                             │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Next.js 15 App Router                                     │  │
│ │ ┌────────────────┐  ┌────────────────┐  ┌──────────────┐│  │
│ │ │ /api/ws        │  │ /api/auth      │  │ /api/bookings││  │
│ │ │ (WebSocket)    │  │ (NextAuth)     │  │ (REST)       ││  │
│ │ └───────┬────────┘  └────────┬───────┘  └──────┬───────┘│  │
│ │         │                    │                  │        │  │
│ │         │ Real-time          │ Auth             │ CRUD   │  │
│ │         │ Audio              │                  │        │  │
│ └─────────┼────────────────────┼──────────────────┼────────┘  │
└───────────┼────────────────────┼──────────────────┼───────────┘
            │                    │                  │
            │                    │                  │
┌───────────▼────────────────────▼──────────────────▼───────────┐
│ SUPABASE (Backend as a Service)                               │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────┐│
│ │ PostgreSQL   │ │ Auth         │ │ Realtime    │ │ Storage││
│ │ + pgvector   │ │ (JWT)        │ │ (WebSocket) │ │ (S3)   ││
│ └──────┬───────┘ └──────────────┘ └─────────────┘ └────────┘│
│        │                                                       │
│        │ Vector Similarity Search                             │
│        │                                                       │
└────────┼───────────────────────────────────────────────────────┘
         │
         │ Webhook Triggers
         │
┌────────▼───────────────────────────────────────────────────────┐
│ n8n WORKFLOWS (Automation)                                     │
│ ┌────────────────────┐  ┌──────────────────────────────────┐  │
│ │ Google Drive Sync  │  │ Manual Document Ingestion        │  │
│ │ ├─ Watch folder    │  │ ├─ Upload via Dashboard          │  │
│ │ ├─ Download file   │  │ ├─ Extract text (OCR/parser)     │  │
│ │ ├─ Extract text    │  │ ├─ Chunk documents                │  │
│ │ ├─ Generate embed  │  │ ├─ Generate embeddings (OpenAI)  │  │
│ │ └─ Store vector    │  │ └─ Store in Supabase pgvector    │  │
│ └────────────────────┘  └──────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
         │                           │
         │                           │
┌────────▼───────────────────────────▼────────────────────────────┐
│ EXTERNAL APIs                                                   │
│ ┌──────────────────┐  ┌────────────────┐  ┌─────────────────┐ │
│ │ ElevenLabs       │  │ OpenAI         │  │ Google Drive    │ │
│ │ ├─ STT           │  │ ├─ GPT-4o      │  │ ├─ File access  │ │
│ │ ├─ TTS           │  │ └─ Embeddings  │  │ └─ Watch API    │ │
│ │ └─ Voice Agent   │  │                │  │                 │ │
│ └──────────────────┘  └────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Frontend Layer

#### Voice Widget
```typescript
// Real-time audio streaming architecture
┌─────────────────────────────────────────┐
│ VoiceWidget.tsx                         │
│ ┌─────────────────────────────────────┐ │
│ │ 1. Capture Audio                    │ │
│ │    MediaRecorder API                │ │
│ │    ↓                                │ │
│ │ 2. Send via WebSocket               │ │
│ │    Binary audio chunks              │ │
│ │    ↓                                │ │
│ │ 3. Receive Responses                │ │
│ │    - Transcription                  │ │
│ │    - Intent                         │ │
│ │    - Audio response (TTS)           │ │
│ │    ↓                                │ │
│ │ 4. Play Audio + Execute Actions     │ │
│ │    - Play TTS audio                 │ │
│ │    - Scroll/navigate/fill forms     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Design Decisions:**
- **WebSocket vs HTTP:** WebSocket for low-latency duplex audio streaming
- **Audio Format:** Opus codec, 16kHz, mono (optimized for voice)
- **Chunk Size:** 100-200ms chunks for balance of latency vs efficiency

#### Dashboard
```typescript
// Real-time analytics architecture
┌─────────────────────────────────────────┐
│ Dashboard.tsx                           │
│ ┌─────────────────────────────────────┐ │
│ │ 1. Subscribe to Supabase Realtime   │ │
│ │    conversations table              │ │
│ │    ↓                                │ │
│ │ 2. Receive INSERT/UPDATE events     │ │
│ │    Live conversation updates        │ │
│ │    ↓                                │ │
│ │ 3. Update Charts/Metrics            │ │
│ │    React state + Recharts           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Data Flow:**
1. New conversation → Supabase INSERT
2. Supabase Realtime broadcasts to subscribed clients
3. Dashboard receives event, updates state
4. React re-renders charts (sentiment, intent, etc.)

### 2. Backend Layer (Vercel Edge)

#### WebSocket Handler (`/api/ws`)
```typescript
// WebSocket conversation flow
┌──────────────────────────────────────────────────────┐
│ /api/ws WebSocket Handler                           │
│                                                      │
│ 1. RECEIVE: Audio chunk (binary)                    │
│    ↓                                                 │
│ 2. FORWARD → ElevenLabs STT                         │
│    ↓                                                 │
│ 3. RECEIVE: Transcription text                      │
│    ↓                                                 │
│ 4. SEND → OpenAI GPT-4o                            │
│    Prompt: "You are a [role]. User said: [text]"    │
│    Context: [conversation history]                   │
│    Knowledge: [RAG from pgvector]                    │
│    ↓                                                 │
│ 5. RECEIVE: AI response + intent                    │
│    ↓                                                 │
│ 6. PARALLEL:                                         │
│    ├─ Store conversation in Supabase                │
│    ├─ Send → ElevenLabs TTS (get audio)            │
│    └─ Determine web actions (scroll, navigate)      │
│    ↓                                                 │
│ 7. SEND to client:                                   │
│    {                                                 │
│      transcription: "user text",                     │
│      response: "AI text",                           │
│      audio: <binary TTS audio>,                     │
│      actions: [{type: "scroll", target: "#pricing"}]│
│    }                                                 │
└──────────────────────────────────────────────────────┘
```

**Latency Budget:**
- STT: ~200-300ms (ElevenLabs)
- RAG query: ~50-100ms (pgvector)
- LLM response: ~500-800ms (GPT-4o)
- TTS: ~200-300ms (ElevenLabs)
- **Total: 950-1500ms** (target <1000ms for good UX)

**Optimization Strategies:**
1. **Streaming LLM response:** Start TTS before full LLM response
2. **Parallel RAG query:** Run while waiting for full transcription
3. **Edge caching:** Cache common intents/responses
4. **Connection pooling:** Reuse HTTP connections to APIs

#### RAG Integration
```typescript
// Vector search for knowledge retrieval
┌────────────────────────────────────────────────┐
│ RAG Query Flow                                 │
│                                                │
│ 1. User question: "What are your prices?"      │
│    ↓                                           │
│ 2. Generate embedding (OpenAI)                 │
│    vector = embed("What are your prices?")     │
│    ↓                                           │
│ 3. Similarity search (pgvector)                │
│    SELECT content, metadata                    │
│    FROM knowledge_base                         │
│    ORDER BY embedding <=> vector               │
│    LIMIT 5                                     │
│    ↓                                           │
│ 4. Context augmentation                        │
│    Relevant docs: [doc1, doc2, doc3]           │
│    ↓                                           │
│ 5. LLM prompt:                                 │
│    "Context: [docs]                            │
│     User question: [question]                  │
│     Answer based on context only"              │
│    ↓                                           │
│ 6. AI response with citations                  │
└────────────────────────────────────────────────┘
```

### 3. Data Layer (Supabase)

#### Database Schema (Simplified)
```sql
-- Users (Auth handled by Supabase Auth)
users (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamp
)

-- Conversations
conversations (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  started_at timestamp,
  ended_at timestamp,
  sentiment text, -- positive/neutral/negative
  intent text, -- sales/support/booking/etc
  lead_score int, -- 1-10
  converted boolean,
  metadata jsonb
)

-- Messages
messages (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  role text, -- user/assistant
  content text,
  audio_url text,
  timestamp timestamp
)

-- Bookings
bookings (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),
  user_name text,
  user_email text,
  user_phone text,
  date date,
  time time,
  duration interval,
  status text, -- pending/confirmed/cancelled
  notes text
)

-- Knowledge Base (RAG)
knowledge_base (
  id uuid PRIMARY KEY,
  content text,
  embedding vector(1536), -- OpenAI embedding size
  metadata jsonb, -- source, title, date, etc
  created_at timestamp
)

-- Vector similarity index
CREATE INDEX ON knowledge_base
USING ivfflat (embedding vector_cosine_ops);
```

### 4. Workflow Layer (n8n)

#### Google Drive Auto-sync Workflow
```
┌─────────────────────────────────────────────────┐
│ n8n Workflow: Google Drive → Knowledge Base    │
│                                                 │
│ 1. [Trigger] Google Drive Watch                │
│    Event: File created/modified in folder      │
│    ↓                                            │
│ 2. [Action] Download File                      │
│    Google Drive API                            │
│    ↓                                            │
│ 3. [Action] Extract Text                       │
│    PDF → text (pdf-parse)                      │
│    DOCX → text (mammoth)                       │
│    ↓                                            │
│ 4. [Action] Chunk Document                     │
│    Split into 500-token chunks with overlap    │
│    ↓                                            │
│ 5. [Loop] For each chunk:                      │
│    │                                            │
│    ├─ [Action] Generate Embedding              │
│    │  OpenAI text-embedding-3-small            │
│    │  ↓                                         │
│    └─ [Action] Insert into Supabase            │
│       INSERT INTO knowledge_base               │
│       (content, embedding, metadata)           │
└─────────────────────────────────────────────────┘
```

## Data Flow Patterns

### Pattern 1: Voice Conversation Flow
```
User speaks
  → Browser captures audio (MediaRecorder)
  → WebSocket sends chunks to /api/ws
  → Vercel Edge forwards to ElevenLabs STT
  → ElevenLabs returns transcription
  → Vercel Edge queries Supabase pgvector (RAG)
  → Vercel Edge sends to OpenAI GPT-4o (w/ context)
  → OpenAI returns response + intent
  → Vercel Edge sends to ElevenLabs TTS
  → ElevenLabs returns audio
  → Vercel Edge stores in Supabase (conversation, message)
  → WebSocket sends to browser (audio + actions)
  → Browser plays audio + executes web actions
  → Dashboard updates in real-time (Supabase Realtime)
```

### Pattern 2: Knowledge Base Update Flow
```
Admin uploads document
  → Dashboard sends to /api/upload
  → Vercel Edge stores in Supabase Storage
  → Vercel Edge triggers n8n webhook
  → n8n downloads file
  → n8n extracts text (OCR/parser)
  → n8n chunks document
  → n8n generates embeddings (OpenAI)
  → n8n inserts into Supabase pgvector
  → Knowledge base updated
  → Assistant can now answer questions about document
```

### Pattern 3: Real-time Analytics Flow
```
New conversation starts
  → WebSocket handler creates record in Supabase
  → INSERT INTO conversations (...)
  → Supabase Realtime broadcasts event
  → Dashboard subscribed to conversations table
  → Dashboard receives INSERT event
  → React state updates
  → Charts re-render with new data
  → Sentiment analysis runs (async)
  → UPDATE conversations SET sentiment = ...
  → Dashboard receives UPDATE event
  → Charts update again with sentiment
```

## Build Order (Dependency-driven)

### Phase 1: Foundation
1. **Supabase setup** (database, auth, storage)
2. **Next.js project** (frontend + API routes)
3. **Basic auth flow** (email/password, Google OAuth)

### Phase 2: Voice Core
4. **ElevenLabs integration** (STT, TTS)
5. **WebSocket handler** (audio streaming)
6. **Voice widget UI** (capture, play, visualize)
7. **LLM integration** (OpenAI GPT-4o)
8. **Basic conversation flow** (STT → LLM → TTS)

### Phase 3: Intelligence
9. **RAG pipeline** (pgvector setup)
10. **n8n workflows** (document ingestion)
11. **Knowledge base UI** (upload, sync)
12. **Intent classification** (LLM prompts)

### Phase 4: Automation
13. **Web automation** (scroll, navigate, form fill)
14. **Booking system** (calendar, CRUD)
15. **Working hours logic**

### Phase 5: Analytics
16. **Conversation storage** (messages, metadata)
17. **Sentiment analysis** (LLM-based)
18. **Dashboard UI** (charts, tables)
19. **Real-time updates** (Supabase Realtime)

## Sources

Research based on:
- [Building Voice Agent with RAG (NVIDIA)](https://developer.nvidia.com/blog/how-to-build-a-voice-agent-with-rag-and-safety-guardrails/)
- [Real-Time Voice-to-Voice Conversational Agent with RAG](https://medium.com/@geetmanik2/building-a-real-time-voice-to-voice-conversational-agent-with-retrieval-augmented-generation-rag-92c090d91934)
- [Reducing RAG Pipeline Latency for Real-Time Voice](https://developer.vonage.com/en/blog/reducing-rag-pipeline-latency-for-real-time-voice-conversations)
- [Low-Latency End-to-End Voice Agents](https://arxiv.org/html/2508.04721v1)
- [Speech-to-Speech Models in 2026](https://ai.ksopyla.com/posts/voice-to-voice-models-2026-review/)
