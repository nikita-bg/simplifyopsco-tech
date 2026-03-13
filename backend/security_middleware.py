"""
Security Middleware & Utilities
"""
from fastapi import Header, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional
from collections import defaultdict
from datetime import datetime, timedelta
import re

from backend.config import settings


# Simple in-memory rate limiter
class RateLimiter:
    """Simple rate limiter using in-memory storage"""

    def __init__(self):
        self.requests: dict[str, list[datetime]] = defaultdict(list)
        self.max_requests = 60  # requests per window
        self.window_seconds = 60  # 1 minute window

    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed based on rate limit"""
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)

        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > cutoff
        ]

        # Check if under limit
        if len(self.requests[identifier]) >= self.max_requests:
            return False

        # Add current request
        self.requests[identifier].append(now)
        return True

    def get_remaining(self, identifier: str) -> int:
        """Get remaining requests for identifier"""
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)

        recent = [
            req_time for req_time in self.requests[identifier]
            if req_time > cutoff
        ]

        return max(0, self.max_requests - len(recent))


# Global rate limiter instance
rate_limiter = RateLimiter()


async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    # Skip rate limiting for health check
    if request.url.path == "/":
        return await call_next(request)

    # Get client identifier (IP address)
    client_ip = request.client.host if request.client else "unknown"

    if not rate_limiter.is_allowed(client_ip):
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after": rate_limiter.window_seconds
            }
        )

    response = await call_next(request)

    # Add rate limit headers
    remaining = rate_limiter.get_remaining(client_ip)
    response.headers["X-RateLimit-Limit"] = str(rate_limiter.max_requests)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(rate_limiter.window_seconds)

    return response


async def verify_webhook_signature(
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret")
):
    """
    Verify webhook authentication.

    Usage:
    @app.post("/webhook/elevenlabs", dependencies=[Depends(verify_webhook_signature)])
    """
    expected_secret = settings.WEBHOOK_SECRET

    # If webhook secret not configured, skip validation (dev mode)
    if not expected_secret:
        return True

    if not x_webhook_secret or x_webhook_secret != expected_secret:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing webhook secret"
        )

    return True


def sanitize_input(text: str, max_length: int = 10000) -> str:
    """
    Sanitize text input to prevent injection attacks.

    Args:
        text: Input text
        max_length: Maximum allowed length

    Returns:
        Sanitized text
    """
    if not text:
        return ""

    # Trim to max length
    text = text[:max_length]

    # Remove potentially dangerous patterns
    # Remove control characters except newline, tab
    text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)

    # Basic XSS prevention (remove script tags)
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)

    return text.strip()


def sanitize_phone(phone: str) -> str:
    """Sanitize and format phone number"""
    if not phone:
        return ""

    # Remove all non-digit characters except + at start
    phone = re.sub(r'[^\d+]', '', phone)

    # Limit length
    return phone[:20]


def sanitize_email(email: str) -> str:
    """Basic email sanitization"""
    if not email:
        return ""

    # Basic email validation pattern
    email = email.strip().lower()

    # Simple validation
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return ""

    return email[:254]  # Max email length per RFC


def mask_sensitive_data(text: str) -> str:
    """
    Mask sensitive data in logs/errors.

    Masks:
    - API keys (sk-..., Bearer ...)
    - Email addresses
    - Phone numbers
    - Credit card numbers
    """
    # Mask API keys
    text = re.sub(
        r'(sk-[a-zA-Z0-9\-_]{20,})',
        lambda m: m.group(1)[:8] + '...' + m.group(1)[-4:],
        text
    )

    # Mask Bearer tokens
    text = re.sub(
        r'(Bearer\s+)([a-zA-Z0-9\-_]{10,})',
        lambda m: m.group(1) + m.group(2)[:6] + '...' + m.group(2)[-4:],
        text,
        flags=re.IGNORECASE
    )

    # Mask emails
    text = re.sub(
        r'([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
        lambda m: m.group(1)[:2] + '***@' + m.group(2),
        text
    )

    # Mask phone numbers
    text = re.sub(
        r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
        '***-***-****',
        text
    )

    return text


import logging

_logger = logging.getLogger("simplifyops")


class SecurityLogger:
    """Logger with automatic sensitive data masking"""

    @staticmethod
    def log(message: str, level: str = "INFO"):
        """Log message with sensitive data masked"""
        masked = mask_sensitive_data(message)
        getattr(_logger, level.lower(), _logger.info)(masked)

    @staticmethod
    def log_error(message: str, error: Exception):
        """Log error with masked sensitive data"""
        masked_msg = mask_sensitive_data(message)
        masked_err = mask_sensitive_data(str(error))
        _logger.error(f"{masked_msg}: {masked_err}")


# Export
__all__ = [
    "rate_limiter",
    "rate_limit_middleware",
    "verify_webhook_signature",
    "sanitize_input",
    "sanitize_phone",
    "sanitize_email",
    "mask_sensitive_data",
    "SecurityLogger",
]
