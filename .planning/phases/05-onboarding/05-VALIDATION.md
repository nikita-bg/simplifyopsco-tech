---
phase: 5
slug: onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (backend), Playwright (frontend) |
| **Quick run command** | `cd backend && python -m pytest tests/test_onboarding.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Frontend type check** | `cd frontend && npx tsc --noEmit` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/ -x -q`
- **After frontend tasks:** Run `cd frontend && npx tsc --noEmit`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | ONB-01, ONB-06 | unit | `cd backend && python -m pytest tests/test_onboarding.py -x` | No - W0 | pending |
| 5-01-02 | 01 | 1 | ONB-04 | unit | `cd backend && python -m pytest tests/test_onboarding.py -x` | No - W0 | pending |
| 5-02-01 | 02 | 2 | ONB-01, ONB-04 | typecheck | `cd frontend && npx tsc --noEmit` | N/A | pending |
| 5-02-02 | 02 | 2 | ONB-03 | typecheck | `cd frontend && npx tsc --noEmit` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_onboarding.py` — stubs for ONB-01 through ONB-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full signup → agent live < 5min | ONB-07 | End-to-end timing | 1. Sign up as new merchant 2. Time until agent responds |
| Shopify OAuth redirect | ONB-03 | External OAuth flow | 1. Click "Connect Shopify" 2. Verify redirect + callback |
| Progress indicator animates | ONB-04 | Visual behavior | 1. Sign up 2. Watch progress steps render |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
