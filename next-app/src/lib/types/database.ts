/**
 * Database Types
 * 
 * TypeScript types matching the Supabase database schema.
 * These should be auto-generated via `supabase gen types typescript`
 * once the database is set up. For now, manually defined.
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    company_name: string | null
                    avatar_url: string | null
                    role: 'owner' | 'admin' | 'viewer'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    company_name?: string | null
                    avatar_url?: string | null
                    role?: 'owner' | 'admin' | 'viewer'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    company_name?: string | null
                    avatar_url?: string | null
                    role?: 'owner' | 'admin' | 'viewer'
                    created_at?: string
                    updated_at?: string
                }
            }
            conversations: {
                Row: {
                    id: string
                    user_id: string | null
                    session_id: string
                    status: 'active' | 'completed' | 'abandoned'
                    sentiment: 'positive' | 'neutral' | 'negative' | null
                    sentiment_score: number | null
                    intent: 'booking' | 'question' | 'navigation' | 'support' | 'sales' | 'other' | null
                    duration_seconds: number
                    turn_count: number
                    is_converted: boolean
                    metadata: Json
                    started_at: string
                    ended_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    session_id: string
                    status?: 'active' | 'completed' | 'abandoned'
                    sentiment?: 'positive' | 'neutral' | 'negative' | null
                    sentiment_score?: number | null
                    intent?: 'booking' | 'question' | 'navigation' | 'support' | 'sales' | 'other' | null
                    duration_seconds?: number
                    turn_count?: number
                    is_converted?: boolean
                    metadata?: Json
                    started_at?: string
                    ended_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    session_id?: string
                    status?: 'active' | 'completed' | 'abandoned'
                    sentiment?: 'positive' | 'neutral' | 'negative' | null
                    sentiment_score?: number | null
                    intent?: 'booking' | 'question' | 'navigation' | 'support' | 'sales' | 'other' | null
                    duration_seconds?: number
                    turn_count?: number
                    is_converted?: boolean
                    metadata?: Json
                    started_at?: string
                    ended_at?: string | null
                    created_at?: string
                }
            }
            messages: {
                Row: {
                    id: string
                    conversation_id: string
                    role: 'user' | 'assistant' | 'system'
                    content: string
                    audio_url: string | null
                    confidence: number | null
                    latency_ms: number | null
                    metadata: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    conversation_id: string
                    role: 'user' | 'assistant' | 'system'
                    content: string
                    audio_url?: string | null
                    confidence?: number | null
                    latency_ms?: number | null
                    metadata?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    conversation_id?: string
                    role?: 'user' | 'assistant' | 'system'
                    content?: string
                    audio_url?: string | null
                    confidence?: number | null
                    latency_ms?: number | null
                    metadata?: Json
                    created_at?: string
                }
            }
            knowledge_base: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    content: string
                    embedding: number[] | null
                    source: string | null
                    source_url: string | null
                    file_type: string | null
                    chunk_index: number
                    metadata: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    content: string
                    embedding?: number[] | null
                    source?: string | null
                    source_url?: string | null
                    file_type?: string | null
                    chunk_index?: number
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    content?: string
                    embedding?: number[] | null
                    source?: string | null
                    source_url?: string | null
                    file_type?: string | null
                    chunk_index?: number
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            bookings: {
                Row: {
                    id: string
                    user_id: string
                    conversation_id: string | null
                    customer_name: string
                    customer_email: string | null
                    customer_phone: string | null
                    booking_date: string
                    booking_time: string
                    duration_minutes: number
                    status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
                    notes: string | null
                    metadata: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    conversation_id?: string | null
                    customer_name: string
                    customer_email?: string | null
                    customer_phone?: string | null
                    booking_date: string
                    booking_time: string
                    duration_minutes?: number
                    status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
                    notes?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    conversation_id?: string | null
                    customer_name?: string
                    customer_email?: string | null
                    customer_phone?: string | null
                    booking_date?: string
                    booking_time?: string
                    duration_minutes?: number
                    status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
                    notes?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            available_slots: {
                Row: {
                    id: string
                    user_id: string
                    day_of_week: number
                    start_time: string
                    end_time: string
                    slot_duration_minutes: number
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    day_of_week: number
                    start_time: string
                    end_time: string
                    slot_duration_minutes?: number
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    day_of_week?: number
                    start_time?: string
                    end_time?: string
                    slot_duration_minutes?: number
                    is_active?: boolean
                    created_at?: string
                }
            }
        }
        Functions: {
            match_documents: {
                Args: {
                    query_embedding: number[]
                    match_threshold?: number
                    match_count?: number
                    filter_user_id?: string | null
                }
                Returns: {
                    id: string
                    title: string
                    content: string
                    similarity: number
                    metadata: Json
                }[]
            }
        }
    }
}
