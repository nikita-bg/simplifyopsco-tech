---
phase: 4
slug: automation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (already installed) |
| **Config file** | None (uses default discovery; conftest.py in `backend/tests/`) |
| **Quick run command** | `cd backend && python -m pytest tests/test_automation.py -x -q` |
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
| 4-01-01 | 01 | 1 | AUT-01, AUT-06 | unit | `cd backend && python -m pytest tests/test_automation.py::TestAutomationService -x` | No - W0 | pending |
| 4-01-02 | 01 | 1 | AUT-02 | unit | `cd backend && python -m pytest tests/test_automation.py::TestOnboardingWorkflow -x` | No - W0 | pending |
| 4-02-01 | 02 | 2 | AUT-03, AUT-04 | unit | `cd backend && python -m pytest tests/test_automation.py::TestSyncAndAlerts -x` | No - W0 | pending |
| 4-02-02 | 02 | 2 | AUT-05 | unit | `cd backend && python -m pytest tests/test_automation.py::TestPostCallAnalysis -x` | No - W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_automation.py` — stubs for AUT-01 through AUT-06 (mocked Resend + ElevenLabs API calls)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Resend email actually delivered | AUT-02, AUT-04 | External email delivery | 1. Trigger onboarding workflow 2. Check Resend dashboard for delivery |
| ElevenLabs webhook fires on conversation end | AUT-05 | External webhook trigger | 1. Complete a voice conversation 2. Verify webhook received |
| Scheduled sync runs on time | AUT-03 | Requires waiting for scheduler | 1. Set short schedule interval 2. Verify sync fires |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
