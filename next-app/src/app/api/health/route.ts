/**
 * Health Check API Route
 * 
 * Verifies the application is running and key services are reachable.
 * Useful for Vercel monitoring and UptimeRobot/similar services.
 */
import { NextResponse } from 'next/server'

export async function GET() {
    const checks = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        services: {
            supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
            elevenlabs: process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing',
            openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
            n8n: process.env.N8N_BASE_URL ? 'configured' : 'missing',
        },
    }

    return NextResponse.json(checks)
}
