/**
 * n8n Webhook Receiver
 * 
 * Receives webhook callbacks from n8n workflows.
 * Protected by a shared secret (N8N_WEBHOOK_SECRET).
 * 
 * Used for:
 * - Knowledge base document processing completion
 * - Workflow status updates
 * - Google Drive sync notifications
 */
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const payload = await request.json()

        // Log webhook event (will be replaced with proper handling in later phases)
        console.log('[n8n Webhook]', payload.event || 'unknown event', payload)

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('[n8n Webhook] Error:', error)
        return NextResponse.json(
            { error: 'Invalid payload' },
            { status: 400 }
        )
    }
}
