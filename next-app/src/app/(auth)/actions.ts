'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://simplifyopsco.tech'

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                full_name: formData.get('name') as string,
            },
            emailRedirectTo: `${origin}/auth/callback`,
        },
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect(`/signup?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signInWithGoogle() {
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://simplifyopsco.tech'

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data.url) {
        redirect(data.url)
    }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
