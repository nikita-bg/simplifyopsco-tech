"""
Shopify Integration Service
Handles: OAuth, HMAC verification, product sync, Admin API calls.
Uses raw HTTP (httpx) — Shopify's official SDK is Node.js only.
"""
import base64
import hashlib
import hmac
import json
import uuid
from datetime import datetime, UTC
from typing import Any, Optional

import httpx  # type: ignore[import-not-found]

from backend.config import settings  # type: ignore[import]
from backend.database import db  # type: ignore[import]
from backend.encryption import encrypt_token, decrypt_token  # type: ignore[import]
from backend.security_middleware import SecurityLogger  # type: ignore[import]


SHOPIFY_API_VERSION = "2026-04"


class ShopifyService:
    """Shopify Admin API client and integration service"""

    # ========================
    # OAuth Flow
    # ========================

    @staticmethod
    def get_install_url(shop: str, user_id: str = "") -> str:
        """Generate OAuth install URL for a Shopify store"""
        scopes = settings.SHOPIFY_SCOPES or "read_products,read_orders"
        redirect_uri = f"{settings.SHOPIFY_APP_URL}/shopify/callback"
        nonce = str(uuid.uuid4())
        # Encode user_id in state param for retrieval in callback
        state = f"{nonce}:{user_id}" if user_id else nonce

        return (
            f"https://{shop}/admin/oauth/authorize"
            f"?client_id={settings.SHOPIFY_API_KEY}"
            f"&scope={scopes}"
            f"&redirect_uri={redirect_uri}"
            f"&state={state}"
        )

    @staticmethod
    async def exchange_token(shop: str, code: str) -> Optional[str]:
        """Exchange authorization code for permanent access token"""
        url = f"https://{shop}/admin/oauth/access_token"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json={
                "client_id": settings.SHOPIFY_API_KEY,
                "client_secret": settings.SHOPIFY_API_SECRET,
                "code": code,
            })
            response.raise_for_status()
            data = response.json()
            return data.get("access_token")

    @staticmethod
    async def register_store(shop: str, access_token: str, owner_id: str | None = None) -> str:
        """Save store credentials to database (encrypted)"""
        store_id = str(uuid.uuid4())
        encrypted_token = encrypt_token(access_token)

        if owner_id:
            await db.execute(
                """
                INSERT INTO stores (id, shop_domain, access_token_encrypted, owner_id, subscription_tier, settings, created_at)
                VALUES ($1, $2, $3, $4::uuid, 'trial', '{}', $5)
                ON CONFLICT (shop_domain) DO UPDATE
                SET access_token_encrypted = $3, owner_id = $4::uuid
                RETURNING id
                """,
                store_id, shop, encrypted_token, owner_id, datetime.now(UTC),
            )
        else:
            await db.execute(
                """
                INSERT INTO stores (id, shop_domain, access_token_encrypted, subscription_tier, settings, created_at)
                VALUES ($1, $2, $3, 'trial', '{}', $4)
                ON CONFLICT (shop_domain) DO UPDATE
                SET access_token_encrypted = $3
                RETURNING id
                """,
                store_id, shop, encrypted_token, datetime.now(UTC),
            )

        SecurityLogger.log(f"Store registered: {shop}", "INFO")
        return store_id

    # ========================
    # HMAC Verification
    # ========================

    @staticmethod
    def verify_hmac(data: bytes, hmac_header: str) -> bool:
        """Verify Shopify webhook HMAC-SHA256 signature.
        Shopify sends the HMAC as base64-encoded, not hex."""
        secret = settings.SHOPIFY_API_SECRET
        if not secret:
            return False

        digest = base64.b64encode(
            hmac.new(
                secret.encode("utf-8"),
                data,
                hashlib.sha256,
            ).digest()
        ).decode("utf-8")

        return hmac.compare_digest(digest, hmac_header)

    @staticmethod
    def verify_query_hmac(query_params: dict[str, str]) -> bool:
        """Verify Shopify OAuth callback HMAC"""
        secret = settings.SHOPIFY_API_SECRET
        if not secret:
            return False

        received_hmac = query_params.pop("hmac", "")

        # Sort and encode remaining params
        sorted_params = "&".join(
            f"{k}={v}" for k, v in sorted(query_params.items())
        )

        calculated = hmac.new(
            secret.encode("utf-8"),
            sorted_params.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(calculated, received_hmac)

    # ========================
    # Product Sync
    # ========================

    @staticmethod
    async def _get_store_token(store_id: str) -> Optional[str]:
        """Get decrypted access token for a store"""
        row = await db.fetchrow(
            "SELECT access_token_encrypted FROM stores WHERE id = $1",
            store_id,
        )
        if not row:
            return None
        return decrypt_token(row["access_token_encrypted"])

    @staticmethod
    async def _get_shop_domain(store_id: str) -> Optional[str]:
        """Get shop domain for a store"""
        row = await db.fetchrow(
            "SELECT shop_domain FROM stores WHERE id = $1",
            store_id,
        )
        return row["shop_domain"] if row else None

    async def sync_all_products(self, store_id: str) -> int:
        """Full sync of product catalog from Shopify"""
        token = await self._get_store_token(store_id)
        shop = await self._get_shop_domain(store_id)
        if not token or not shop:
            return 0

        count: int = 0
        url: Optional[str] = f"https://{shop}/admin/api/{SHOPIFY_API_VERSION}/products.json?limit=250"

        async with httpx.AsyncClient(timeout=60.0) as client:
            while url:
                response = await client.get(url, headers={
                    "X-Shopify-Access-Token": token,
                    "Content-Type": "application/json",
                })
                response.raise_for_status()
                data = response.json()

                for product in data.get("products", []):
                    await self._upsert_product(store_id, product)
                    count += 1

                # Pagination via Link header
                link_header = response.headers.get("Link", "")
                if 'rel="next"' in link_header:
                    # Extract next URL from Link header
                    parts = link_header.split(",")
                    for part in parts:
                        if 'rel="next"' in part:
                            url = part.split(";")[0].strip().strip("<>")
                            break
                else:
                    url = None

        SecurityLogger.log(f"Synced {count} products for store {store_id}", "INFO")
        return count

    async def _upsert_product(self, store_id: str, product: dict[str, Any]) -> None:
        """Insert or update a product from Shopify webhook/sync"""
        # Extract price range from variants
        variants = product.get("variants", [])
        prices = [float(v.get("price", 0)) for v in variants if v.get("price")]
        price_min = min(prices) if prices else 0
        price_max = max(prices) if prices else 0

        # Detect category from product_type and tags
        product_type = product.get("product_type", "")
        tags_str = product.get("tags", "")
        tags = [t.strip().lower() for t in tags_str.split(",") if t.strip()] if isinstance(tags_str, str) else tags_str

        category = self._detect_category(product_type, tags)
        subcategory = product_type.lower() if product_type else ""

        # Extract images
        images = [{"src": img.get("src", ""), "alt": img.get("alt", "")}
                  for img in product.get("images", [])]

        await db.execute(
            """
            INSERT INTO products (id, store_id, title, description, product_type,
                                  category, subcategory, tags, price_min, price_max,
                                  images, synced_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id, store_id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                product_type = EXCLUDED.product_type,
                category = EXCLUDED.category,
                subcategory = EXCLUDED.subcategory,
                tags = EXCLUDED.tags,
                price_min = EXCLUDED.price_min,
                price_max = EXCLUDED.price_max,
                images = EXCLUDED.images,
                synced_at = EXCLUDED.synced_at
            """,
            product["id"], store_id, product.get("title", ""),
            product.get("body_html", ""), product_type,
            category, subcategory, tags,
            price_min, price_max, json.dumps(images),
            datetime.now(UTC),
        )

    @staticmethod
    def _detect_category(product_type: str, tags: list[str]) -> str:
        """Auto-detect product category from type and tags"""
        pt_lower = product_type.lower()
        all_text = pt_lower + " " + " ".join(tags)

        fashion_keywords = {"shirt", "dress", "pants", "jeans", "shoes", "jacket",
                           "skirt", "top", "blouse", "sneakers", "boots", "hat",
                           "scarf", "belt", "bag", "jewelry", "watch", "clothing",
                           "apparel", "fashion", "wear"}
        electronics_keywords = {"phone", "laptop", "tablet", "headphones", "camera",
                               "speaker", "charger", "cable", "keyboard", "mouse",
                               "monitor", "tv", "audio", "electronic", "gadget", "tech"}
        home_keywords = {"sofa", "table", "chair", "lamp", "rug", "bed", "pillow",
                        "curtain", "vase", "candle", "blanket", "furniture", "decor",
                        "home", "kitchen", "bathroom"}

        for kw in fashion_keywords:
            if kw in all_text:
                return "fashion"
        for kw in electronics_keywords:
            if kw in all_text:
                return "electronics"
        for kw in home_keywords:
            if kw in all_text:
                return "home"

        return "general"

    async def handle_product_webhook(
        self, store_id: str, action: str, product_data: dict[str, Any]
    ) -> None:
        """Handle Shopify product webhook (create/update/delete)"""
        if action == "delete":
            await db.execute(
                "DELETE FROM products WHERE id = $1 AND store_id = $2",
                product_data["id"], store_id,
            )
            SecurityLogger.log(
                f"Product deleted: {product_data['id']} from store {store_id}", "INFO"
            )
        else:
            # create or update
            await self._upsert_product(store_id, product_data)
            SecurityLogger.log(
                f"Product {'created' if action == 'create' else 'updated'}: "
                f"{product_data.get('title', 'unknown')} in store {store_id}",
                "INFO",
            )


# Singleton
shopify_service = ShopifyService()
