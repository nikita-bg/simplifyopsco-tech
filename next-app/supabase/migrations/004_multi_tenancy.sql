-- ============================================
-- SimplifyOps v2.0: Multi-Tenancy Migration
-- ============================================
-- This migration transforms the platform from single-tenant to multi-tenant B2B2C model
-- CRITICAL: Test on staging before running in production!

-- ============================================
-- PART 1: CREATE BUSINESSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,

  -- Authentication for widget API
  api_key_hash TEXT UNIQUE NOT NULL, -- bcrypt hash of API key, NEVER store plaintext
  api_key_prefix TEXT NOT NULL, -- First 8 chars for display: "so_live_abc..."

  -- ElevenLabs Integration (per-business voice agent)
  agent_id TEXT, -- ElevenLabs agent ID (created async after signup)
  voice_id TEXT DEFAULT 'sarah',
  system_prompt TEXT DEFAULT 'You are a helpful AI assistant for this business. Answer questions, provide information, and help customers navigate the website.',

  -- Widget Configuration
  branding JSONB DEFAULT '{
    "color": "#256AF4",
    "logo": null,
    "position": "bottom-right"
  }'::jsonb,
  working_hours JSONB DEFAULT '{
    "enabled": false,
    "timezone": "UTC",
    "schedule": {}
  }'::jsonb,
  allowed_domains JSONB DEFAULT '[]'::jsonb, -- Optional domain whitelist for widget

  -- Billing & Usage
  plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  conversation_count INTEGER DEFAULT 0, -- Current month usage
  conversation_limit INTEGER DEFAULT 25, -- Free tier limit
  billing_period_start DATE, -- Start of current billing period
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE, -- Can be disabled for non-payment
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for businesses table
CREATE INDEX businesses_owner_id_idx ON businesses(owner_id);
CREATE INDEX businesses_api_key_hash_idx ON businesses(api_key_hash); -- For fast API key validation
CREATE INDEX businesses_stripe_customer_id_idx ON businesses(stripe_customer_id);
CREATE INDEX businesses_status_idx ON businesses(status) WHERE is_active = TRUE;

-- RLS for businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own businesses"
  ON businesses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Trigger for updated_at
CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PART 2: ADD BUSINESS_ID TO EXISTING TABLES
-- ============================================

