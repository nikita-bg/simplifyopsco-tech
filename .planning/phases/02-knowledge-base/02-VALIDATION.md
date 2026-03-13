---
phase: 2
slug: knowledge-base
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (already installed) |
| **Config file** | None (uses default discovery; conftest.py in `backend/tests/`) |
| **Quick run command** | `cd backend && python -m pytest tests/ -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/ -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | KB-01, KB-02, KB-03 | unit | `cd backend && python -m pytest tests/test_kb_service.py -x` | No - W0 | pending |
| 2-01-02 | 01 | 1 | KB-07 | unit | `cd backend && python -m pytest tests/test_kb_service.py::TestSemanticSearch -x` | No - W0 | pending |
| 2-02-01 | 02 | 2 | KB-04 | unit | `cd backend && python -m pytest tests/test_kb_endpoints.py::TestManualProducts -x` | No - W0 | pending |
| 2-02-02 | 02 | 2 | KB-05, KB-06 | unit | `cd backend && python -m pytest tests/test_kb_endpoints.py::TestSyncStatus -x` | No - W0 | pending |
| 2-03-01 | 03 | 3 | KB-05 | smoke | `cd frontend && npm run build` | Existing | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_kb_service.py` — stubs for KB-01, KB-02, KB-03, KB-07 (mocked ElevenLabs KB + Gemini API calls)
- [ ] `tests/test_kb_endpoints.py` — stubs for KB-04, KB-05, KB-06 (API endpoint tests for KB management)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ElevenLabs KB document actually created | KB-01 | External API side-effect | 1. Sync products for a store 2. Check ElevenLabs dashboard for KB document |
| Agent can answer product questions | KB-02 | End-to-end voice interaction | 1. Ask agent about a synced product 2. Verify response uses product data |
| Gemini embeddings returned correct vectors | KB-07 | External API side-effect | 1. Insert product 2. Verify embedding stored in pgvector |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
