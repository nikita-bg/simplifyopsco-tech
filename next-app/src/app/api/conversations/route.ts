/**
 * Conversation Logging API
 * 
 * Stores voice conversation data from the ElevenLabs agent in Supabase.
 * Called by the voice widget when a conversation ends.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        const body = await request.json()
        const {
            sessionId,
            messages = [],
            duration,
            sentiment,
            sentimentScore,
            intent,
        } = body

        // Create conversation record
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .insert({
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

        return NextResponse.json({
            conversationId: conversation?.id,
            saved: true,
        })
    } catch (error) {
        console.error('[Conversations] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
