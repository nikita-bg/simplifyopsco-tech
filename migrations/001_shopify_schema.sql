-- AI Voice Shopping Assistant — Database Schema
-- Neon PostgreSQL with pgvector extension
-- Run with direct connection URL (not pooled)

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- Stores (Shopify shops)
-- ==========================================
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token_encrypted TEXT,
    owner_id UUID,
    subscription_tier VARCHAR(50) DEFAULT 'trial',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stores_domain ON stores(shop_domain);
CREATE INDEX idx_stores_owner ON stores(owner_id);

-- ==========================================
-- Products (synced from Shopify)
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
    id BIGINT NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    product_type VARCHAR(255),
    category VARCHAR(100) DEFAULT 'general',
    subcategory VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    price_min DECIMAL(10, 2) DEFAULT 0,
    price_max DECIMAL(10, 2) DEFAULT 0,
    images JSONB DEFAULT '[]',
    embedding VECTOR(1536),  -- OpenAI text-embedding-3-small
    synced_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, store_id)
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(store_id, category);
CREATE INDEX idx_products_type ON products(store_id, product_type);

-- HNSW index for vector similarity search (better than IVFFlat: no training needed)
-- Only create when we start using embeddings (Post-MVP)
-- CREATE INDEX idx_products_embedding ON products
--     USING hnsw (embedding vector_cosine_ops)
--     WITH (m = 16, ef_construction = 64);

-- ==========================================
-- Pre-computed Recommendations (for performance)
-- ==========================================
CREATE TABLE IF NOT EXISTS product_recommendations (
    product_id BIGINT NOT NULL,
    store_id UUID NOT NULL,
    recommended_product_id BIGINT NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,  -- 'similar', 'complementary', 'popular'
    score FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (product_id, store_id, recommended_product_id, recommendation_type),
    FOREIGN KEY (product_id, store_id) REFERENCES products(id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (recommended_product_id, store_id) REFERENCES products(id, store_id) ON DELETE CASCADE
);

-- ==========================================
-- Voice Conversations
-- ==========================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    customer_id VARCHAR(255),
    transcript TEXT DEFAULT '',
    intent VARCHAR(100) DEFAULT 'General',
    sentiment VARCHAR(50) DEFAULT 'Neutral',
    products_discussed JSONB DEFAULT '[]',
    products_recommended JSONB DEFAULT '[]',
    cart_actions JSONB DEFAULT '[]',
    duration_seconds INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_store ON conversations(store_id);
CREATE INDEX idx_conversations_date ON conversations(store_id, started_at);

-- ==========================================
-- Daily Analytics (aggregated)
-- ==========================================
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_conversations INT DEFAULT 0,
    products_recommended INT DEFAULT 0,
    add_to_cart_count INT DEFAULT 0,
    add_to_cart_rate FLOAT DEFAULT 0,
    conversion_rate FLOAT DEFAULT 0,
    UNIQUE(store_id, date)
);

-- ==========================================
-- Audit Logs (GDPR compliance)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_store ON audit_logs(store_id);
CREATE INDEX idx_audit_type ON audit_logs(event_type);
CREATE INDEX idx_audit_date ON audit_logs(created_at);
