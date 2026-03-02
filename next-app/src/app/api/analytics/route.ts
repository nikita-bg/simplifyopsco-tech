/**
 * Analytics API
 *
 * Aggregates conversation data from Supabase for the dashboard.
 * Returns: total conversations, sentiment breakdown, intent distribution,
 * conversion rate, avg duration, timeline data, recent conversations.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all conversations for this user
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[Analytics] Fetch error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const convs = conversations || []
        const total = convs.length

        // Sentiment breakdown
        const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }
        convs.forEach((c) => {
            const s = c.sentiment
            if (s === 'positive') sentimentCounts.positive++
            else if (s === 'negative') sentimentCounts.negative++
            else sentimentCounts.neutral++
        })

        // Average sentiment score
        const scoresWithData = convs.filter((c) => c.sentiment_score != null)
        const avgSentimentScore =
            scoresWithData.length > 0
                ? scoresWithData.reduce((a, c) => a + (c.sentiment_score || 0), 0) /
                scoresWithData.length
                : null

        // Intent distribution (top 5)
        const intentMap: Record<string, number> = {}
        convs.forEach((c) => {
            if (c.intent) {
                intentMap[c.intent] = (intentMap[c.intent] || 0) + 1
            }
        })
        const intentDistribution = Object.entries(intentMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([intent, count]) => ({ intent, count }))

        // Conversion rate (conversations with booking intent or is_converted)
        const converted = convs.filter((c) => c.is_converted).length
        const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

        // Duration stats
        const durationsWithData = convs.filter((c) => c.duration_seconds > 0)
        const avgDuration =
            durationsWithData.length > 0
                ? Math.round(
                    durationsWithData.reduce((a, c) => a + (c.duration_seconds || 0), 0) /
                    durationsWithData.length
                )
                : 0

        // Timeline — last 14 days
        const now = new Date()
        const timeline: { date: string; count: number }[] = []
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().slice(0, 10)
            const count = convs.filter(
                (c) => (c.created_at || '').slice(0, 10) === dateStr
            ).length
            timeline.push({ date: dateStr, count })
        }

        // Recent conversations (last 10)
        const recent = convs.slice(0, 10).map((c) => ({
            id: c.id,
            sessionId: c.session_id,
            sentiment: c.sentiment,
            intent: c.intent,
            duration: c.duration_seconds,
            turnCount: c.turn_count,
            isConverted: c.is_converted,
            createdAt: c.created_at,
        }))

        return NextResponse.json({
            total,
            converted,
            conversionRate,
            avgDuration,
            avgSentimentScore,
            sentimentBreakdown: sentimentCounts,
            intentDistribution,
            timeline,
            recent,
        })
    } catch (err) {
        console.error('[Analytics] Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
