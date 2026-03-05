/**
 * Conversation Logging API
 *
 * Stores voice conversation data from the ElevenLabs agent in Supabase.
 * Called by the voice widget when a conversation ends.
 *
 * Handles usage tracking, overage charges, cost monitoring, and performance metrics.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { incrementConversationCount } from '@/lib/usage-tracking'
import { logConversationCost } from '@/lib/cost-tracking'
import { logConversationMetrics } from '@/lib/metrics-tracking'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        const body = await request.json()
        const {
            businessId,
            sessionId,
            messages = [],
            duration,
            sentiment,
            sentimentScore,
            intent,
            // Cost tracking data (from ElevenLabs API response)
            voiceSeconds = 0,
            llmInputTokens = 0,
            llmOutputTokens = 0,
            // Performance metrics (from ElevenLabs API response)
            totalLatency = 0,
            llmLatency = 0,
            voiceLatency = 0,
            errorCount = 0,
            errorTypes = [],
            interruptionsCount = 0,
            retryCount = 0,
            metadata = {},
        } = body

        if (!businessId) {
            return NextResponse.json(
                { error: 'business_id required' },
                { status: 400 }
            )
        }

        // Create conversation record
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .insert({
                business_id: businessId,
                user_id: user?.id || null,
                session_id: sessionId || crypto.randomUUID(),
                status: 'completed',
                sentiment: sentiment || null,
                sentiment_score: sentimentScore || null,
                intent: intent || null,
                duration_seconds: duration || 0,
                turn_count: messages.length,
                is_converted: intent === 'booking',
                ended_at: new Date().toISOString(),
            })
            .select('id')
            .single()

        if (convError) {
            console.error('[Conversations] Insert error:', convError)
            return NextResponse.json(
                { error: 'Failed to save conversation' },
                { status: 500 }
            )
        }

        // Insert messages
        if (messages.length > 0 && conversation?.id) {
            const messageRecords = messages.map(
                (msg: { role: string; text: string; timestamp?: string }) => ({
                    conversation_id: conversation.id,
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.text,
                    created_at: msg.timestamp || new Date().toISOString(),
                })
            )

            const { error: msgError } = await supabase
                .from('messages')
                .insert(messageRecords)

            if (msgError) {
                console.error('[Messages] Insert error:', msgError)
            }
        }

        // Track usage and handle overage charges
        const usageResult = await incrementConversationCount(businessId)

        if (!usageResult.success) {
            console.error('[Usage] Failed to increment conversation count:', businessId)
        }

        // Log conversation costs for analytics
        if (conversation?.id && (voiceSeconds > 0 || llmInputTokens > 0 || llmOutputTokens > 0)) {
            await logConversationCost({
                conversationId: conversation.id,
                businessId,
                voiceSeconds,
                llmInputTokens,
                llmOutputTokens,
                metadata,
            })
        }

        // Log performance metrics for observability
        if (conversation?.id && totalLatency > 0) {
            await logConversationMetrics({
                conversationId: conversation.id,
                businessId,
                totalLatency,
                llmLatency,
                voiceLatency,
                apiLatency: totalLatency - llmLatency - voiceLatency,
                errorCount,
                errorTypes,
                turnsCount: messages.length,
                interruptionsCount,
                retryCount,
                metadata,
            })
        }

        return NextResponse.json({
            conversationId: conversation?.id,
            saved: true,
            usage: {
                count: usageResult.newCount,
                limitReached: usageResult.limitReached,
                hardLimitReached: usageResult.hardLimitReached,
            },
        })
    } catch (error) {
        console.error('[Conversations] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
