-- Add missing columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS wallet_type text,
ADD COLUMN IF NOT EXISTS wallet_number text,
ADD COLUMN IF NOT EXISTS id_front_url text,
ADD COLUMN IF NOT EXISTS id_back_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Update the handle_new_user function if it exists to initialize these (optional, but good practice)
-- For now, we just ensure the columns exist so the CompleteProfile page can save data to them.
