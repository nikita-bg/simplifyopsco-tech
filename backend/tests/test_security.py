"""Tests for security middleware — rate limiter, sanitization, masking."""
import pytest
from datetime import datetime, timedelta

from backend.security_middleware import (
    RateLimiter,
    sanitize_input,
    sanitize_phone,
    sanitize_email,
    mask_sensitive_data,
)


class TestRateLimiter:
    def test_allows_initial_request(self):
        rl = RateLimiter()
        assert rl.is_allowed("192.168.1.1") is True

    def test_allows_up_to_max(self):
        rl = RateLimiter()
        rl.max_requests = 5
        for _ in range(5):
            assert rl.is_allowed("ip1") is True
        assert rl.is_allowed("ip1") is False

    def test_different_identifiers_independent(self):
        rl = RateLimiter()
        rl.max_requests = 2
        assert rl.is_allowed("ip1") is True
        assert rl.is_allowed("ip1") is True
        assert rl.is_allowed("ip1") is False
        # ip2 should still be allowed
        assert rl.is_allowed("ip2") is True

    def test_get_remaining(self):
        rl = RateLimiter()
        rl.max_requests = 10
        rl.is_allowed("ip1")
        rl.is_allowed("ip1")
        assert rl.get_remaining("ip1") == 8

    def test_expired_requests_cleaned(self):
        rl = RateLimiter()
        rl.max_requests = 2
        rl.window_seconds = 1

        # Manually insert an old timestamp
        old_time = datetime.now() - timedelta(seconds=5)
        rl.requests["ip1"] = [old_time, old_time]

        # Should be allowed because old entries are expired
        assert rl.is_allowed("ip1") is True


class TestSanitizeInput:
    def test_empty_input(self):
        assert sanitize_input("") == ""
        assert sanitize_input(None) == ""

    def test_normal_text(self):
        assert sanitize_input("Hello world") == "Hello world"

    def test_strips_script_tags(self):
        result = sanitize_input('<script>alert("xss")</script>Safe text')
        assert "<script" not in result
        assert "Safe text" in result

    def test_max_length(self):
        long_text = "a" * 200
        result = sanitize_input(long_text, max_length=50)
        assert len(result) == 50

    def test_removes_control_characters(self):
        text = "Hello\x00World\x07"
        result = sanitize_input(text)
        assert result == "HelloWorld"

    def test_preserves_newlines_and_tabs(self):
        text = "Line1\nLine2\tTabbed"
        result = sanitize_input(text)
        assert "\n" in result
        assert "\t" in result


class TestSanitizePhone:
    def test_empty(self):
        assert sanitize_phone("") == ""

    def test_normal_phone(self):
        assert sanitize_phone("+1-555-123-4567") == "+15551234567"

    def test_strips_non_digits(self):
        assert sanitize_phone("(555) 123-4567") == "5551234567"

    def test_max_length(self):
        result = sanitize_phone("+" + "1" * 30)
        assert len(result) <= 20


class TestSanitizeEmail:
    def test_empty(self):
        assert sanitize_email("") == ""

    def test_valid_email(self):
        assert sanitize_email("test@example.com") == "test@example.com"

    def test_uppercased(self):
        assert sanitize_email("Test@Example.COM") == "test@example.com"

    def test_invalid_email(self):
        assert sanitize_email("not-an-email") == ""

    def test_max_length(self):
        long_local = "a" * 300 + "@example.com"
        result = sanitize_email(long_local)
        # Should either be empty (invalid) or truncated
        assert len(result) <= 254 or result == ""


class TestMaskSensitiveData:
    def test_masks_api_keys(self):
        text = "key is sk-abcdefghij1234567890abcdef"
        result = mask_sensitive_data(text)
        assert "sk-abcde" not in result or "..." in result

    def test_masks_bearer_tokens(self):
        text = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload"
        result = mask_sensitive_data(text)
        assert "..." in result

    def test_masks_emails(self):
        text = "Contact: alice@example.com"
        result = mask_sensitive_data(text)
        assert "alice@" not in result
        assert "***@" in result

    def test_masks_phone_numbers(self):
        text = "Call 555-123-4567"
        result = mask_sensitive_data(text)
        assert "555-123-4567" not in result

    def test_no_masking_for_safe_text(self):
        text = "This is normal text"
        assert mask_sensitive_data(text) == text
