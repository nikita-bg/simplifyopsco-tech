---
phase: 9
slug: design-polish
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-14
---

# Phase 9 — Validation Strategy

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript check (frontend only) |
| **Quick run command** | `cd frontend && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** `cd frontend && npx tsc --noEmit`
- **Max feedback latency:** 15 seconds

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| Glassmorphism visual quality | DSN-01, DSN-02 | Visual design |
| Sidebar sizing across breakpoints | DSN-03 | Responsive layout |
| Live demo agent works | DSN-04 | ElevenLabs WebRTC |
| Mobile responsive across 4 viewports | DSN-05 | Visual + touch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
