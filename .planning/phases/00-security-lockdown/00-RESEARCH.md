# Phase 0: Security Lockdown - Research

**Researched:** 2026-03-13
**Domain:** Credential rotation, secret scanning, secure API key delivery (ElevenLabs signed URLs)
**Confidence:** HIGH

## Summary

Phase 0 addresses a confirmed security emergency: production credentials (Neon DB password, Shopify API secret) were committed to git history in a public repository (commit `98996c8` in `docs/superpowers/specs/2026-03-12-vocalize-ai-launch-design.md`, now deleted but still in history). Additional credentials (ElevenLabs API key, OpenAI API key, Fernet encryption key, webhook secret) exist in the local `.env` file on disk. While `.env` is gitignored and was never committed, all credentials must be treated as compromised and rotated.

The codebase also has two structural security issues: (1) the ElevenLabs agent ID is hardcoded as a fallback in two frontend files (`VoiceWidget.tsx` line 91, `settings/page.tsx` line 8), and (2) the widget currently connects to ElevenLabs using a public `agentId` without authentication, meaning anyone could use the agent. The Shopify `client_id` is also hardcoded in `shopify.app.toml` line 3, though this is standard for Shopify app manifests and is not a secret (it is a public identifier).

**Primary recommendation:** Rotate all credentials first (blocking task), then add gitleaks pre-commit hook to prevent future leaks, then implement the ElevenLabs signed URL endpoint for secure widget connections.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | All leaked credentials rotated (Neon DB password, Shopify API secret, OpenAI key, ElevenLabs key) | Credential rotation procedures documented per service (Neon Console, Shopify Partners, OpenAI Platform, ElevenLabs Dashboard). Also rotate Fernet ENCRYPTION_KEY and WEBHOOK_SECRET. |
| SEC-02 | Pre-commit secret scanning (gitleaks) prevents future credential leaks | Gitleaks v8.24.2 with pre-commit framework. `.pre-commit-config.yaml` + `gitleaks.toml` for custom rules. Windows-compatible via binary + pre-commit pip package. |
| SEC-03 | ElevenLabs API key never reaches the browser -- signed URL pattern (15-min TTL) | ElevenLabs API endpoint `GET /v1/convai/conversation/get-signed-url?agent_id=X` returns `{ "signed_url": "..." }`. Backend calls this with `xi-api-key` header, returns signed URL to frontend. React SDK accepts `signedUrl` in `startSession()`. |
| SEC-04 | Environment variables managed securely (Railway secrets, Vercel env, no hardcoded values in code) | Remove all hardcoded fallback values from source. Audit complete: 2 files with hardcoded agent ID fallback, `.env` on disk with real values (not committed). All env vars already defined in `backend/config.py` via pydantic-settings. |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| gitleaks | v8.24.2 | Pre-commit secret scanning | Industry standard, 170+ built-in rules, detects API keys/passwords/tokens across all major providers |
| pre-commit | latest (pip) | Git hook framework | Python-based, cross-platform, manages hook lifecycle, used by gitleaks officially |
| httpx | 0.28.1 (already installed) | HTTP client for ElevenLabs API calls | Already in backend dependencies, async-capable, used for signed URL generation |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| pydantic-settings | (already installed) | Environment variable management | Already used in `backend/config.py` -- all env vars flow through `Settings` class |
| python-dotenv | 1.2.2 (already installed) | Local `.env` file loading | Already used by pydantic-settings for local dev |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gitleaks | truffleHog | TruffleHog is also excellent but gitleaks is lighter, faster for pre-commit, and has first-class pre-commit framework support |
| pre-commit (Python framework) | Husky (Node) | Husky only works for JS projects; this is a polyglot repo (Python + Node). pre-commit framework is language-agnostic |
| Direct HTTP for signed URL | elevenlabs Python SDK | SDK not installed, adds heavy dependency for one API call. httpx is already available and the endpoint is a simple GET |

**Installation:**
```bash
# Pre-commit framework (Python)
pip install pre-commit

# Gitleaks binary (Windows -- download from GitHub releases)
# Or via scoop: scoop install gitleaks
# Or via go: go install github.com/gitleaks/gitleaks/v8@latest

# After setup:
pre-commit install
```

