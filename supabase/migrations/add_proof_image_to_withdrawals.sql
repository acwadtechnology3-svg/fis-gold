-- Add proof_image column to withdrawals table
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS proof_image TEXT;
