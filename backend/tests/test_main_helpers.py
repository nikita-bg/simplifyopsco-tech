"""Tests for helper functions and API endpoints in main.py."""
import pytest
from datetime import datetime, timedelta, UTC

# Import the helpers directly
from backend.main import _time_ago, _format_duration


class TestTimeAgo:
    def test_just_now(self):
        result = _time_ago(datetime.now(UTC) - timedelta(seconds=30))
        assert result == "just now"

    def test_minutes(self):
        result = _time_ago(datetime.now(UTC) - timedelta(minutes=5))
        assert "5 mins ago" == result

    def test_one_minute(self):
        result = _time_ago(datetime.now(UTC) - timedelta(minutes=1, seconds=5))
        assert "1 min ago" == result

    def test_hours(self):
        result = _time_ago(datetime.now(UTC) - timedelta(hours=3))
        assert "3 hours ago" == result

    def test_one_hour(self):
        result = _time_ago(datetime.now(UTC) - timedelta(hours=1, minutes=5))
        assert "1 hour ago" == result

    def test_days(self):
        result = _time_ago(datetime.now(UTC) - timedelta(days=2))
        assert "2 days ago" == result

    def test_one_day(self):
        result = _time_ago(datetime.now(UTC) - timedelta(days=1, hours=1))
        assert "1 day ago" == result


class TestFormatDuration:
    def test_zero(self):
        assert _format_duration(0) == "00:00"

    def test_seconds_only(self):
        assert _format_duration(45) == "00:45"

    def test_minutes_and_seconds(self):
        assert _format_duration(125) == "02:05"

    def test_exactly_one_minute(self):
        assert _format_duration(60) == "01:00"

    def test_large_duration(self):
        assert _format_duration(3661) == "61:01"
