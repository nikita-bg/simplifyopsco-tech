# 🔒 Security Guide - AI Voice Receptionist

## ⚠️ CRITICAL: API Key Management

### ❌ NEVER DO THIS:
```python
# WRONG - Hardcoded API key
OPENAI_API_KEY = "sk-proj-abc123..."
```

```bash
# WRONG - Sharing API keys in chat/email
"Here's my key: sk-proj-xyz..."
```

### ✅ ALWAYS DO THIS:
```bash
# Store in .env file (never commit this file!)
OPENAI_API_KEY=sk-proj-your_key_here
ELEVENLABS_API_KEY=your_key_here
```

```python
# Load from environment
from config import settings
api_key = settings.OPENAI_API_KEY
```

---

## 🛡️ Security Checklist

### 1. Environment Variables
- ✅ All secrets stored in `.env` file
- ✅ `.env` file in `.gitignore`
- ✅ `.env.example` contains only placeholders
- ✅ Never commit real credentials

### 2. API Key Rotation
If an API key is exposed:
1. **Immediately revoke it** at the provider's dashboard
2. Generate a new key
3. Update `.env` file locally
4. Update production environment variables

### 3. CORS Configuration
Current CORS settings in `main.py`:
```python
allow_origins=[
    "http://localhost:3000",      # Development frontend
    "http://127.0.0.1:3000",      # Alternative localhost
    "http://localhost:8000",      # Backend docs
    "https://simplifyopsco.tech", # Production domain
]
```

**⚠️ Production:** Update `https://simplifyopsco.tech` to your actual domain!

### 4. Production Security Recommendations

#### A. Add Authentication
```python
# Add API key authentication for webhooks
from fastapi import Header, HTTPException

async def verify_webhook_token(x_api_key: str = Header(...)):
    if x_api_key != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API key")
```

#### B. Add Rate Limiting
```bash
pip install slowapi
```

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

@app.post("/webhook/elevenlabs")
@limiter.limit("10/minute")  # Max 10 requests per minute
async def elevenlabs_webhook(...):
    ...
```

#### C. Input Validation
- ✅ Using Pydantic models for validation
- ⚠️ Add max length limits for transcript fields
- ⚠️ Sanitize user inputs before storing

#### D. Disable DEBUG Mode
```env
# .env for production
DEBUG=False
```

#### E. HTTPS Only
- Use HTTPS in production (Netlify/Railway provide this)
- Set `allow_credentials=True` only if needed
- Consider using `secure=True` for cookies

### 5. Database Security (Future)
When migrating from in-memory to database:
- Use parameterized queries (SQLAlchemy prevents SQL injection)
- Enable connection encryption (SSL/TLS)
- Use read-only database users for analytics queries
- Regular backups

### 6. Monitoring & Logging
- ✅ Log API calls without exposing credentials
- ⚠️ Set up error monitoring (Sentry, Rollbar)
- ⚠️ Monitor for unusual activity patterns
- ⚠️ Alert on repeated 401/403 errors

---

## 🚨 Security Incident Response

### If an API Key is Compromised:

1. **Immediate Actions (Within 5 minutes):**
   - Revoke the compromised key at provider dashboard
   - Check recent API usage for suspicious activity
   - Generate new key

2. **Investigation (Within 1 hour):**
   - Review access logs
   - Identify how the key was exposed
   - Check git history with `git log -S "sk-proj-"`
   - Review conversation/chat logs

3. **Remediation:**
   - Update all environments with new key
   - If git history contains the key, consider:
     - Using BFG Repo-Cleaner or git-filter-repo
     - OR creating a fresh repository
   - Document the incident

4. **Prevention:**
   - Add pre-commit hooks to scan for secrets
   - Enable GitHub secret scanning
   - Train team members on security best practices

### Useful Commands:
```bash
# Check git history for secrets
git log -S "sk-proj-" --all

# Check if .env is tracked
git ls-files | grep .env

# Remove .env from git history (use with caution!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

---

## 📋 Pre-Deployment Security Checklist

Before deploying to production:

- [ ] All API keys stored in environment variables
- [ ] `.env` file NOT committed to git
- [ ] DEBUG mode disabled
- [ ] CORS origins configured for production domain
- [ ] HTTPS enabled
- [ ] Rate limiting implemented
- [ ] Authentication added for sensitive endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies updated (`pip list --outdated`)
- [ ] Security scanning completed (`pip-audit`, `safety check`)
- [ ] Monitoring and alerting configured

---

## 🔗 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OpenAI API Key Safety](https://platform.openai.com/docs/guides/safety-best-practices)

---

## 📞 Security Contact

If you discover a security vulnerability, please report it responsibly:
- **DO NOT** open a public GitHub issue
- Email: security@simplifyopsco.tech (update this!)
- Or use GitHub Security Advisories

---

**Last Updated:** 2026-03-02
**Version:** 1.0
