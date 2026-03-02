-- ============================================
-- SimplifyOps Voice AI Platform
-- Initial Database Schema Migration
-- ============================================
-- Run this in Supabase SQL Editor or via Supabase CLI

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Index for RLS performance
CREATE INDEX profiles_id_idx ON profiles(id);

-- 3. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score FLOAT,
  intent TEXT CHECK (intent IN ('booking', 'question', 'navigation', 'support', 'sales', 'other')),
  duration_seconds INTEGER DEFAULT 0,
  turn_count INTEGER DEFAULT 0,
  is_converted BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for conversations
CREATE INDEX conversations_user_id_idx ON conversations(user_id);
CREATE INDEX conversations_started_at_idx ON conversations(started_at DESC);
CREATE INDEX conversations_status_idx ON conversations(status);
CREATE INDEX conversations_sentiment_idx ON conversations(sentiment);
CREATE INDEX conversations_intent_idx ON conversations(intent);

-- 4. Messages table (conversation transcripts)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  audio_url TEXT,
  confidence FLOAT,
  latency_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for messages (join through conversations for user_id check)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Indexes for messages
CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);

-- 5. Knowledge Base table (for RAG / vector embeddings)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-ada-002 dimensions
  source TEXT, -- 'upload', 'google_drive', 'manual'
  source_url TEXT,
  file_type TEXT, -- 'pdf', 'docx', 'txt'
  chunk_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for knowledge_base
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own knowledge base"
  ON knowledge_base FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their own knowledge base"
  ON knowledge_base FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge base"
  ON knowledge_base FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own knowledge base"
  ON knowledge_base FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for knowledge_base
CREATE INDEX knowledge_base_user_id_idx ON knowledge_base(user_id);
CREATE INDEX knowledge_base_embedding_idx
  ON knowledge_base
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 6. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes for bookings
CREATE INDEX bookings_user_id_idx ON bookings(user_id);
CREATE INDEX bookings_date_idx ON bookings(booking_date);
CREATE INDEX bookings_status_idx ON bookings(status);

-- 7. Available Slots configuration
CREATE TABLE IF NOT EXISTS available_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for available_slots
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own slots"
  ON available_slots FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX available_slots_user_id_idx ON available_slots(user_id);

-- 8. Vector similarity search function (for RAG queries)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity,
    knowledge_base.metadata
  FROM knowledge_base
  WHERE
    1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
    AND (filter_user_id IS NULL OR knowledge_base.user_id = filter_user_id)
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 9. Auto-create profile on signup (trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 10. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
