-- Bookings table for appointment scheduling (Phase 7)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    booking_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    booking_type TEXT DEFAULT 'demo',
    notes TEXT,
    source TEXT DEFAULT 'website', -- voice, chat, website, manual
    status TEXT DEFAULT 'confirmed', -- confirmed, pending, cancelled, completed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Users can see their own bookings
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert bookings (authenticated)
CREATE POLICY "Users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for API routes using service key)
CREATE POLICY "Service role full access" ON public.bookings
    FOR ALL USING (auth.role() = 'service_role');

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
