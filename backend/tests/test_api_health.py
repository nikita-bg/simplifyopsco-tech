"""Tests for health check and root endpoints."""
import pytest
from unittest.mock import patch, AsyncMock


class TestRootEndpoint:
    """GET / -- service info and health."""

    def test_root_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_body_has_required_keys(self, client):
        body = client.get("/").json()
        assert "service" in body
        assert "status" in body
        assert "version" in body

    def test_root_database_connected_when_pool_truthy(self, client):
        """When mock_db.pool is truthy the root endpoint reports connected."""
        body = client.get("/").json()
        assert body["database"] == "connected"


class TestHealthEndpoint:
    """GET /health -- returns 200/503 based on DB pool state."""

    def test_health_returns_200_when_pool_exists(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_health_returns_503_when_pool_is_none(self, mock_db, mock_auth):
        """Override pool to None so /health returns 503."""
        mock_db.pool = None

        from fastapi.testclient import TestClient
        from backend.main import app

        with TestClient(app) as c:
            response = c.get("/health")
            assert response.status_code == 503
            assert response.json()["status"] == "unhealthy"
