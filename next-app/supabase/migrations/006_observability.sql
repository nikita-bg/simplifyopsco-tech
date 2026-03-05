-- ============================================
-- SimplifyOps v2.0: Observability & Metrics
-- ============================================
-- Track latency, errors, and performance metrics for monitoring

CREATE TABLE IF NOT EXISTS conversation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,

  -- Latency Metrics (in milliseconds)
  total_latency INTEGER NOT NULL, -- End-to-end conversation latency
  llm_latency INTEGER DEFAULT 0, -- LLM inference time
  voice_latency INTEGER DEFAULT 0, -- Voice synthesis time
  api_latency INTEGER DEFAULT 0, -- API call overhead

  -- Error Tracking
  error_count INTEGER DEFAULT 0, -- Number of errors during conversation
  error_types JSONB DEFAULT '[]'::jsonb, -- Array of error types/codes
  had_errors BOOLEAN DEFAULT FALSE,

  -- Performance Metrics
  turns_count INTEGER DEFAULT 0, -- Number of conversation turns
  interruptions_count INTEGER DEFAULT 0, -- User interruptions
  retry_count INTEGER DEFAULT 0, -- Number of retries needed

  -- Quality Metrics
  response_quality_score DECIMAL(3, 2), -- 0.00 to 1.00 score
  user_satisfaction_score DECIMAL(3, 2), -- 0.00 to 1.00 if provided

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metrics queries
CREATE INDEX conversation_metrics_conversation_id_idx ON conversation_metrics(conversation_id);
CREATE INDEX conversation_metrics_business_id_idx ON conversation_metrics(business_id);
CREATE INDEX conversation_metrics_business_created_idx ON conversation_metrics(business_id, created_at DESC);
CREATE INDEX conversation_metrics_latency_idx ON conversation_metrics(total_latency DESC);
CREATE INDEX conversation_metrics_errors_idx ON conversation_metrics(had_errors) WHERE had_errors = TRUE;

-- RLS for conversation_metrics
ALTER TABLE conversation_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their metrics"
  ON conversation_metrics FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert metrics"
  ON conversation_metrics FOR INSERT
  WITH CHECK (true);

-- ============================================
-- LATENCY ANALYTICS FUNCTIONS
-- ============================================

-- Get latency percentiles (P50, P95, P99)
CREATE OR REPLACE FUNCTION get_latency_percentiles(
  business_uuid UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  p50_latency INTEGER,
  p95_latency INTEGER,
  p99_latency INTEGER,
  avg_latency INTEGER,
  total_conversations INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY conversation_metrics.total_latency)::INTEGER AS p50,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY conversation_metrics.total_latency)::INTEGER AS p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY conversation_metrics.total_latency)::INTEGER AS p99,
    AVG(conversation_metrics.total_latency)::INTEGER AS avg,
    COUNT(*)::INTEGER AS total
  FROM conversation_metrics
  WHERE
    conversation_metrics.business_id = business_uuid
    AND conversation_metrics.created_at >= start_date
    AND conversation_metrics.created_at <= end_date;
END;
$$;

-- Get error rate statistics
CREATE OR REPLACE FUNCTION get_error_stats(
  business_uuid UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_conversations INTEGER,
  conversations_with_errors INTEGER,
  error_rate DECIMAL,
  total_errors INTEGER,
  avg_errors_per_conversation DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE conversation_metrics.had_errors = TRUE)::INTEGER,
    (COUNT(*) FILTER (WHERE conversation_metrics.had_errors = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100 AS error_rate_pct,
    SUM(conversation_metrics.error_count)::INTEGER,
    AVG(conversation_metrics.error_count)::DECIMAL
  FROM conversation_metrics
  WHERE
    conversation_metrics.business_id = business_uuid
    AND conversation_metrics.created_at >= start_date
    AND conversation_metrics.created_at <= end_date;
END;
$$;

-- Get hourly latency trends for charts
CREATE OR REPLACE FUNCTION get_hourly_latency(
  business_uuid UUID,
  hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  hour TIMESTAMPTZ,
  avg_latency INTEGER,
  p95_latency INTEGER,
  conversation_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('hour', conversation_metrics.created_at),
    AVG(conversation_metrics.total_latency)::INTEGER,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY conversation_metrics.total_latency)::INTEGER,
    COUNT(*)::INTEGER
  FROM conversation_metrics
  WHERE
    conversation_metrics.business_id = business_uuid
    AND conversation_metrics.created_at >= NOW() - (hours || ' hours')::INTERVAL
  GROUP BY DATE_TRUNC('hour', conversation_metrics.created_at)
  ORDER BY DATE_TRUNC('hour', conversation_metrics.created_at) DESC;
END;
$$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
