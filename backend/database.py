"""
Database Layer — Neon PostgreSQL with asyncpg + connection pooling
"""
import logging

import asyncpg  # type: ignore[import-not-found]
from typing import Optional, Any
from contextlib import asynccontextmanager

from backend.config import settings  # type: ignore[import]

logger = logging.getLogger("simplifyops.db")


class Database:
    """Async database connection pool for Neon PostgreSQL"""

    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self) -> None:
        """Create connection pool using Neon pooled URL"""
        if not settings.DATABASE_URL:
            logger.warning("DATABASE_URL not configured — database DISABLED")
            return

        try:
            # asyncpg 0.30: strip sslmode from DSN, pass ssl='require' as kwarg
            import re
            raw = settings.DATABASE_URL
            dsn = re.sub(r'[?&]sslmode=[^&]*', '', raw).rstrip('?')
            logger.debug(f"DSN: ...{dsn[-50:]!r}")

            self.pool = await asyncpg.create_pool(
                dsn=dsn,
                ssl='require',
                min_size=2,
                max_size=10,
                command_timeout=30,
                statement_cache_size=0,  # Required for Neon PgBouncer
            )
            logger.info("Database pool created")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            self.pool = None

    async def disconnect(self) -> None:
        """Close connection pool"""
        pool = self.pool
        if pool is not None:
            await pool.close()
            self.pool = None
            logger.info("Database pool closed")

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
