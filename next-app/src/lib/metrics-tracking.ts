/**
 * Metrics Tracking Utilities
 *
 * Tracks latency, errors, and performance metrics for observability
 */

import { createClient } from '@/lib/supabase/server'

export interface ConversationMetrics {
  conversationId: string
  businessId: string
  totalLatency: number
  llmLatency?: number
  voiceLatency?: number
  apiLatency?: number
  errorCount?: number
  errorTypes?: string[]
  turnsCount?: number
  interruptionsCount?: number
  retryCount?: number
  responseQualityScore?: number
  userSatisfactionScore?: number
  metadata?: Record<string, any>
}

/**
 * Log conversation performance metrics
 */
export async function logConversationMetrics(metrics: ConversationMetrics): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.from('conversation_metrics').insert({
    conversation_id: metrics.conversationId,
    business_id: metrics.businessId,
    total_latency: metrics.totalLatency,
    llm_latency: metrics.llmLatency || 0,
    voice_latency: metrics.voiceLatency || 0,
    api_latency: metrics.apiLatency || 0,
    error_count: metrics.errorCount || 0,
    error_types: metrics.errorTypes || [],
    had_errors: (metrics.errorCount || 0) > 0,
    turns_count: metrics.turnsCount || 0,
    interruptions_count: metrics.interruptionsCount || 0,
    retry_count: metrics.retryCount || 0,
    response_quality_score: metrics.responseQualityScore,
    user_satisfaction_score: metrics.userSatisfactionScore,
    metadata: metrics.metadata || {},
  })

  if (error) {
    console.error('[Metrics] Error logging conversation metrics:', error)
    return false
  }

  console.log(`[Metrics] Logged metrics for conversation ${metrics.conversationId}: ${metrics.totalLatency}ms`)
  return true
}

/**
 * Get latency percentiles for a business
 */
export async function getLatencyPercentiles(
  businessId: string,
  days: number = 7
): Promise<{
  p50Latency: number
  p95Latency: number
  p99Latency: number
  avgLatency: number
  totalConversations: number
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_latency_percentiles', {
    business_uuid: businessId,
    start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
  })

  if (error) {
    console.error('[Metrics] Error fetching latency percentiles:', error)
    return null
  }

  const result = data?.[0] || {
    p50_latency: 0,
    p95_latency: 0,
    p99_latency: 0,
    avg_latency: 0,
    total_conversations: 0,
  }

  return {
    p50Latency: result.p50_latency || 0,
    p95Latency: result.p95_latency || 0,
    p99Latency: result.p99_latency || 0,
    avgLatency: result.avg_latency || 0,
    totalConversations: result.total_conversations || 0,
  }
}

/**
 * Get error statistics for a business
 */
export async function getErrorStats(
  businessId: string,
  days: number = 7
): Promise<{
  totalConversations: number
  conversationsWithErrors: number
  errorRate: number
  totalErrors: number
  avgErrorsPerConversation: number
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_error_stats', {
    business_uuid: businessId,
    start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
  })

  if (error) {
    console.error('[Metrics] Error fetching error stats:', error)
    return null
  }

  const result = data?.[0] || {
    total_conversations: 0,
    conversations_with_errors: 0,
    error_rate: 0,
    total_errors: 0,
    avg_errors_per_conversation: 0,
  }

  return {
    totalConversations: result.total_conversations || 0,
    conversationsWithErrors: result.conversations_with_errors || 0,
    errorRate: parseFloat(result.error_rate || '0'),
    totalErrors: result.total_errors || 0,
    avgErrorsPerConversation: parseFloat(result.avg_errors_per_conversation || '0'),
  }
}

/**
 * Get hourly latency trends
 */
export async function getHourlyLatency(
  businessId: string,
  hours: number = 24
): Promise<
  Array<{
    hour: string
    avgLatency: number
    p95Latency: number
    conversationCount: number
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_hourly_latency', {
    business_uuid: businessId,
    hours,
  })

  if (error) {
    console.error('[Metrics] Error fetching hourly latency:', error)
    return []
  }

  return (data || []).map((d: any) => ({
    hour: d.hour,
    avgLatency: d.avg_latency || 0,
    p95Latency: d.p95_latency || 0,
    conversationCount: d.conversation_count || 0,
  }))
}
