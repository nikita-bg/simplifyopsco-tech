"""
Authentication Middleware — Validates Supabase Auth JWT tokens server-side
"""
import time
from typing import Optional
from fastapi import Request, HTTPException  # type: ignore[import-not-found]

import httpx  # type: ignore[import-not-found]

from backend.config import settings  # type: ignore[import]
from backend.database import db  # type: ignore[import]
from backend.security_middleware import SecurityLogger  # type: ignore[import]

# Supabase project URL for auth verification
SUPABASE_URL = getattr(settings, "SUPABASE_URL", None) or "https://rhwgjtawyxwqaippjxlj.supabase.co"
SUPABASE_ANON_KEY = getattr(settings, "SUPABASE_ANON_KEY", None) or ""

# Simple in-memory cache (TTL-based)
_session_cache: dict[str, tuple[str, float]] = {}  # token -> (user_id, expiry)
_CACHE_TTL = 300  # 5 minutes


async def get_authenticated_user(request: Request) -> str:
    """
    FastAPI dependency: extract and validate Supabase JWT token.
    Returns the authenticated user_id or raises 401.
    """
    # Get token from Authorization header or Supabase cookies
    token: Optional[str] = None

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if not token:
        # Supabase stores auth in sb-<ref>-auth-token cookie
        for name, value in request.cookies.items():
            if "auth-token" in name:
                # Cookie value may be JSON-encoded; extract access_token
                try:
                    import json
                    data = json.loads(str(value))
                    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                        token = str(data[0].get("access_token", "")) or None
                    elif isinstance(data, dict):
                        token = str(data.get("access_token", "")) or None
                except (json.JSONDecodeError, TypeError):
                    token = str(value)
                if token:
                    break

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Check cache
    now = time.time()
    cached = _session_cache.get(token)
    if cached and cached[1] > now:
        return cached[0]

    # Validate JWT via Supabase Auth API
    user_id = await _validate_supabase_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    # Cache the result
    _session_cache[token] = (user_id, now + _CACHE_TTL)

    # Periodically clean cache
    if len(_session_cache) > 1000:
        _cleanup_cache(now)

    return user_id


async def _validate_supabase_token(access_token: str) -> Optional[str]:
    """Validate Supabase JWT by calling /auth/v1/user endpoint."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "apikey": SUPABASE_ANON_KEY,
                },
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("id")
            return None
    except Exception as e:
        SecurityLogger.log(f"Supabase token validation error: {e}", "WARNING")
        return None


async def verify_store_ownership(store_id: str, user_id: str) -> bool:
    """Verify that the authenticated user owns the given store."""
    if not db.pool:
        return False

    try:
        owner = await db.fetchval(
            "SELECT owner_id FROM stores WHERE id = $1::uuid",
            store_id,
        )
        return str(owner) == user_id if owner else False
    except Exception as e:
        SecurityLogger.log(f"Store ownership check error: {e}", "WARNING")
        return False


async def require_store_owner(
    request: Request,
    store_id: str,
) -> str:
    """
    Combined dependency: authenticate user AND verify store ownership.
    Returns the authenticated user_id.
    """
    user_id = await get_authenticated_user(request)

    if not await verify_store_ownership(store_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied: you don't own this store")

    return user_id


def _cleanup_cache(now: float) -> None:
    """Remove expired entries from session cache."""
    expired = [k for k, (_, exp) in _session_cache.items() if exp <= now]
    for k in expired:
        del _session_cache[k]
