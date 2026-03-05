-- ============================================
-- SimplifyOps v2.0: Cost Monitoring
-- ============================================
-- Track per-conversation costs from AI providers (ElevenLabs, OpenAI)
-- Enables profit margin analysis and cost optimization

CREATE TABLE IF NOT EXISTS conversation_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,

  -- AI Provider Costs
  elevenlabs_cost DECIMAL(10, 4) DEFAULT 0, -- Voice synthesis cost
  openai_cost DECIMAL(10, 4) DEFAULT 0, -- LLM inference cost
  total_cost DECIMAL(10, 4) DEFAULT 0, -- Sum of all provider costs

  -- Usage Metrics (for cost calculation)
  voice_seconds DECIMAL(8, 2) DEFAULT 0, -- Total voice synthesis time
  llm_tokens INTEGER DEFAULT 0, -- Total tokens (input + output)
  llm_input_tokens INTEGER DEFAULT 0,
  llm_output_tokens INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Store provider-specific details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cost analytics queries
CREATE INDEX conversation_costs_conversation_id_idx ON conversation_costs(conversation_id);
CREATE INDEX conversation_costs_business_id_idx ON conversation_costs(business_id);
CREATE INDEX conversation_costs_business_created_idx ON conversation_costs(business_id, created_at DESC);
CREATE INDEX conversation_costs_total_cost_idx ON conversation_costs(total_cost DESC);

-- RLS for conversation_costs
ALTER TABLE conversation_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their costs"
  ON conversation_costs FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert costs"
  ON conversation_costs FOR INSERT
  WITH CHECK (true); -- API will insert costs after conversation ends

-- ============================================
-- COST ANALYTICS FUNCTIONS
-- ============================================

-- Get total costs for a business in a given period
CREATE OR REPLACE FUNCTION get_business_costs(
  business_uuid UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_conversations INTEGER,
  total_cost DECIMAL,
  avg_cost_per_conversation DECIMAL,
  elevenlabs_cost DECIMAL,
  openai_cost DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    SUM(conversation_costs.total_cost)::DECIMAL,
    AVG(conversation_costs.total_cost)::DECIMAL,
    SUM(conversation_costs.elevenlabs_cost)::DECIMAL,
    SUM(conversation_costs.openai_cost)::DECIMAL
  FROM conversation_costs
  WHERE
    conversation_costs.business_id = business_uuid
    AND conversation_costs.created_at >= start_date
    AND conversation_costs.created_at <= end_date;
END;
$$;

-- Get daily cost breakdown for charts
CREATE OR REPLACE FUNCTION get_daily_costs(
  business_uuid UUID,
  days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  conversation_count INTEGER,
  total_cost DECIMAL,
  elevenlabs_cost DECIMAL,
  openai_cost DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    conversation_costs.created_at::DATE,
    COUNT(*)::INTEGER,
    SUM(conversation_costs.total_cost)::DECIMAL,
    SUM(conversation_costs.elevenlabs_cost)::DECIMAL,
    SUM(conversation_costs.openai_cost)::DECIMAL
  FROM conversation_costs
  WHERE
    conversation_costs.business_id = business_uuid
    AND conversation_costs.created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY conversation_costs.created_at::DATE
  ORDER BY conversation_costs.created_at::DATE DESC;
END;
$$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
