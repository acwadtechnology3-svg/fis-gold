-- ============================================================================
-- ADD MISSING COLUMNS TO PROFILES TABLE
-- ============================================================================
-- Run this in Supabase SQL Editor to add the columns needed by CompleteProfile
-- ============================================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- first_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
    END IF;
    
    -- last_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
    END IF;
    
    -- avatar_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- wallet_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'wallet_type') THEN
        ALTER TABLE profiles ADD COLUMN wallet_type TEXT;
    END IF;
    
    -- wallet_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'wallet_number') THEN
        ALTER TABLE profiles ADD COLUMN wallet_number TEXT;
    END IF;
    
    -- id_front_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'id_front_url') THEN
        ALTER TABLE profiles ADD COLUMN id_front_url TEXT;
    END IF;
    
    -- id_back_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'id_back_url') THEN
        ALTER TABLE profiles ADD COLUMN id_back_url TEXT;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
