-- ============================================
-- E-Commerce Integration: store_connections, products, orders, sync_logs
-- ============================================
-- Adds Shopify/WooCommerce/manual product management,
-- order tracking for "where is my order?" queries,
-- and product vector search for AI recommendations.

-- ============================================
-- 1. store_connections — links business to e-commerce platform
-- ============================================
CREATE TABLE store_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify', 'woocommerce', 'manual')),
  shop_domain TEXT,                          -- e.g. "mystore.myshopify.com"
  access_token_encrypted TEXT,               -- AES-256-GCM encrypted OAuth token
  api_key_encrypted TEXT,                    -- for WooCommerce consumer key
  api_secret_encrypted TEXT,                 -- for WooCommerce consumer secret
  scopes TEXT[] DEFAULT '{}',                -- e.g. {'read_products','read_orders'}
  is_active BOOLEAN DEFAULT true,
  platform_config JSONB DEFAULT '{}',        -- platform-specific settings
  installed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id)                        -- one connection per business
);

CREATE INDEX idx_store_connections_business ON store_connections(business_id);
ALTER TABLE store_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their store connections"
  ON store_connections FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can manage their store connections"
  ON store_connections FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Service role full access to store_connections"
  ON store_connections FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER store_connections_updated_at
  BEFORE UPDATE ON store_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. products — synced product catalog with vector embeddings
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform_product_id TEXT,                  -- Shopify/WooCommerce product ID (NULL for manual)
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),           -- original price for "on sale" display
  currency TEXT DEFAULT 'USD',
  images JSONB DEFAULT '[]',                 -- array of image URL strings
  variants JSONB DEFAULT '[]',               -- [{title, price, sku, inventory_qty}]
  inventory_status TEXT DEFAULT 'in_stock' CHECK (inventory_status IN ('in_stock', 'out_of_stock', 'limited')),
  product_url TEXT,                          -- link to product page
  tags TEXT[] DEFAULT '{}',                  -- for filtering
  is_active BOOLEAN DEFAULT true,
  embedding VECTOR(1536),                    -- for RAG product search (same as knowledge_base)
  synced_at TIMESTAMPTZ,                     -- last sync from platform (NULL for manual)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, platform_product_id)   -- no duplicate synced products per business
);

CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_active ON products(business_id) WHERE is_active = true;
CREATE INDEX idx_products_embedding
  ON products
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their products"
  ON products FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can manage their products"
  ON products FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Service role full access to products"
  ON products FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 3. orders — synced order data for "where is my order?" queries
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform_order_id TEXT,                    -- Shopify/WooCommerce order ID
  order_number TEXT NOT NULL,                -- human-readable "#1001"
  customer_email TEXT,
  customer_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  financial_status TEXT,                     -- paid, refunded, partially_refunded
  fulfillment_status TEXT,                   -- fulfilled, unfulfilled, partial
  tracking_number TEXT,
  tracking_url TEXT,
  total_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  line_items JSONB DEFAULT '[]',             -- [{title, quantity, price, image_url}]
  order_date TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, platform_order_id)
);

CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_email ON orders(business_id, customer_email);
CREATE INDEX idx_orders_number ON orders(business_id, order_number);
CREATE INDEX idx_orders_date ON orders(business_id, order_date DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their orders"
  ON orders FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can manage their orders"
  ON orders FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Service role full access to orders"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. sync_logs — tracks sync history
-- ============================================
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('products', 'orders', 'full')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  products_synced INTEGER DEFAULT 0,
  orders_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sync_logs_business ON sync_logs(business_id, created_at DESC);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their sync logs"
  ON sync_logs FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Service role full access to sync_logs"
  ON sync_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 5. match_products — vector similarity search (mirrors match_documents)
-- ============================================
CREATE OR REPLACE FUNCTION match_products(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_business_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL,
  images JSONB,
  product_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    products.id,
    products.title,
    products.description,
    products.price,
    products.images,
    products.product_url,
    1 - (products.embedding <=> query_embedding) AS similarity
  FROM products
  WHERE
    1 - (products.embedding <=> query_embedding) > match_threshold
    AND products.is_active = true
    AND (filter_business_id IS NULL OR products.business_id = filter_business_id)
  ORDER BY products.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- 6. Seed new base agent prompt templates (from Neon agent_templates)
-- ============================================
INSERT INTO agent_prompts (business_id, name, template_type, system_prompt, is_base_template) VALUES
(NULL, 'Online Store Assistant', 'sales',
'You are an online store assistant. Help customers browse products, compare options, and find what they need. Use showProductCard to display individual products and showComparison for side-by-side comparisons. Be knowledgeable about inventory, pricing, and product features. Never be pushy — guide customers to the right choice.',
true),

(NULL, 'Service Business Advisor', 'support',
'You are a service business advisor. Help potential clients understand available services, pricing, and scheduling. Answer questions about service details, availability, and what to expect. Guide interested visitors toward booking a consultation or demo.',
true),

(NULL, 'Lead Generation Agent', 'sales',
'You are a lead generation specialist. Engage website visitors in friendly conversation, understand their needs, and qualify them as potential customers. Guide qualified leads toward taking action — booking a demo, requesting a quote, or signing up. Track what interests them for follow-up.',
true);
