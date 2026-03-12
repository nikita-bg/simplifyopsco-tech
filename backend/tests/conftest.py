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
