"""
Authentication Middleware — Validates Neon Auth sessions server-side
"""
import time
from typing import Optional
from fastapi import Request, HTTPException, Depends  # type: ignore[import-not-found]

from backend.config import settings  # type: ignore[import]
from backend.database import db  # type: ignore[import]
from backend.security_middleware import SecurityLogger  # type: ignore[import]

# Simple in-memory session cache (TTL-based)
_session_cache: dict[str, tuple[str, float]] = {}  # cookie -> (user_id, expiry)
_CACHE_TTL = 300  # 5 minutes


async def get_authenticated_user(request: Request) -> str:
    """
    FastAPI dependency: extract and validate user from session cookie.
    Returns the authenticated user_id or raises 401.
    """
    # Try cookie first, then Authorization header
    session_cookie = request.cookies.get("__session") or request.cookies.get("better-auth.session_token")

    if not session_cookie:
        # Fallback: check Authorization header (for API clients)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_cookie = auth_header[7:]

    if not session_cookie:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Check cache
    now = time.time()
    cached = _session_cache.get(session_cookie)
    if cached and cached[1] > now:
        return cached[0]

    # Validate session against database
    # Neon Auth / better-auth stores sessions in a `session` table
    user_id = await _validate_session(session_cookie)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    # Cache the result
    _session_cache[session_cookie] = (user_id, now + _CACHE_TTL)

    # Periodically clean cache
    if len(_session_cache) > 1000:
        _cleanup_cache(now)

    return user_id


async def _validate_session(session_token: str) -> Optional[str]:
    """Validate session token against the database session table."""
    if not db.pool:
        return None

    try:
        # better-auth stores sessions in a "session" table
        # The token format may be "token" or "token.signature"
        token = session_token.split(".")[0] if "." in session_token else session_token

        row = await db.fetchrow(
            """SELECT "userId", "expiresAt"
               FROM neon_auth."session"
               WHERE "token" = $1""",
            token,
        )

        if not row:
            return None

        # Check expiry
        expires_at = row["expiresAt"]
        if expires_at:
            from datetime import datetime, timezone
            if isinstance(expires_at, datetime):
                if expires_at.tzinfo is None:
                    # Assume UTC
                    if expires_at < datetime.utcnow():
                        return None
                else:
                    if expires_at < datetime.now(timezone.utc):
                        return None

        return str(row["userId"])
    except Exception as e:
        SecurityLogger.log(f"Session validation error: {e}", "WARNING")
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
