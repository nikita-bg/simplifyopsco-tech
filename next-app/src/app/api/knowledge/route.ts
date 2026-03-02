/**
 * Knowledge Base API
 * 
 * Handles document management for the RAG knowledge base.
 * - GET: List all documents for the current user
 * - POST: Upload and embed a new document
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List knowledge base documents
export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('knowledge_base')
            .select('id, title, source_type, content, metadata, created_at, updated_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[KB] List error:', error)
            return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
        }

        return NextResponse.json({ documents: data || [] })
    } catch (error) {
        console.error('[KB] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST: Add document to knowledge base
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { title, content, sourceType = 'text' } = body

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Title and content are required' },
                { status: 400 }
            )
        }

        // Generate embedding using OpenAI
        const openaiKey = process.env.OPENAI_API_KEY
        let embedding = null

        if (openaiKey) {
            try {
                const embeddingRes = await fetch(
                    'https://api.openai.com/v1/embeddings',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${openaiKey}`,
                        },
                        body: JSON.stringify({
                            model: 'text-embedding-3-small',
                            input: content.slice(0, 8000), // Limit to ~8k chars
                        }),
                    }
                )

                if (embeddingRes.ok) {
                    const embeddingData = await embeddingRes.json()
                    embedding = embeddingData.data[0].embedding
                } else {
                    console.error(
                        '[KB] Embedding error:',
                        embeddingRes.status,
                        await embeddingRes.text()
                    )
                }
            } catch (embErr) {
                console.error('[KB] Embedding request failed:', embErr)
            }
        }

        // Insert into knowledge_base
        const { data, error } = await supabase
            .from('knowledge_base')
            .insert({
                user_id: user.id,
                title,
                content,
                source_type: sourceType,
                embedding,
                metadata: {
                    char_count: content.length,
                    word_count: content.split(/\s+/).length,
                    uploaded_at: new Date().toISOString(),
                },
            })
            .select('id, title, source_type, created_at')
            .single()

        if (error) {
            console.error('[KB] Insert error:', error)
            return NextResponse.json(
                { error: 'Failed to save document' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            document: data,
            embedded: !!embedding,
        })
    } catch (error) {
        console.error('[KB] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE: Remove a document
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const docId = searchParams.get('id')

        if (!docId) {
            return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('knowledge_base')
            .delete()
            .eq('id', docId)
            .eq('user_id', user.id)

        if (error) {
            console.error('[KB] Delete error:', error)
            return NextResponse.json(
                { error: 'Failed to delete document' },
                { status: 500 }
            )
        }

        return NextResponse.json({ deleted: true })
    } catch (error) {
        console.error('[KB] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
