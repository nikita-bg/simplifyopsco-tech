# Research Summary: Voice AI Platform

**Project:** SimplifyOps Voice AI Platform
**Research Date:** 2026-03-02
**Milestone:** v1 Working Demo (Greenfield)

---

## Executive Summary

Research into the Voice AI conversational platform ecosystem reveals a mature but challenging space. Success depends on managing latency (<1000ms target), preventing LLM hallucinations through strict RAG grounding, and building resilient web automation. The recommended stack (Next.js 15 + Supabase + ElevenLabs + OpenAI) provides a modern, cost-effective foundation, while competitive analysis shows SimplifyOps' unique positioning through **web automation** and **demo-first go-to-market**.

---

## Key Findings

### 1. Technology Stack (STACK.md)

**Recommended Foundation:**
```
Frontend:   Next.js 15 + Tailwind CSS (existing)
Voice:      ElevenLabs (STT, TTS, Voice Agents)
LLM:        OpenAI GPT-4o (reasoning, intent)
Database:   Supabase (PostgreSQL + pgvector + Auth + Realtime)
Deployment: Vercel (all-in-one, <50ms cold start)
Workflows:  n8n (existing RAG pipelines)
```

**Why This Stack:**
- **Supabase:** Auth + Database + Vector + Realtime in one service
  - pgvector eliminates separate vector DB (Pinecone)
  - Native PostgreSQL = familiar SQL queries
  - Row-level security for multi-tenancy (v2)

- **ElevenLabs:** Best-in-class voice quality
  - <300ms TTS latency
  - Voice cloning for brand customization
  - Conversational AI API handles duplex audio

- **Vercel + Next.js 15:**
  - Serverless scales with usage (no idle costs)
  - 30+ edge regions (low latency globally)
  - Built-in API routes for backend logic

- **n8n:** Visual workflows already designed
  - Google Drive → Vector Store sync
  - No-code knowledge base management

**What to Avoid:**
- ❌ Firebase (Supabase better for SQL + vectors)
- ❌ Separate Vector DB initially (pgvector sufficient for v1)
- ❌ Twilio Voice (ElevenLabs simpler, higher quality)
- ❌ Custom ASR/TTS (ElevenLabs production-ready)

**Integration Architecture:**
```
Browser (Voice Widget + Dashboard)
    ↓ WebSocket / HTTPS
Vercel Edge (Next.js API Routes)
    ↓
├─→ Supabase (PostgreSQL + pgvector + Auth)
├─→ ElevenLabs (STT, TTS, Conversational AI)
├─→ OpenAI (GPT-4o, Embeddings)
└─→ n8n Workflows (RAG pipeline automation)
```

---

### 2. Feature Landscape (FEATURES.md)

**Table Stakes (Must-Have for v1):**
| Category | Features |
|----------|----------|
| **Voice Interaction** | STT, TTS, Interruption handling, Multi-turn conversation |
| **Intelligence** | Intent classification, Context awareness, Sentiment analysis |
| **Knowledge Base** | Document upload, Vector search, Auto-sync (Google Drive) |
| **Web Automation** | Page navigation, Scrolling, Form filling, Modal control |
| **Booking** | Availability check, Appointment booking, Calendar integration |
| **Analytics** | Conversation count, Sentiment, Intent, Conversion tracking |

**SimplifyOps Differentiators:**
1. **Web Automation** - Unique to us vs competitors
   - Voice-controlled UI (scroll, navigate, fill forms)
   - "Show me pricing" → auto-scrolls + explains
   - Voiceflow/Vapi focus on phone/chat, not web control

2. **Demo-First Go-to-Market**
   - Working demo as sales tool (this site)
   - Show value before asking for credit card
   - Lower barrier than Vapi (developer-heavy) or Synthflow (template-first)

3. **All-in-One Simplicity**
   - Not 35+ LLM options (Vapi) - just works
   - Not complex no-code builder (Voiceflow) - straightforward
   - Beautiful UI/UX (glassmorphic design)

**Competitive Positioning:**
```
SimplifyOps:  Web automation + Demo-first + Beautiful UX
Voiceflow:    No-code builder + Chatbot focus
Vapi.ai:      Developer-first + 35+ LLMs + Phone calls
Synthflow:    Templates + Workflows + WordPress plugin
Air.ai:       Enterprise phone calls (expensive, slow setup)
```

**v1 vs v2 Scope:**
- **v1 Demo:** Voice widget works on this site, shows product value
- **v2 Platform:** Multi-tenant, business signup, widget installation

