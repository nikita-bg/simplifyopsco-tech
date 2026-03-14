---
phase: 8
slug: analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 8 — Validation Strategy

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (backend), TypeScript check (frontend) |
| **Quick run command** | `cd backend && python -m pytest tests/test_analytics.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Frontend type check** | `cd frontend && npx tsc --noEmit` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** `cd backend && python -m pytest tests/ -x -q`
- **After frontend tasks:** `cd frontend && npx tsc --noEmit`
- **Max feedback latency:** 20 seconds

---

## Wave 0 Requirements

- [ ] `tests/test_analytics.py` — stubs for ANL-01 through ANL-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Charts render correctly | ANL-05 | Visual behavior | 1. Open analytics 2. Check bar chart |
| Transcript click-through | ANL-04 | Navigation UX | 1. Click conversation row 2. Verify transcript loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity
- [ ] Feedback latency < 20s

**Approval:** pending
