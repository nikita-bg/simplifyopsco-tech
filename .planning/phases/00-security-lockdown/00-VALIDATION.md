---
phase: 0
slug: security-lockdown
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 0 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (backend), Playwright (frontend) |
| **Config file** | `backend/tests/conftest.py`, `frontend/playwright.config.ts` |
| **Quick run command** | `cd backend && python -m pytest tests/ -v -x` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/ -v -x`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green + gitleaks scan clean
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 00-01-01 | 01 | 1 | SEC-01 | manual | Manual: try old DB password, old API keys | N/A | ⬜ pending |
| 00-01-02 | 01 | 1 | SEC-04 | smoke | `gitleaks detect --source . --no-git` | N/A | ⬜ pending |
| 00-02-01 | 02 | 1 | SEC-02 | integration | `pre-commit run --all-files` | N/A | ⬜ pending |
| 00-02-02 | 02 | 1 | SEC-03 | unit | `cd backend && python -m pytest tests/test_voice_signed_url.py -x` | ❌ W0 | ⬜ pending |
| 00-02-03 | 02 | 1 | SEC-04 | smoke | `gitleaks detect --source . --no-git` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_voice_signed_url.py` — stubs for SEC-03 (signed URL endpoint returns valid response, handles missing config, handles ElevenLabs API errors)
- [ ] Verify existing 74 tests still pass after credential rotation

*Existing infrastructure covers SEC-01 (manual), SEC-02 (gitleaks tool), SEC-04 (gitleaks scan).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Old credentials no longer authenticate | SEC-01 | Requires real credential rotation in external services | 1. Try connecting to Neon DB with old password 2. Try calling ElevenLabs API with old key 3. Try calling OpenAI API with old key |
| ElevenLabs agent authentication enabled | SEC-03 | Requires ElevenLabs Dashboard toggle | 1. Check agent security settings 2. Verify widget fails without signed URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
