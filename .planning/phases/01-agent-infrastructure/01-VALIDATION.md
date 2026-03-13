---
phase: 1
slug: agent-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (already installed) |
| **Config file** | None (uses default discovery; conftest.py in `backend/tests/`) |
| **Quick run command** | `cd backend && python -m pytest tests/ -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/ -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | DB-01, DB-03, DB-04 | smoke | `cd backend && python -m pytest tests/test_migrations.py -x` | No - W0 | pending |
| 1-01-02 | 01 | 1 | AGT-06 | unit | `cd backend && python -m pytest tests/test_agent_templates.py -x` | No - W0 | pending |
| 1-02-01 | 02 | 2 | AGT-01, AGT-05 | unit | `cd backend && python -m pytest tests/test_elevenlabs_service.py::TestCreateAgent -x` | No - W0 | pending |
| 1-02-02 | 02 | 2 | AGT-02 | unit | `cd backend && python -m pytest tests/test_elevenlabs_service.py::TestUpdateAgent -x` | No - W0 | pending |
| 1-02-03 | 02 | 2 | AGT-03 | unit | `cd backend && python -m pytest tests/test_elevenlabs_service.py::TestDeleteAgent -x` | No - W0 | pending |
| 1-03-01 | 03 | 3 | AGT-04 | unit | `cd backend && python -m pytest tests/test_agent_endpoints.py -x` | No - W0 | pending |
| 1-03-02 | 03 | 3 | DB-02 | smoke | Already verified by migration 001 | Existing | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_elevenlabs_service.py` — stubs for AGT-01, AGT-02, AGT-03, AGT-05 (mocked httpx calls)
- [ ] `tests/test_agent_endpoints.py` — stubs for AGT-04 (API endpoint tests for agent CRUD)
- [ ] `tests/test_agent_templates.py` — stubs for AGT-06 (template CRUD and seeding)
- [ ] `tests/test_migrations.py` — stubs for DB-01, DB-03, DB-04 (verify SQL syntax is valid)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ElevenLabs agent actually created | AGT-01 | External API side-effect | 1. Create store via API 2. Check ElevenLabs dashboard for new agent |
| Agent update propagates to ElevenLabs | AGT-02 | External API side-effect | 1. Update agent voice/greeting 2. Verify change in ElevenLabs dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
