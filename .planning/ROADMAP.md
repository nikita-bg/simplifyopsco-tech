# Roadmap: SimplifyOps Voice AI Platform

## Overview

This roadmap delivers a working voice AI demo that showcases the platform's capabilities to potential business customers. Starting from infrastructure foundation, we build the voice conversation engine, add intelligence through RAG and LLM reasoning, enable web automation and booking, then polish with analytics and demo site refinement. Each phase delivers a complete, verifiable capability that moves us toward a demo that can sell the product.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Infrastructure** - Deploy Next.js app, Supabase database, establish security baseline
- [ ] **Phase 2: Authentication** - Business owners can sign up, sign in, and access protected dashboard
- [ ] **Phase 3: Voice Core Engine** - Users can speak to assistant and receive natural voice responses
- [ ] **Phase 4: LLM Intelligence** - Assistant understands intent, maintains context, handles multiple roles
- [ ] **Phase 5: Knowledge Base & RAG** - Assistant answers questions from knowledge base documents
- [ ] **Phase 6: Web Automation** - Assistant controls website navigation, scrolling, forms on voice command
- [ ] **Phase 7: Booking System** - Users can book appointments via voice conversation
- [ ] **Phase 8: Analytics Dashboard** - Business owners see conversation metrics, sentiment, and transcripts
- [ ] **Phase 9: Demo Site Polish** - Landing page showcases product value with beautiful voice widget
- [ ] **Phase 10: Performance & Observability** - System monitors latency, costs, and errors for production readiness

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: Application infrastructure is deployed and secured for development
**Depends on**: Nothing (first phase)
**Requirements**: SYS-01, SYS-02, SYS-03, SYS-05
**Success Criteria** (what must be TRUE):
  1. Next.js application deploys successfully to Vercel
  2. Supabase database is configured with pgvector extension enabled
  3. n8n workflows are deployed and accessible
  4. All data transmissions use HTTPS encryption
  5. Environment variables are securely stored and accessible
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Authentication
**Goal**: Business owners can securely access their accounts
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can create account with email and password
  2. User can sign in with Google OAuth
  3. User can log in and stay authenticated across browser sessions
  4. User can access protected dashboard routes
  5. User can log out from any dashboard page
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Voice Core Engine
**Goal**: Users can have natural voice conversations with the assistant
**Depends on**: Phase 2
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, VOICE-07, VOICE-08
**Success Criteria** (what must be TRUE):
  1. User can activate voice assistant with button click on demo site
  2. Assistant transcribes spoken words in real-time with visual feedback
  3. Assistant responds with natural voice within 1000ms average latency
  4. Voice widget displays glassmorphic UI with waveform visualization
  5. Voice widget shows speaking, listening, and processing states clearly
  6. Assistant handles interruptions (barge-in) without breaking conversation
  7. Multi-turn conversations maintain audio quality and responsiveness
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: LLM Intelligence
**Goal**: Assistant understands user intent and adapts to different conversational roles
**Depends on**: Phase 3
**Requirements**: INTELL-01, INTELL-02, INTELL-03, INTELL-04, INTELL-05, INTELL-06
**Success Criteria** (what must be TRUE):
  1. Assistant correctly identifies user intent (booking, question, navigation, support)
  2. Assistant maintains conversation context across 5+ turns
  3. Assistant can switch between roles (receptionist, sales, support) based on configuration
  4. Assistant classifies conversation sentiment (positive/neutral/negative) accurately
  5. Assistant offers human handoff when confidence is low or topic is sensitive
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Knowledge Base & RAG
**Goal**: Assistant answers questions accurately from business knowledge documents
**Depends on**: Phase 4
**Requirements**: KB-01, KB-02, KB-03, KB-04, KB-05, KB-06, KB-07, KB-08
**Success Criteria** (what must be TRUE):
  1. Admin can upload documents (PDF, DOCX, TXT) through dashboard interface
  2. Documents automatically sync from configured Google Drive folder
  3. Assistant answers questions using document content (RAG pattern)
  4. Assistant refuses to answer when information is not in knowledge base
  5. Assistant provides confidence scores for knowledge-based responses
  6. Uploaded documents are searchable within 2 minutes of upload
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Web Automation
**Goal**: Assistant controls website navigation and interaction through voice commands
**Depends on**: Phase 3
**Requirements**: WEB-01, WEB-02, WEB-03, WEB-04, WEB-05, WEB-06
**Success Criteria** (what must be TRUE):
  1. User can ask assistant to scroll to specific page sections (pricing, about, contact)
  2. Assistant navigates between pages when requested
  3. Assistant opens and closes modals/popups on command
  4. Assistant fills form fields with data provided via voice
  5. Web automation works reliably with resilient selectors
  6. Assistant explains verbally when automation fails gracefully
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Booking System
**Goal**: Users can schedule appointments through voice conversation
**Depends on**: Phase 4
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07
**Success Criteria** (what must be TRUE):
  1. User can request appointment booking via voice
  2. Assistant checks real-time availability from calendar
  3. Assistant confirms booking details (date, time, contact info) before saving
  4. Booking appears in admin dashboard immediately after confirmation
  5. Admin can configure available time slots and booking duration
  6. User receives clear confirmation when booking is successful
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Analytics Dashboard
**Goal**: Business owners see actionable metrics about voice conversations
**Depends on**: Phase 4
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08
**Success Criteria** (what must be TRUE):
  1. Dashboard displays total conversation count and trend over time
  2. Dashboard shows sentiment analysis breakdown (% positive/neutral/negative)
  3. Dashboard shows intent distribution (what users are asking about)
  4. Dashboard displays conversion rate (leads and bookings from conversations)
  5. Dashboard shows conversation history with full transcripts
  6. Dashboard displays call duration metrics (average, min, max)
  7. Dashboard updates in real-time when new conversations happen
  8. Individual conversation details are viewable with transcript and metadata
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