---

### 3. Architecture Patterns (ARCHITECTURE.md)

**Critical Architectural Decisions:**

#### Latency Budget (Target: <1000ms total)
```
STT (ElevenLabs):        200-300ms
RAG Query (pgvector):    50-100ms
LLM Response (GPT-4o):   500-800ms
TTS (ElevenLabs):        200-300ms
────────────────────────────────
TOTAL:                   950-1500ms
```

**Optimization Strategies:**
1. **Streaming LLM response** → Start TTS before full completion
2. **Parallel RAG query** → Run while transcription processes
3. **Edge caching** → Cache common intents/responses
4. **Connection pooling** → Reuse HTTP connections

#### WebSocket Conversation Flow
```
User speaks
  → Browser captures (MediaRecorder API)
  → WebSocket sends chunks → /api/ws
  → Vercel Edge → ElevenLabs STT
  → Transcription → OpenAI GPT-4o (with RAG context)
  → Response → ElevenLabs TTS
  → Audio + Actions → Browser
  → Play audio + Execute (scroll/navigate/form fill)
  → Store in Supabase → Dashboard updates (Realtime)
```

#### RAG Pipeline (n8n → Supabase pgvector)
```
Google Drive file created/modified
  → n8n watches folder
  → Downloads file → Extracts text (PDF/DOCX)
  → Chunks document (500-token chunks)
  → Generates embeddings (OpenAI text-embedding-3-small)
  → Stores in Supabase pgvector
  → Assistant can now answer questions
```

**Database Schema (Simplified):**
- `users` - Auth (Supabase Auth manages)
- `conversations` - Session metadata (sentiment, intent, converted)
- `messages` - Individual turns (role, content, audio_url)
- `bookings` - Appointments (date, time, status)
- `knowledge_base` - Documents + embeddings (vector search)

#### Build Order (Dependency-driven)
```
Phase 1: Foundation
  → Supabase setup (database, auth)
  → Next.js project (frontend + API)
  → Basic auth flow

Phase 2: Voice Core
  → ElevenLabs integration (STT, TTS)
  → WebSocket handler (audio streaming)
  → Voice widget UI
  → LLM integration (GPT-4o)

Phase 3: Intelligence
  → RAG pipeline (pgvector)
  → n8n workflows (document ingestion)
  → Intent classification

Phase 4: Automation
  → Web automation (scroll, navigate, forms)
  → Booking system (calendar CRUD)

Phase 5: Analytics
  → Conversation storage + metadata
  → Sentiment analysis (LLM-based)
  → Dashboard UI (charts, tables)
  → Real-time updates (Supabase Realtime)
```

---

### 4. Critical Pitfalls (PITFALLS.md)

**Top 5 Project-Killing Mistakes:**

#### 1. Latency Death Spiral 🔴 CRITICAL
**Problem:** >800ms response time feels broken
**Prevention:**
- Measure latency at each step (STT, RAG, LLM, TTS)
- Implement streaming (LLM → TTS overlap)
- Parallelize where possible (RAG query during transcription)
- Dashboard: P95/P99 latency metrics

**Phase:** Phase 2 (Voice Core) + Phase 5 (Analytics)

#### 2. LLM Hallucinations 🔴 CRITICAL
**Problem:** AI confidently makes up information (pricing, features, availability)
**Prevention:**
- **Strict RAG grounding:** "Answer ONLY from provided context"
- Confidence scoring (similarity threshold >0.8)
- Structured outputs (JSON mode for critical data)
- Human handoff triggers (low confidence, sensitive topics)

**Phase:** Phase 3 (Intelligence)

#### 3. API Cost Explosions 💸 CRITICAL
**Problem:** 10K conversations = $5K-$10K/month in API costs
**Prevention:**
- Rate limiting (100 req/min per user)
- Caching (TTS audio for common phrases, RAG embeddings)
- Smart batching (OpenAI embeds up to 2048 inputs)
- Cost dashboard ($/conversation metric)

**Phase:** Phase 2 (Voice Core) + Phase 3 (Intelligence) + Phase 5 (Analytics)

#### 4. Web Automation Breakage 🟠 HIGH
**Problem:** Hardcoded selectors break when DOM changes
**Prevention:**
- Resilient selectors (data-* attributes, semantic HTML)
- Multiple fallbacks (ID → class → text content)
- Graceful failure (verbal description if automation fails)

