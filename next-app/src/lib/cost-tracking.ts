/**
 * Cost Tracking Utilities
 *
 * Tracks AI provider costs per conversation for profit margin analysis
 */

import { createClient } from '@/lib/supabase/server'

// Pricing constants (as of 2025)
const PRICING = {
  // ElevenLabs pricing: https://elevenlabs.io/pricing
  elevenlabs: {
    // Conversational AI pricing per minute
    pricePerMinute: 0.10, // $0.10 per minute of voice synthesis
  },
  // OpenAI pricing: https://openai.com/pricing
  openai: {
    // GPT-4 Turbo pricing per 1K tokens
    gpt4TurboInput: 0.01, // $0.01 per 1K input tokens
    gpt4TurboOutput: 0.03, // $0.03 per 1K output tokens
  },
}

export interface ConversationCostData {
  conversationId: string
  businessId: string
  voiceSeconds: number
  llmInputTokens: number
  llmOutputTokens: number
  metadata?: Record<string, any>
}

/**
 * Calculate and log conversation costs
 */
export async function logConversationCost(data: ConversationCostData): Promise<boolean> {
  const supabase = await createClient()

  // Calculate costs
  const voiceMinutes = data.voiceSeconds / 60
  const elevenlabsCost = voiceMinutes * PRICING.elevenlabs.pricePerMinute

  const openaiInputCost = (data.llmInputTokens / 1000) * PRICING.openai.gpt4TurboInput
  const openaiOutputCost = (data.llmOutputTokens / 1000) * PRICING.openai.gpt4TurboOutput
  const openaiCost = openaiInputCost + openaiOutputCost

  const totalCost = elevenlabsCost + openaiCost

  // Insert cost record
  const { error } = await supabase.from('conversation_costs').insert({
    conversation_id: data.conversationId,
    business_id: data.businessId,
    elevenlabs_cost: elevenlabsCost,
    openai_cost: openaiCost,
    total_cost: totalCost,
    voice_seconds: data.voiceSeconds,
    llm_tokens: data.llmInputTokens + data.llmOutputTokens,
    llm_input_tokens: data.llmInputTokens,
    llm_output_tokens: data.llmOutputTokens,
    metadata: data.metadata || {},
  })

  if (error) {
    console.error('[Cost] Error logging conversation cost:', error)
    return false
  }

  console.log(`[Cost] Logged cost for conversation ${data.conversationId}: $${totalCost.toFixed(4)}`)
  return true
}

/**
 * Get cost analytics for a business
 */
export async function getBusinessCosts(
  businessId: string,
  days: number = 30
): Promise<{
  totalConversations: number
  totalCost: number
  avgCostPerConversation: number
  elevenlabsCost: number
  openaiCost: number
  dailyBreakdown: Array<{
    date: string
    conversationCount: number
    totalCost: number
    elevenlabsCost: number
    openaiCost: number
  }>
} | null> {
  const supabase = await createClient()

  // Get aggregate costs
  const { data: summary, error: summaryError } = await supabase.rpc('get_business_costs', {
    business_uuid: businessId,
    start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
  })

  if (summaryError) {
    console.error('[Cost] Error fetching business costs:', summaryError)
    return null
  }

  // Get daily breakdown
  const { data: daily, error: dailyError } = await supabase.rpc('get_daily_costs', {
    business_uuid: businessId,
    days,
  })

  if (dailyError) {
    console.error('[Cost] Error fetching daily costs:', dailyError)
    return null
  }

  const summaryData = summary?.[0] || {
    total_conversations: 0,
    total_cost: 0,
    avg_cost_per_conversation: 0,
    elevenlabs_cost: 0,
    openai_cost: 0,
  }

  return {
    totalConversations: summaryData.total_conversations || 0,
    totalCost: parseFloat(summaryData.total_cost || '0'),
    avgCostPerConversation: parseFloat(summaryData.avg_cost_per_conversation || '0'),
    elevenlabsCost: parseFloat(summaryData.elevenlabs_cost || '0'),
    openaiCost: parseFloat(summaryData.openai_cost || '0'),
    dailyBreakdown: (daily || []).map((d: any) => ({
      date: d.date,
      conversationCount: d.conversation_count || 0,
      totalCost: parseFloat(d.total_cost || '0'),
      elevenlabsCost: parseFloat(d.elevenlabs_cost || '0'),
      openaiCost: parseFloat(d.openai_cost || '0'),
    })),
  }
}
