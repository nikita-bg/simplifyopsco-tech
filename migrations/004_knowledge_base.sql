-- Migration 004: Knowledge Base Infrastructure
-- Adds KB tracking columns to stores, changes embedding dimension, adds HNSW index,
-- and adds source/product_url columns to products.

-- Knowledge base tracking columns on stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_char_count INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_product_count INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_last_synced TIMESTAMP;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_sync_status VARCHAR(50) DEFAULT 'none';

-- Change embedding dimension from 1536 (OpenAI) to 768 (Gemini)
-- Drop HNSW index if it exists (commented out in 001 but be safe)
DROP INDEX IF EXISTS idx_products_embedding;
-- Alter column dimension
ALTER TABLE products ALTER COLUMN embedding TYPE VECTOR(768);

-- Create HNSW index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_products_embedding
    ON products USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Index for KB sync status lookups
CREATE INDEX IF NOT EXISTS idx_stores_kb_status ON stores(kb_sync_status);

-- Manual products support: add source column to distinguish Shopify vs manual
ALTER TABLE products ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'shopify';
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_url TEXT;

-- Record migration
INSERT INTO applied_migrations (filename) VALUES ('004_knowledge_base.sql')
ON CONFLICT (filename) DO NOTHING;
