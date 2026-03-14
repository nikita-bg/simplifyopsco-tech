---
phase: 7
slug: billing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 7 — Validation Strategy

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (backend), TypeScript check (frontend) |
| **Quick run command** | `cd backend && python -m pytest tests/test_billing.py -x -q` |
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

- [ ] `tests/test_billing.py` — stubs for BIL-01 through BIL-09

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout redirect | BIL-01 | External Stripe redirect | 1. Click upgrade 2. Verify Stripe Checkout loads |
| Stripe Customer Portal | BIL-08 | External portal redirect | 1. Click "Manage Billing" 2. Verify portal loads |
| Trial expiry behavior | BIL-09 | Time-dependent | 1. Create trial store 2. Fast-forward trial_ends_at 3. Verify prompts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
