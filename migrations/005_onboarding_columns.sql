-- Migration 005: Add onboarding tracking columns to stores table
-- Phase 5: Onboarding — tracks store name, onboarding step progress, and errors

ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'online_store';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'none';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS onboarding_error TEXT;

INSERT INTO applied_migrations (filename) VALUES ('005_onboarding_columns.sql') ON CONFLICT (filename) DO NOTHING;
