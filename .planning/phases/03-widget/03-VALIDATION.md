---
phase: 3
slug: widget
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (already installed) |
| **Config file** | None (uses default discovery; conftest.py in `backend/tests/`) |
| **Quick run command** | `cd backend && python -m pytest tests/test_widget_config.py -x -q` |
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
| 3-01-01 | 01 | 1 | WDG-01, WDG-02, WDG-04 | unit | `cd backend && python -m pytest tests/test_widget_config.py -x` | No - W0 | pending |
| 3-01-02 | 01 | 1 | WDG-03, WDG-07 | unit | `cd backend && python -m pytest tests/test_widget_config.py -x` | No - W0 | pending |
| 3-02-01 | 02 | 2 | WDG-01, WDG-02 | smoke | Manual browser test | N/A | pending |
| 3-02-02 | 02 | 2 | WDG-05, WDG-06 | smoke | Manual browser test | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_widget_config.py` — stubs for WDG-01, WDG-02, WDG-04, WDG-07 (widget config endpoint tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Widget loads correct agent on merchant site | WDG-01 | Requires browser + embed script | 1. Create test HTML with embed script 2. Verify agent loads |
| iOS Safari audio works | WDG-06 | Requires iOS device | 1. Open widget on iPhone Safari 2. Tap to start voice |
| Mic permission denied shows clear message | WDG-05 | Requires browser mic prompt | 1. Deny mic permission 2. Verify fallback UI |
| Disabled agent shows graceful fallback | WDG-04 | End-to-end visual test | 1. Disable agent in DB 2. Load widget 3. Verify fallback message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
