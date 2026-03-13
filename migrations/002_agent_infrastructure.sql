-- Agent Infrastructure Migration
-- Additive migration: agent columns on stores, agent_templates table, usage tracking
-- Run with direct connection URL (not pooled)
-- Depends on: 001_shopify_schema.sql (stores table must exist)

-- ==========================================
-- Migration Tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS applied_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- Agent Columns on Stores
-- ==========================================
ALTER TABLE stores ADD COLUMN IF NOT EXISTS elevenlabs_agent_id VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS agent_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS agent_template_id UUID;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kb_doc_id VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT '{}';

-- ==========================================
-- Usage Tracking Columns on Stores
-- ==========================================
ALTER TABLE stores ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS daily_conversation_count INTEGER DEFAULT 0;

-- ==========================================
-- Indexes for Agent Lookups
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_stores_agent_id ON stores(elevenlabs_agent_id);
CREATE INDEX IF NOT EXISTS idx_stores_agent_status ON stores(agent_status);

-- ==========================================
-- Agent Templates Table
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,  -- 'online_store', 'service_business', 'lead_gen'
    description TEXT,
    conversation_config JSONB NOT NULL DEFAULT '{}',
    platform_settings JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(type, is_default)  -- Only one default per type
);

-- Record this migration
INSERT INTO applied_migrations (filename) VALUES ('002_agent_infrastructure.sql')
ON CONFLICT (filename) DO NOTHING;
