/**
 * Supabase Admin Client
 * 
 * Uses the service_role key to bypass RLS policies.
 * ONLY use this in server-side code (API routes, Server Actions)
 * for administrative operations like:
 * - Creating user accounts
 * - Bulk data operations
 * - Background jobs
 * 
 * NEVER expose this client to the browser.
 */
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}