**Phase:** Phase 4 (Automation)

#### 5. Privacy & Data Security 🔒 CRITICAL
**Problem:** GDPR/CCPA violations from improper data handling
**Prevention:**
- Encrypt transcripts at rest + in transit
- Data retention policy (auto-delete after 90 days)
- PII redaction ("[REDACTED]" for credit cards, etc.)
- Row-level security (Supabase RLS)

**Phase:** Phase 1 (Foundation)

**Other Notable Pitfalls:**
- **Interruption Handling:** VAD (Voice Activity Detection) to pause when user speaks
- **Accent/Noise Issues:** STT confidence scoring + clarification prompts
- **Knowledge Freshness:** Auto-sync (n8n) + version control + age monitoring

---

## Strategic Recommendations

### v1 Demo Success Criteria
1. **Latency:** <1000ms average response time
2. **Accuracy:** >90% STT accuracy, >85% intent classification
3. **Reliability:** <1% error rate in web automation
4. **Cost:** <$0.20 per conversation (target)
5. **UX:** Users complete booking flow >60% of time

### Technology Choices Validated
✅ **Next.js 15 + Vercel:** Best for serverless + edge deployment
✅ **Supabase:** Auth + DB + Vector + Realtime in one
✅ **ElevenLabs:** Superior voice quality + low latency
✅ **n8n:** Existing workflows reduce development time

### Competitive Moat
1. **Web Automation** - No competitor does this well
2. **Demo-First Sales** - Show don't tell approach
3. **Glassmorphic UI** - Beautiful design stands out

### Critical Unknowns / Risks
⚠️ **ElevenLabs Conversational AI API:** New product, limited docs (fallback: manual WebSocket orchestration)
⚠️ **pgvector Scale:** May need Pinecone if >1M vectors (unlikely in v1)
⚠️ **n8n Reliability:** Self-hosted vs cloud? (recommend cloud initially)

---

## Sources

This research synthesizes findings from:

**Stack:**
- [Supabase ElevenLabs Integration](https://elevenlabs.io/agents/integrations/supabase)
- [Vercel ElevenLabs Integration](https://vercel.com/docs/ai/elevenlabs)
- [Building Real-Time AI Voice Assistant](https://neon.com/guides/pulse)
- [Best Developer Tools for 2026](https://www.buildmvpfast.com/blog/best-developer-tools-2026-tech-stack)

**Features:**
- [Synthflow vs Vapi AI Comparison](https://www.dialora.ai/blog/synthflow-vs-vapi-ai-comparison)
- [Vapi AI Alternatives 2026](https://www.lindy.ai/blog/vapi-ai-alternatives)
- [Synthflow vs Vapi Performance](https://softailed.com/blog/synthflow-ai-vs-vapi)

**Architecture:**
- [Building Voice Agent with RAG (NVIDIA)](https://developer.nvidia.com/blog/how-to-build-a-voice-agent-with-rag-and-safety-guardrails/)
- [Real-Time Voice-to-Voice with RAG](https://medium.com/@geetmanik2/building-a-real-time-voice-to-voice-conversational-agent-with-retrieval-augmented-generation-rag-92c090d91934)
- [Reducing RAG Latency for Voice](https://developer.vonage.com/en/blog/reducing-rag-pipeline-latency-for-real-time-voice-conversations)

**Pitfalls:**
- [Troubleshooting Voice Agent Issues](https://www.retellai.com/blog/troubleshooting-common-issues-in-voice-agent-development)
- [The 300ms Rule: Voice AI Latency](https://www.assemblyai.com/blog/low-latency-voice-ai)
- [Voice AI Challenges](https://www.beconversive.com/blog/voice-ai-challenges)
- [Top 8 Mistakes in Voice Agents](https://callrounded.com/blog/mistakes-to-avoid-ai-voice-agent)

---

## Next Steps

With research complete, we're ready to:

1. **Define Requirements** (Step 7)
   - Translate features into specific, testable requirements
   - Scope v1 vs v2 clearly
   - Map to research findings

2. **Create Roadmap** (Step 8)
   - Derive phases from requirements
   - Follow recommended build order (dependency-driven)
   - Map success criteria per phase

3. **Begin Implementation** (Post-GSD Init)
   - `/gsd:discuss-phase 1` for deep context gathering
   - `/gsd:plan-phase 1` for detailed task breakdown
   - `/gsd:execute-phase 1` for parallel execution

**Research complete. Ready to build.** ✓
