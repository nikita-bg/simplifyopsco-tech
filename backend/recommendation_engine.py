"""
Multi-Category Recommendation Engine

Layered approach:
  Layer 1 (MVP): Rule-based — same category, similar price, complementary products
  Layer 2 (Post-MVP): Content-based — OpenAI embeddings + pgvector HNSW
  Layer 3 (Future): Collaborative filtering from order history
"""
from typing import Any
from backend.database import db  # type: ignore[import]


# Complementary product category maps
COMPLEMENTARY_MAP: dict[str, list[str]] = {
    # Fashion
    "shirt": ["pants", "jeans", "shorts", "skirt"],
    "dress": ["shoes", "bag", "jewelry", "jacket"],
    "pants": ["shirt", "belt", "shoes"],
    "jeans": ["t-shirt", "sneakers", "jacket"],
    "shoes": ["socks", "bag", "belt"],
    "jacket": ["shirt", "scarf", "gloves"],
    "skirt": ["top", "blouse", "shoes"],
    # Electronics
    "phone": ["case", "charger", "headphones", "screen protector"],
    "laptop": ["keyboard", "mouse", "bag", "monitor"],
    "tablet": ["case", "stylus", "keyboard"],
    "headphones": ["case", "cable", "adapter"],
    "camera": ["lens", "tripod", "bag", "memory card"],
    # Home
    "sofa": ["coffee table", "rug", "cushion", "lamp"],
    "bed": ["mattress", "pillow", "bedding", "nightstand"],
    "table": ["chairs", "centerpiece", "tablecloth"],
    "lamp": ["bulb", "shade", "table"],
    "rug": ["cushion", "curtain", "throw"],
}


class MultiCategoryRecommender:
    """
    MVP: Rule-based recommendations for any product category.
    Works from day 1 without training data.
    """

    async def get_recommendations(
        self,
        store_id: str,
        product_id: int,
        limit: int = 5,
        price_range_pct: float = 0.5,
    ) -> list[dict[str, Any]]:
        """
        Get product recommendations using layered strategy:
        1. Complementary products (from category maps)
        2. Same category + similar price
        3. Popular products fallback
        """
        if not db.pool:
            return []

        # Get the source product
        product = await db.fetchrow(
            """
            SELECT id, title, product_type, category, subcategory,
                   tags, price_min, price_max, images
            FROM products
            WHERE id = $1 AND store_id = $2
            """,
            product_id, store_id,
        )

        if not product:
            return await self._popular_products(store_id, limit)

        results: list[dict[str, Any]] = []

        # Strategy 1: Complementary products
        complementary = await self._complementary_products(
            store_id, product, limit=3
        )
        results.extend(complementary)

        # Strategy 2: Same category, similar price
        remaining = limit - len(results)
        if remaining > 0:
            similar = await self._similar_products(
                store_id, product, price_range_pct, limit=remaining
            )
            # Deduplicate
            seen_ids = {r["id"] for r in results}
            results.extend(r for r in similar if r["id"] not in seen_ids)

        # Strategy 3: Popular fallback
        remaining = limit - len(results)
        if remaining > 0:
            popular = await self._popular_products(store_id, remaining)
            seen_ids = {r["id"] for r in results}
            results.extend(r for r in popular if r["id"] not in seen_ids)

        return list(results[:limit])

    async def _complementary_products(
        self, store_id: str, product: Any, limit: int = 3
    ) -> list[dict[str, Any]]:
        """Find complementary products based on category maps"""
        subcategory = (product["subcategory"] or "").lower()
        product_type = (product["product_type"] or "").lower()

        # Check both subcategory and product_type against the map
        target_types: list[str] = []
        for key in [subcategory, product_type]:
            if key in COMPLEMENTARY_MAP:
                target_types.extend(COMPLEMENTARY_MAP[key])

        if not target_types:
            return []

        # Query for products matching complementary types
        rows = await db.fetch(
            """
            SELECT id, title, product_type, category, subcategory,
                   price_min, price_max, images
            FROM products
            WHERE store_id = $1
              AND id != $2
              AND (LOWER(subcategory) = ANY($3) OR LOWER(product_type) = ANY($3))
            ORDER BY RANDOM()
            LIMIT $4
            """,
            store_id, product["id"], target_types, limit,
        )
        return [self._row_to_dict(r, "complementary") for r in rows]

    async def _similar_products(
        self, store_id: str, product: Any, price_range_pct: float, limit: int = 5
    ) -> list[dict[str, Any]]:
        """Find similar products: same category + similar price range"""
        category = product["category"]
        price_min = product["price_min"] or 0
        price_max = product["price_max"] or price_min

        avg_price = (price_min + price_max) / 2 if price_max else price_min
        low_price = avg_price * (1 - price_range_pct)
        high_price = avg_price * (1 + price_range_pct)

        rows = await db.fetch(
            """
            SELECT id, title, product_type, category, subcategory,
                   price_min, price_max, images
            FROM products
            WHERE store_id = $1
              AND id != $2
              AND category = $3
              AND price_min >= $4
              AND price_max <= $5
            ORDER BY ABS((price_min + price_max) / 2 - $6)
            LIMIT $7
            """,
            store_id, product["id"], category,
            low_price, high_price, avg_price, limit,
        )
        return [self._row_to_dict(r, "similar") for r in rows]

    async def _popular_products(
        self, store_id: str, limit: int = 5
    ) -> list[dict[str, Any]]:
        """Fallback: return popular products from the store"""
        rows = await db.fetch(
            """
            SELECT id, title, product_type, category, subcategory,
                   price_min, price_max, images
            FROM products
            WHERE store_id = $1
            ORDER BY RANDOM()
            LIMIT $2
            """,
            store_id, limit,
        )
        return [self._row_to_dict(r, "popular") for r in rows]

    async def search_products(
        self, store_id: str, query: str, limit: int = 5
    ) -> list[dict[str, Any]]:
        """Search products by text query (title, description, tags)"""
        search_term = f"%{query}%"
        rows = await db.fetch(
            """
            SELECT id, title, product_type, category, subcategory,
                   price_min, price_max, images
            FROM products
            WHERE store_id = $1
              AND (
                title ILIKE $2
                OR description ILIKE $2
                OR product_type ILIKE $2
                OR $3 = ANY(tags)
              )
            LIMIT $4
            """,
            store_id, search_term, query.lower(), limit,
        )
        return [self._row_to_dict(r, "search") for r in rows]

    @staticmethod
    def _row_to_dict(row: Any, rec_type: str) -> dict[str, Any]:
        """Convert database row to recommendation dict"""
        import json
        images = row["images"]
        if isinstance(images, str):
            images = json.loads(images)

        first_image = ""
        if images and isinstance(images, list) and len(images) > 0:
            first_image = images[0].get("src", "") if isinstance(images[0], dict) else str(images[0])

        return {
            "id": row["id"],
            "title": row["title"],
            "product_type": row["product_type"],
            "category": row["category"],
            "price": float(row["price_min"] or 0),
            "price_max": float(row["price_max"] or 0),
            "image": first_image,
            "recommendation_type": rec_type,
        }


# Singleton instance
recommender = MultiCategoryRecommender()
