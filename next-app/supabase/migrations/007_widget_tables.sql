-- ============================================
-- Widget Tables: site_data + agent_prompts
-- ============================================
-- Part of Sub-project #1: Custom Widget + Widget Backend

-- 1. site_data — stores page context (products, sections) per URL
CREATE TABLE site_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  page_title TEXT,
  products JSONB DEFAULT '[]',
  sections JSONB DEFAULT '[]',
  raw_context JSONB,
  source TEXT NOT NULL CHECK (source IN ('runtime', 'crawl')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, url)
);

CREATE INDEX idx_site_data_business ON site_data(business_id);
ALTER TABLE site_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view own site data"
  ON site_data FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Service role full access to site_data"
  ON site_data FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER site_data_updated_at
  BEFORE UPDATE ON site_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. agent_prompts — system prompt templates + customer customizations
CREATE TABLE agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('sales', 'support', 'booking', 'custom')),
  system_prompt TEXT NOT NULL,
  is_base_template BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Base templates have business_id = NULL, customer prompts have business_id set
CREATE INDEX idx_agent_prompts_business ON agent_prompts(business_id);
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view base templates and own prompts"
  ON agent_prompts FOR SELECT
  USING (
    business_id IS NULL
    OR business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Businesses can manage own prompts"
  ON agent_prompts FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Service role full access to agent_prompts"
  ON agent_prompts FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER agent_prompts_updated_at
  BEFORE UPDATE ON agent_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Insert base prompt templates
INSERT INTO agent_prompts (business_id, name, template_type, system_prompt, is_base_template) VALUES
(NULL, 'Sales Assistant', 'sales',
'You are a friendly and knowledgeable AI sales assistant. Your goal is to help visitors find the right product or service. Be conversational, ask clarifying questions, and use the site control tools to show relevant products. Never be pushy — guide, don''t pressure.',
true),

(NULL, 'Customer Support', 'support',
'You are a helpful customer support agent. Answer questions clearly and concisely. If you can find relevant information on the page, use site control tools to show it. If you cannot help, suggest the visitor contacts the business directly.',
true),

(NULL, 'Booking Assistant', 'booking',
'You are a booking assistant. Help visitors schedule appointments or consultations. Ask for their preferred date, time, and any relevant details. Be efficient and confirm all details before finalizing.',
true);