-- Add business_id to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add business_id to knowledge_base
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add business_id to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add business_id to available_slots
ALTER TABLE available_slots ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Create indexes for business_id columns (CRITICAL for RLS performance)
CREATE INDEX IF NOT EXISTS conversations_business_id_idx ON conversations(business_id);
CREATE INDEX IF NOT EXISTS knowledge_base_business_id_idx ON knowledge_base(business_id);
CREATE INDEX IF NOT EXISTS bookings_business_id_idx ON bookings(business_id);
CREATE INDEX IF NOT EXISTS available_slots_business_id_idx ON available_slots(business_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS conversations_business_started_idx ON conversations(business_id, started_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_base_business_user_idx ON knowledge_base(business_id, user_id);
CREATE INDEX IF NOT EXISTS bookings_business_date_idx ON bookings(business_id, booking_date);

-- ============================================
-- PART 3: UPDATE RLS POLICIES FOR MULTI-TENANCY
-- ============================================

-- Drop old single-tenant policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;

-- Create new multi-tenant policies for conversations
CREATE POLICY "Business owners can view their conversations"
  ON conversations FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their conversations"
  ON conversations FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Update messages policies (inherit through conversations)
-- Messages policies remain the same - they check via conversations.user_id
-- This is safe because conversations now has business_id filtering

-- Drop old knowledge_base policies
DROP POLICY IF EXISTS "Users can view their own knowledge base" ON knowledge_base;
DROP POLICY IF EXISTS "Users can insert to their own knowledge base" ON knowledge_base;
DROP POLICY IF EXISTS "Users can update their own knowledge base" ON knowledge_base;
DROP POLICY IF EXISTS "Users can delete from their own knowledge base" ON knowledge_base;

-- Create new multi-tenant policies for knowledge_base
CREATE POLICY "Business owners can view their knowledge base"
  ON knowledge_base FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert to knowledge base"
  ON knowledge_base FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their knowledge base"
  ON knowledge_base FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete from knowledge base"
  ON knowledge_base FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Drop old bookings policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;

-- Create new multi-tenant policies for bookings
CREATE POLICY "Business owners can view their bookings"
  ON bookings FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their bookings"
  ON bookings FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Drop old available_slots policy
DROP POLICY IF EXISTS "Users can manage their own slots" ON available_slots;

-- Create new multi-tenant policies for available_slots
CREATE POLICY "Business owners can manage their slots"
  ON available_slots FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- PART 4: UPDATE VECTOR SEARCH FUNCTION FOR MULTI-TENANCY
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS match_documents(VECTOR, FLOAT, INT, UUID);

-- Create new multi-tenant version with business_id filter
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_business_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity,
    knowledge_base.metadata
  FROM knowledge_base
  WHERE
    1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
    AND (filter_business_id IS NULL OR knowledge_base.business_id = filter_business_id)
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- PART 5: AUTO-CREATE DEFAULT BUSINESS ON USER SIGNUP
-- ============================================

-- Function to auto-create a default business when user signs up
CREATE OR REPLACE FUNCTION handle_new_business_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  api_key TEXT;
  api_key_hash_value TEXT;
BEGIN
  -- Generate a simple API key (will be replaced by proper key generation in app)
  api_key := 'so_live_' || encode(gen_random_bytes(16), 'hex');

  -- Hash the API key using md5 for now (will be replaced with bcrypt in app layer)
  api_key_hash_value := md5(api_key);

  -- Create default business for new user
  INSERT INTO public.businesses (
    owner_id,
    name,
    api_key_hash,
    api_key_prefix,
    billing_period_start
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'full_name', 'My Business'),
    api_key_hash_value,
    substring(api_key, 1, 12), -- Store prefix for display
    CURRENT_DATE
  );

  RETURN NEW;
END;
$$;

-- Update the existing signup trigger to also create business
-- Note: This replaces the handle_new_user() function to include business creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user_and_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  api_key TEXT;
  api_key_hash_value TEXT;
BEGIN
  -- Create profile (existing logic)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );

  -- Create default business
  api_key := 'so_live_' || encode(gen_random_bytes(16), 'hex');
  api_key_hash_value := md5(api_key); -- Will be replaced with bcrypt in app

  INSERT INTO public.businesses (
    owner_id,
    name,
    api_key_hash,
    api_key_prefix,
    billing_period_start
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.raw_user_meta_data->>'full_name', 'My Business'),
    api_key_hash_value,
    substring(api_key, 1, 12),
    CURRENT_DATE
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_and_business();

-- ============================================
-- PART 6: USAGE TRACKING HELPERS
-- ============================================

-- Function to increment conversation count (called after each conversation)
CREATE OR REPLACE FUNCTION increment_business_conversation_count(business_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE businesses
  SET conversation_count = conversation_count + 1,
      updated_at = NOW()
  WHERE id = business_uuid;
END;
$$;

-- Function to reset monthly usage counter (run via cron on billing period start)
CREATE OR REPLACE FUNCTION reset_monthly_usage_counters()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE businesses
  SET conversation_count = 0,
      billing_period_start = CURRENT_DATE,
      updated_at = NOW()
  WHERE billing_period_start <= CURRENT_DATE - INTERVAL '1 month';
END;
$$;

-- ============================================
-- PART 7: VERIFICATION QUERIES
-- ============================================

-- Run these after migration to verify multi-tenancy is working:

-- 1. Check all tables have business_id:
-- SELECT table_name FROM information_schema.columns
-- WHERE column_name = 'business_id' AND table_schema = 'public';

-- 2. Check RLS is enabled on all multi-tenant tables:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = true;

-- 3. Test data isolation:
-- Create 2 test businesses, insert data, verify each can only see their own data

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Run this migration on staging environment
-- 2. Test with 2+ test business accounts
-- 3. Verify RLS policies block cross-tenant access
-- 4. Update application code to use business_id
-- 5. Deploy to production
