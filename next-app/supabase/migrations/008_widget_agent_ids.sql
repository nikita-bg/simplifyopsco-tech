-- ============================================
-- Widget: Update businesses table for custom widget
-- ============================================
-- Adds: default_mode, welcome_message
-- Updates: agent_id values from ElevenLabs format to new agent_<nanoid> format
-- Adds: service_role RLS policies for Railway backend access

-- 0. Make conversations.user_id nullable (widget visitors are anonymous)
-- Note: user_id is already nullable in the schema, but this ensures it explicitly
ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL;

-- 1. Add service_role RLS policies for tables Railway backend writes to
CREATE POLICY "Service role full access to conversations"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to businesses"
  ON businesses FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Add new columns
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS default_mode TEXT NOT NULL DEFAULT 'chat'
    CHECK (default_mode IN ('chat', 'hybrid', 'voice')),
  ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Hi! How can I help you today?';

-- Note: allowed_domains already exists as JSONB in 004_multi_tenancy.sql
-- We keep it as JSONB for backward compatibility

-- 3. Clear old ElevenLabs agent_ids (they are no longer valid)
UPDATE businesses SET agent_id = NULL WHERE agent_id IS NOT NULL;

-- 4. Generate new agent_ids for all existing businesses
-- Format: agent_ + 21 random URL-safe chars
UPDATE businesses
SET agent_id = 'agent_' || replace(replace(
  encode(gen_random_bytes(16), 'base64'),
  '+', '-'), '/', '_')
WHERE agent_id IS NULL;

-- 5. Make agent_id NOT NULL and UNIQUE going forward
ALTER TABLE businesses
  ALTER COLUMN agent_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_agent_id_idx ON businesses(agent_id);

-- 6. Update signup trigger to generate agent_id for new businesses
CREATE OR REPLACE FUNCTION handle_new_user_and_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  api_key TEXT;
  api_key_hash_value TEXT;
  new_agent_id TEXT;
BEGIN
  -- Create profile (existing logic)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );

  -- Generate API key
  api_key := 'so_live_' || encode(gen_random_bytes(16), 'hex');
  api_key_hash_value := md5(api_key);

  -- Generate agent_id
  new_agent_id := 'agent_' || replace(replace(
    encode(gen_random_bytes(16), 'base64'),
    '+', '-'), '/', '_');

  -- Create default business with agent_id
  INSERT INTO public.businesses (
    owner_id,
    name,
    api_key_hash,
    api_key_prefix,
    agent_id,
    billing_period_start
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'full_name', 'My Business'),
    api_key_hash_value,
    substring(api_key, 1, 12),
    new_agent_id,
    CURRENT_DATE
  );

  RETURN NEW;
END;
$$;
