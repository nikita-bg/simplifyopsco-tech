/**
 * Get messages for a specific conversation.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const conversationId = searchParams.get('id')

        if (!conversationId) {
            return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 })
        }

        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify conversation belongs to user
        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('user_id', user.id)
            .single()

        if (!conv) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ messages: messages || [] })
    } catch (err) {
        console.error('[Messages] Fetch error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
