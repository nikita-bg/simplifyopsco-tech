/**
 * ElevenLabs Conversation Token API
 * 
 * Generates a signed conversation token server-side.
 * This is more secure than exposing the agent_id directly on the client,
 * as it prevents unauthorized usage of the agent.
 */
import { NextResponse } from 'next/server'

export async function GET() {
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!agentId || !apiKey) {
        return NextResponse.json(
            { error: 'ElevenLabs not configured' },
            { status: 500 }
        )
    }

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey,
                },
            }
        )

        if (!response.ok) {
            const errText = await response.text()
            console.error('[ElevenLabs Token] Error:', response.status, errText)
            return NextResponse.json(
                { error: 'Failed to get conversation token' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json({ signedUrl: data.signed_url })
    } catch (error) {
        console.error('[ElevenLabs Token] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
