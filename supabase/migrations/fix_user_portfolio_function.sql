-- =====================================================
-- FIX SCRIPT FOR get_user_portfolio FUNCTION
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS public.get_user_portfolio(UUID);

-- Step 2: Add missing column if it doesn't exist
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS gold_grams DECIMAL(10,4);

-- Step 3: Create a simple version of the function that works with any schema
CREATE OR REPLACE FUNCTION public.get_user_portfolio(p_user_id UUID)
RETURNS TABLE (
  total_invested NUMERIC,
  total_gold_grams NUMERIC, 
  pending_deposits NUMERIC,
  approved_deposits NUMERIC,
  pending_withdrawals NUMERIC,
  completed_withdrawals NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_invested NUMERIC := 0;
  v_total_gold_grams NUMERIC := 0;
  v_pending_deposits NUMERIC := 0;
  v_approved_deposits NUMERIC := 0;
  v_pending_withdrawals NUMERIC := 0;
  v_completed_withdrawals NUMERIC := 0;
BEGIN
  -- Get deposit stats
  SELECT 
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN COALESCE(d.gold_grams, 0) ELSE 0 END), 0),
    COALESCE(COUNT(CASE WHEN d.status = 'pending' THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN d.status = 'approved' THEN 1 END), 0)
  INTO v_total_invested, v_total_gold_grams, v_pending_deposits, v_approved_deposits
  FROM public.deposits d
  WHERE d.user_id = p_user_id;
  
  -- Get withdrawal stats - using text comparison to avoid enum issues
  BEGIN
    SELECT COALESCE(COUNT(*), 0)
    INTO v_pending_withdrawals
    FROM public.withdrawals w 
    WHERE w.user_id = p_user_id 
    AND w.status::text = 'pending';
  EXCEPTION WHEN OTHERS THEN
    v_pending_withdrawals := 0;
  END;
  
  BEGIN
    SELECT COALESCE(COUNT(*), 0)
    INTO v_completed_withdrawals
    FROM public.withdrawals w 
    WHERE w.user_id = p_user_id 
    AND w.status::text = 'completed';
  EXCEPTION WHEN OTHERS THEN
    v_completed_withdrawals := 0;
  END;
  
  RETURN QUERY SELECT 
    v_total_invested,
    v_total_gold_grams,
    v_pending_deposits,
    v_approved_deposits,
    v_pending_withdrawals,
    v_completed_withdrawals;
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_portfolio(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_portfolio(UUID) TO anon;
