/**
 * Bookings API
 *
 * CRUD for appointment bookings. Supports:
 * - GET: list bookings for the authenticated user
 * - POST: create new booking (from voice/chat or manual)
 * - DELETE: cancel a booking
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', user.id)
            .order('booking_date', { ascending: true })

        if (error) {
            // Table may not exist yet — return empty
            return NextResponse.json({ bookings: [] })
        }

        return NextResponse.json({ bookings: data || [] })
    } catch (err) {
        console.error('[Bookings] GET error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const body = await request.json()
        const {
            name,
            email,
            phone,
            date,
            time,
            duration = 30,
            type = 'demo',
            notes,
            source = 'website',
        } = body

        if (!name || !email || !date || !time) {
            return NextResponse.json(
                { error: 'Name, email, date, and time are required' },
                { status: 400 }
            )
        }

        const bookingDate = new Date(`${date}T${time}`)

        const { data, error } = await supabase
            .from('bookings')
            .insert({
                user_id: user?.id || null,
                customer_name: name,
                customer_email: email,
                customer_phone: phone || null,
                booking_date: bookingDate.toISOString(),
                duration_minutes: duration,
                booking_type: type,
                notes: notes || null,
                source,
                status: 'confirmed',
            })
            .select()
            .single()

        if (error) {
            console.error('[Bookings] Insert error:', error)
            return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
        }

        return NextResponse.json({ booking: data, success: true })
    } catch (err) {
        console.error('[Bookings] POST error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing booking id' }, { status: 400 })
        }

        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[Bookings] DELETE error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
