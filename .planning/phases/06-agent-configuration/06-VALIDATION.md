---
phase: 6
slug: agent-configuration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio (backend), TypeScript check (frontend) |
| **Quick run command** | `cd backend && python -m pytest tests/test_agent_config.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v` |
| **Frontend type check** | `cd frontend && npx tsc --noEmit` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/ -x -q`
- **After frontend tasks:** Run `cd frontend && npx tsc --noEmit`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v`
- **Max feedback latency:** 20 seconds

---

## Wave 0 Requirements

- [ ] `tests/test_agent_config.py` — stubs for CFG-01 through CFG-08

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Voice preview audio plays | CFG-01 | Browser audio playback | 1. Open config page 2. Click voice preview button |
| Color picker renders correctly | CFG-03 | Visual behavior | 1. Open config page 2. Pick a color, verify widget preview |
| Live agent preview responds | CFG-08 | ElevenLabs WebRTC | 1. Click "Test Agent" 2. Speak and verify response |
| Widget enable/disable propagates to embed | CFG-04 | End-to-end widget load | 1. Disable agent 2. Load embed on test page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