## Architecture Patterns

### Credential Rotation Order

Rotate in this order (most critical first):

1. **Neon DB password** -- database is directly accessible with leaked password
2. **Shopify API secret** -- can create/read orders and products
3. **ElevenLabs API key** -- can consume paid voice API quota
4. **OpenAI API key** -- can consume paid API quota
5. **Fernet ENCRYPTION_KEY** -- re-encrypt any stored Shopify access tokens
6. **WEBHOOK_SECRET** -- generate new random value

### Rotation Procedures

**Neon DB (project: `green-brook-97532777`):**
- Neon Console > Project > Branches > select branch > Roles & Databases tab > role menu > "Reset password"
- Or API: `POST /projects/{project_id}/branches/{branch_id}/roles/{role_name}/reset_password`
- Update `DATABASE_URL` and `DATABASE_URL_DIRECT` in Railway and local `.env`
- Note: resetting drops active connections

**Shopify API Secret:**
- Shopify Partners Dashboard > Apps > select app > Client credentials > Rotate
- Generate new secret, keep old active until all access tokens are refreshed
- Update `SHOPIFY_API_SECRET` in Railway backend environment
- Configure webhook verification to accept both old and new secret during transition

**ElevenLabs API Key:**
- ElevenLabs Dashboard > Profile > Workspace Settings > Service Accounts
- Or: Profile icon > Profile + API Key > regenerate
- Update `ELEVENLABS_API_KEY` in Railway backend environment

