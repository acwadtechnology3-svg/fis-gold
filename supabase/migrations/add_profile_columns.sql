-- ============================================================================
-- ADDITIONAL TABLES AND COLUMNS
-- ============================================================================
-- Run this AFTER complete_wallet_gold_schema.sql
-- Adds: profile columns for CompleteProfile, chat_messages table, storage bucket
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO PROFILES TABLE
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'wallet_type') THEN
        ALTER TABLE profiles ADD COLUMN wallet_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'wallet_number') THEN
        ALTER TABLE profiles ADD COLUMN wallet_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id_front_url') THEN
        ALTER TABLE profiles ADD COLUMN id_front_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id_back_url') THEN
        ALTER TABLE profiles ADD COLUMN id_back_url TEXT;
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE CHAT MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('user', 'admin')) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON public.chat_messages;

-- Create policies
CREATE POLICY "Users can view their own messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (service role bypasses RLS, but for UI admins)
CREATE POLICY "Admins can view all messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update messages" ON public.chat_messages
  FOR UPDATE TO authenticated USING (true);

-- Function to get chat conversations for admin
CREATE OR REPLACE FUNCTION public.get_chat_conversations()
RETURNS TABLE (
  user_id UUID,
  last_message TEXT,
  unread_count BIGINT,
  last_message_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH last_msgs AS (
    SELECT DISTINCT ON (cm.user_id) 
      cm.user_id,
      cm.message,
      cm.created_at
    FROM chat_messages cm
    ORDER BY cm.user_id, cm.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      cm.user_id,
      COUNT(*) AS count
    FROM chat_messages cm
    WHERE cm.sender_type = 'user' AND cm.is_read = false
    GROUP BY cm.user_id
  )
  SELECT 
    lm.user_id,
    lm.message AS last_message,
    COALESCE(uc.count, 0) AS unread_count,
    lm.created_at AS last_message_at
  FROM last_msgs lm
  LEFT JOIN unread_counts uc ON lm.user_id = uc.user_id
  ORDER BY lm.created_at DESC;
END;
$$;

-- ============================================================================
-- 3. CREATE STORAGE BUCKET FOR IMAGES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- ============================================================================
-- 4. CREATE PROFILE TRIGGER (auto-create on signup)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- DONE! Verify with:
-- SELECT * FROM profiles LIMIT 5;
-- SELECT * FROM chat_messages LIMIT 5;
-- ============================================================================
