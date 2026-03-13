"""Shared test fixtures for backend tests."""
import os
import sys

# Ensure the project root is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Override env vars BEFORE any backend imports so Settings picks them up
os.environ.setdefault("ENCRYPTION_KEY", "dGVzdC1rZXktMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0")
os.environ.setdefault("SHOPIFY_API_KEY", "test-shopify-key")
os.environ.setdefault("SHOPIFY_API_SECRET", "test-shopify-secret")
os.environ.setdefault("DATABASE_URL", "")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException


@pytest.fixture
def mock_db():
    """Mock the database singleton where it is *used* (backend.main.db).

    We also patch the canonical backend.database.db so that the lifespan
    (which calls db.connect / db.disconnect) hits the same mock.
    """
    with patch("backend.main.db") as main_db, \
         patch("backend.database.db", main_db):
        # pool must be truthy so health checks report "connected"
        main_db.pool = True
        main_db.connect = AsyncMock()
        main_db.disconnect = AsyncMock()
        main_db.execute = AsyncMock()
        main_db.fetch = AsyncMock(return_value=[])
        main_db.fetchrow = AsyncMock(return_value=None)
        main_db.fetchval = AsyncMock(return_value=0)
        yield main_db


@pytest.fixture
def mock_auth():
    """Mock all auth helpers where they are *used* (backend.main)."""
    with patch(
        "backend.main.get_authenticated_user",
        new_callable=AsyncMock,
        return_value="test-user-123",
    ) as auth_mock, patch(
        "backend.main.require_store_owner",
        new_callable=AsyncMock,
        return_value="test-user-123",
    ) as owner_mock, patch(
        "backend.main.verify_store_ownership",
        new_callable=AsyncMock,
        return_value=True,
    ) as verify_mock:
        yield auth_mock, owner_mock, verify_mock


@pytest.fixture
def client(mock_db, mock_auth):
    """FastAPI test client with mocked DB and auth."""
    from fastapi.testclient import TestClient
    from backend.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def unauthed_client(mock_db):
    """Test client WITHOUT auth mock -- for testing 401 responses."""
    with patch(
        "backend.main.get_authenticated_user",
        new_callable=AsyncMock,
        side_effect=HTTPException(status_code=401, detail="Authentication required"),
    ), patch(
        "backend.main.require_store_owner",
        new_callable=AsyncMock,
        side_effect=HTTPException(status_code=401, detail="Authentication required"),
    ):
        from fastapi.testclient import TestClient
        from backend.main import app

        with TestClient(app) as c:
            yield c