### Phase 9: Demo Site Polish
**Goal**: Landing page effectively demonstrates product value to potential customers
**Depends on**: Phase 3, Phase 6
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05
**Success Criteria** (what must be TRUE):
  1. Landing page clearly showcases voice assistant capabilities
  2. Landing page has prominent call-to-action button to try live demo
  3. Voice widget is immediately visible and accessible on landing page
  4. Demo site explains product value proposition to business decision-makers
  5. Demo site maintains consistent glassmorphic dark mode design
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

### Phase 10: Performance & Observability
**Goal**: System is production-ready with monitoring and cost controls
**Depends on**: Phase 3, Phase 5, Phase 8
**Requirements**: SYS-04, SYS-06, SYS-07, SYS-08, SYS-09
**Success Criteria** (what must be TRUE):
  1. API rate limiting prevents abuse (configurable limits per user)
  2. PII redaction automatically scrubs sensitive data from transcripts
  3. Cost monitoring dashboard shows per-conversation cost metric
  4. Error tracking captures and alerts on critical failures
  5. Latency monitoring tracks P95/P99 metrics for each component (STT, LLM, TTS, RAG)
  6. System meets target metrics: <1000ms latency, <$0.20 per conversation
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → ... → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | 0/TBD | Not started | - |
| 2. Authentication | 0/TBD | Not started | - |
| 3. Voice Core Engine | 0/TBD | Not started | - |
| 4. LLM Intelligence | 0/TBD | Not started | - |
| 5. Knowledge Base & RAG | 0/TBD | Not started | - |
| 6. Web Automation | 0/TBD | Not started | - |
| 7. Booking System | 0/TBD | Not started | - |
| 8. Analytics Dashboard | 0/TBD | Not started | - |
| 9. Demo Site Polish | 0/TBD | Not started | - |
| 10. Performance & Observability | 0/TBD | Not started | - |