**OpenAI API Key:**
- OpenAI Platform > API Keys (https://platform.openai.com/api-keys) > Create new key > Delete old key
- Update `OPENAI_API_KEY` in Railway backend environment

**Fernet ENCRYPTION_KEY and WEBHOOK_SECRET:**
```python
# Generate new Fernet key
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())

# Generate new webhook secret
import secrets
print(secrets.token_urlsafe(32))
```

### Signed URL Pattern (SEC-03)

**Server-side (FastAPI backend):**
```python
# New endpoint in backend/main.py
@app.get("/api/voice/signed-url")
async def get_voice_signed_url(store_id: str = ""):
    """
    Generate a signed URL for ElevenLabs WebRTC/WebSocket connection.
    The API key never leaves the server.
    """
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="Voice AI not configured")

    agent_id = settings.ELEVENLABS_AGENT_ID  # Will become per-store in Phase 1
    if not agent_id:
        raise HTTPException(status_code=503, detail="Agent not configured")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
            params={"agent_id": agent_id},
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
        )
        response.raise_for_status()
        data = response.json()

    return {"signed_url": data["signed_url"]}
```

**Client-side (React -- VoiceWidget.tsx):**
```typescript
// Instead of passing agentId directly:
const response = await fetch(`${API_URL}/api/voice/signed-url?store_id=${storeId}`);
const { signed_url } = await response.json();

await conversation.startSession({
    signedUrl: signed_url,
    // No agentId needed -- it's embedded in the signed URL
});
```

**Client-side (widget-embed.js):**
```javascript
// Replace agentId-based connection with signed URL:
const urlRes = await fetch(`${API_BASE}/api/voice/signed-url?store_id=${STORE_ID}`);
const { signed_url } = await urlRes.json();

conversation = await ElevenLabs.Conversation.startSession({
    signedUrl: signed_url,
    onConnect: ({ conversationId }) => { /* ... */ },
    // ...
});
```

### Pre-commit Hook Configuration

**`.pre-commit-config.yaml` (repo root):**
```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks
```

**Optional `gitleaks.toml` for custom rules/allowlists:**
```toml
[extend]
# Use default gitleaks rules as base

[allowlist]
description = "Global allowlist"
paths = [
    '''\.env\.example$''',
    '''\.planning/''',
]
```

### Recommended Project Structure Changes
```
(root)
+-- .pre-commit-config.yaml    # NEW: gitleaks hook config
+-- gitleaks.toml               # NEW: custom rules/allowlists (optional)
+-- .env                        # EXISTS: local only, gitignored
+-- .env.example                # EXISTS: template with placeholder values
+-- .gitignore                  # EXISTS: already excludes .env files
```

### Anti-Patterns to Avoid
- **Hardcoded fallback secrets:** Never use `process.env.X || "actual_secret_value"` -- fail loudly instead of silently using a leaked value
- **Rewriting public git history:** Do NOT use `git filter-branch` or BFG on a public repo. Rotate credentials instead -- it's faster, safer, and doesn't break clones
- **Client-side API keys:** Never send `ELEVENLABS_API_KEY` to the browser. The signed URL pattern exists precisely for this reason
- **Committing .env files for "convenience":** The `.env.example` with placeholders is the correct pattern

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret detection in commits | Regex-based git hook script | gitleaks pre-commit hook | 170+ rules covering API key formats for all major providers, maintained by security community, low false-positive rate |
| Secure widget authentication | Custom token system | ElevenLabs signed URL API | Official pattern, 15-min TTL built in, handles token lifecycle automatically |
| Environment variable management | Manual os.environ reads | pydantic-settings `BaseSettings` | Already in use, provides validation, type coercion, .env file loading, and a single source of truth for all config |
| Pre-commit hook management | Raw `.git/hooks/` scripts | pre-commit framework (pip) | Cross-platform, version-pinned, auto-installs tools, team-sharable via config file |

**Key insight:** Secret management is a solved problem at every layer (pre-commit scanning, environment variable injection, signed URL authentication). Hand-rolling any of these creates gaps that existing tools have already closed.

## Common Pitfalls

### Pitfall 1: Rotating Credentials Without Updating All Consumers
**What goes wrong:** You rotate the Neon DB password but only update Railway. The Shopify app (separate Railway service) or Vercel frontend (if it had direct DB access) still uses the old password. Services crash.
**Why it happens:** Multi-service architectures have credentials in multiple places.
**How to avoid:** Create a checklist of every service that uses each credential. For this project:
  - `DATABASE_URL` / `DATABASE_URL_DIRECT`: Railway backend, potentially Shopify app (Prisma)
  - `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`: Railway backend, Shopify app
  - `ELEVENLABS_API_KEY`: Railway backend only
  - `OPENAI_API_KEY`: Railway backend only
  - `STRIPE_*`: Railway backend only
  - `NEXT_PUBLIC_*`: Vercel frontend
**Warning signs:** 500 errors or connection refused after deployment.

### Pitfall 2: Forgetting to Enable Agent Authentication in ElevenLabs
**What goes wrong:** You implement the signed URL endpoint, but the ElevenLabs agent is still set to "public." Anyone can connect to the agent with just the agent ID (which is visible in API responses). The signed URL is optional if the agent does not require authentication.
**Why it happens:** Signed URLs only enforce authentication when the agent has `enable_auth` turned on.
**How to avoid:** After implementing the signed URL endpoint, go to ElevenLabs Dashboard > Agent > Security and enable authentication. Also configure the domain allowlist to only accept connections from your domains.
**Warning signs:** Widget still works even when signed URL endpoint is down.

### Pitfall 3: Pre-commit Hook Not Running on Windows
**What goes wrong:** gitleaks binary is installed but the pre-commit hook fails silently or skips on Windows.
**Why it happens:** PATH issues, different shell behavior, or pre-commit not properly installed.
**How to avoid:** Install pre-commit via pip (`pip install pre-commit`), then `pre-commit install` from the repo root. Test with `pre-commit run --all-files`. On Windows, ensure gitleaks.exe is on PATH or use the pre-commit framework which auto-downloads the correct binary.
**Warning signs:** Commits with secrets go through without being blocked.

### Pitfall 4: Breaking Existing Tests After Credential Rotation
**What goes wrong:** Backend tests use mock/test values in `conftest.py` but some test might reference the old `.env` values.
**Why it happens:** Tests load `.env` file via pydantic-settings before conftest overrides take effect.
**How to avoid:** Ensure `conftest.py` sets test environment variables before `Settings()` is instantiated. Current `conftest.py` already does this correctly with `os.environ.setdefault()`. Verify all 74 tests pass after rotation.
**Warning signs:** Tests fail with authentication errors after rotation.

### Pitfall 5: Shopify Webhook Signature Verification During Secret Rotation
**What goes wrong:** After rotating the Shopify API secret, incoming webhooks signed with the old secret are rejected. Product sync breaks during the transition period.
**Why it happens:** Shopify continues to sign webhooks with the old secret until the old secret is revoked.
**How to avoid:** Shopify's rotation procedure is designed for this: keep both old and new secrets active, update webhook verification to accept both, then revoke the old secret only after confirming new tokens work.
**Warning signs:** 401/403 errors on webhook endpoints during rotation.

## Code Examples

### Example 1: Remove Hardcoded Agent ID Fallbacks
```typescript
// BEFORE (VoiceWidget.tsx line 91, settings/page.tsx line 8):
agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "agent_6401kec12s0ff6hbwjmgdw2s0kt0",

// AFTER: Fail if env var not set, or better yet, fetch from backend
// Option A: Remove hardcoded fallback (will use signed URL instead in SEC-03)
// Option B: For dashboard preview, fetch agent ID from backend /api/voice/config
```

### Example 2: Signed URL Backend Endpoint (Python/FastAPI)
```python
# Source: ElevenLabs API Reference - Get Signed URL
# https://elevenlabs.io/docs/api-reference/conversations/get-signed-url

import httpx
from fastapi import HTTPException

@app.get("/api/voice/signed-url")
async def get_voice_signed_url(store_id: str = ""):
    if not settings.ELEVENLABS_API_KEY or not settings.ELEVENLABS_AGENT_ID:
        raise HTTPException(status_code=503, detail="Voice AI not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
            params={"agent_id": settings.ELEVENLABS_AGENT_ID},
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            timeout=10.0,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to get signed URL")
        return resp.json()  # {"signed_url": "wss://..."}
```

### Example 3: Pre-commit Config
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks
```

```bash
# Installation and verification
pip install pre-commit
pre-commit install
pre-commit run --all-files  # Scan existing staged files
```

### Example 4: Neon DB Password Reset (API)
```bash
# Source: Neon API Reference - Reset role password
# https://api-docs.neon.tech/reference/resetprojectbranchrolepassword

curl -X POST \
  "https://console.neon.tech/api/v2/projects/green-brook-97532777/branches/{branch_id}/roles/neondb_owner/reset_password" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json"

# Response includes new password. Update DATABASE_URL accordingly.
```

### Example 5: Generate New Security Keys
```python
# Fernet encryption key (for Shopify access token encryption)
from cryptography.fernet import Fernet
new_key = Fernet.generate_key().decode()
print(f"ENCRYPTION_KEY={new_key}")

# Webhook secret
import secrets
new_secret = secrets.token_urlsafe(32)
print(f"WEBHOOK_SECRET={new_secret}")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Public agent ID in client code | Signed URL from backend (ElevenLabs) | 2024+ | API key never reaches browser; 15-min TTL prevents abuse |
| Manual git history scanning | gitleaks pre-commit hooks | Mature since 2022+ | Automated prevention instead of reactive detection |
| `.env` files shared via Slack | Environment-specific secrets in Railway/Vercel | Standard practice | No human-readable secrets in any shareable medium |

**Deprecated/outdated:**
- Direct `agentId` connection for production widgets: still works but is insecure for private/paid agents. Use signed URLs or conversation tokens.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (backend), Playwright (frontend) |
| Config file | `backend/tests/conftest.py`, `frontend/playwright.config.ts` |
| Quick run command | `cd backend && python -m pytest tests/ -v -x` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Old credentials no longer authenticate | manual | Manual verification: try old DB password, old API keys | N/A (manual) |
| SEC-02 | Pre-commit blocks secret commits | integration | `echo "OPENAI_API_KEY=sk-test123" > /tmp/test.txt && gitleaks detect --source /tmp/test.txt` | N/A (tool test) |
| SEC-03 | Signed URL endpoint works, widget uses it | unit + integration | `cd backend && python -m pytest tests/test_voice_signed_url.py -x` | No - Wave 0 |
| SEC-04 | No hardcoded secrets in source | smoke | `gitleaks detect --source . --no-git` | N/A (tool scan) |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/ -v -x`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full backend test suite green + gitleaks scan clean + manual credential verification

### Wave 0 Gaps
- [ ] `backend/tests/test_voice_signed_url.py` -- covers SEC-03 (signed URL endpoint returns valid response, handles missing config, handles ElevenLabs API errors)
- [ ] Verify existing 74 tests still pass after credential rotation

## Open Questions

1. **Is the GitHub repository public?**
   - What we know: STATE.md says "leaked credentials in git history (commit 98996c8)" and PITFALLS.md says "The repo is public on GitHub"
   - What's unclear: Whether it is still public right now
   - Recommendation: If public, consider making it private immediately before credential rotation. After rotation, old credentials in history are invalidated anyway.

2. **Shopify access tokens re-encryption**
   - What we know: The backend has an `ENCRYPTION_KEY` (Fernet) used for encrypting Shopify access tokens
   - What's unclear: Are there any existing encrypted access tokens in the database that need re-encryption with the new key?
   - Recommendation: Check the `stores` table for any stored `access_token` values. If present, they must be decrypted with the old key and re-encrypted with the new key before the old key is discarded.

3. **ElevenLabs agent authentication toggle**
   - What we know: Signed URLs only enforce access control when the agent has authentication enabled
   - What's unclear: Whether the current ElevenLabs agent (`agent_6401kec12s0ff6hbwjmgdw2s0kt0`) has authentication enabled
   - Recommendation: Enable authentication on the agent in ElevenLabs Dashboard before deploying the signed URL endpoint. Add domain allowlist.

## Sources

### Primary (HIGH confidence)
- [ElevenLabs API - Get Signed URL](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url) -- endpoint docs, parameters, response format
- [Neon API - Reset Role Password](https://api-docs.neon.tech/reference/resetprojectbranchrolepassword) -- Neon credential rotation API
- [Neon Console - Manage Roles](https://neon.com/docs/manage/roles) -- Console UI password reset
- [gitleaks GitHub Repository](https://github.com/gitleaks/gitleaks) -- installation, pre-commit setup, configuration
- [Shopify - Rotate Client Credentials](https://shopify.dev/docs/apps/build/authentication-authorization/client-secrets/rotate-revoke-client-credentials) -- Shopify secret rotation procedure
- [OpenAI - API Key Safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety) -- OpenAI key rotation
- [ElevenLabs - Rotate Leaked Keys](https://howtorotate.com/docs/tutorials/elevenlabs/) -- ElevenLabs key rotation guide

### Secondary (MEDIUM confidence)
- [gitleaks Pre-Commit Hook Guide](https://www.d4b.dev/blog/2026-02-01-gitleaks-pre-commit-hook/) -- Local hook setup on Windows
- [Pre-Commit + Gitleaks Setup (Windows)](https://gist.github.com/hamrak/6f366c68c044937e46586b58cd4c35cb) -- Windows-specific setup guide
- [ElevenLabs React SDK npm](https://www.npmjs.com/package/@elevenlabs/react) -- React SDK startSession with signedUrl

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Credential rotation procedures: HIGH -- verified with official docs for each service
- gitleaks setup: HIGH -- verified with GitHub repo and pre-commit hooks yaml
- ElevenLabs signed URL pattern: HIGH -- verified with official API reference, endpoint documented
- React SDK signedUrl parameter: MEDIUM -- confirmed by multiple sources but could not fetch npm README directly
- Windows pre-commit compatibility: MEDIUM -- confirmed by community guides, not officially documented by gitleaks

**Codebase audit findings:**
- Hardcoded agent ID fallback in 2 frontend files (VoiceWidget.tsx:91, settings/page.tsx:8)
- Shopify client_id in shopify.app.toml:3 (public identifier, not a secret -- standard)
- `.env` on disk with real credentials (gitignored, never committed)
- Neon DB password + Shopify secret in git history (commit 98996c8, doc deleted in fffb3f7)
- No signed URL infrastructure exists yet (backend has /api/voice/config returning agent_id only)
- No pre-commit hooks configured
- Backend config.py already properly uses pydantic-settings for all env vars
- .gitignore already excludes .env, .env.local, .env.production, .env.*.local

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (credential rotation procedures stable, gitleaks version may update)
