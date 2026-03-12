"""
Database Layer — Neon PostgreSQL with asyncpg + connection pooling
"""
import asyncpg  # type: ignore[import-not-found]
from typing import Optional, Any
from contextlib import asynccontextmanager

from backend.config import settings  # type: ignore[import]


class Database:
    """Async database connection pool for Neon PostgreSQL"""

    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self) -> None:
        """Create connection pool using Neon pooled URL"""
        if not settings.DATABASE_URL:
            print("[WARNING] DATABASE_URL not configured — database DISABLED")
            return

        try:
            # Strip sslmode from DSN — asyncpg 0.30+ requires ssl passed separately
            import ssl as ssl_module
            import re
            dsn = re.sub(r'[?&]sslmode=[^&]*', '', settings.DATABASE_URL)
            dsn = re.sub(r'[?&]channel_binding=[^&]*', '', dsn)
            ssl_ctx = ssl_module.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl_module.CERT_NONE

            self.pool = await asyncpg.create_pool(
                dsn=dsn,
                ssl=ssl_ctx,
                min_size=2,
                max_size=10,
                command_timeout=30,
                statement_cache_size=0,  # Required for Neon PgBouncer
            )
            print("[OK] Database pool created")
        except Exception as e:
            print(f"[ERROR] Database connection failed: {e}")
            self.pool = None

    async def disconnect(self) -> None:
        """Close connection pool"""
        pool = self.pool
        if pool is not None:
            await pool.close()
            self.pool = None
            print("[OK] Database pool closed")

    @asynccontextmanager
    async def acquire(self):  # type: ignore[misc]
        """Acquire a connection from the pool"""
        pool = self.pool
        if pool is None:
            raise RuntimeError("Database not connected")
        async with pool.acquire() as conn:
            yield conn

    async def execute(self, query: str, *args: Any) -> Any:
        """Execute a query"""
        async with self.acquire() as conn:
            result = await conn.execute(query, *args)
            return result

    async def fetch(self, query: str, *args: Any) -> list[Any]:
        """Fetch multiple rows"""
        async with self.acquire() as conn:
            rows = await conn.fetch(query, *args)
            return list(rows)

    async def fetchrow(self, query: str, *args: Any) -> Optional[Any]:
        """Fetch a single row"""
        async with self.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args: Any) -> Any:
        """Fetch a single value"""
        async with self.acquire() as conn:
            return await conn.fetchval(query, *args)


# Singleton instance
db = Database()
