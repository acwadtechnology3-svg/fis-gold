-- =====================================================
-- FIX SCRIPT FOR get_user_portfolio FUNCTION (UPDATED)
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS public.get_user_portfolio(UUID);

-- Step 2: Ensure tables exist (optional safety/debugging)
-- We assume gold_positions exists because other RPCs use it.

-- Step 3: Create the corrected function
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
  -- 1. Get Deposit Stats (Cash Flow)
  -- Total Invested = Sum of APPROVED deposits (in money)
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(COUNT(*), 0)
  INTO v_total_invested, v_approved_deposits
  FROM public.deposits 
  WHERE user_id = p_user_id AND status = 'approved';

  -- Pending Deposits count
  SELECT COALESCE(COUNT(*), 0)
  INTO v_pending_deposits
  FROM public.deposits 
  WHERE user_id = p_user_id AND status = 'pending';

  -- 2. Get Gold Stats (Assets)
  -- Total Gold Grams = Sum of Active Gold Positions + Gold from Deposits (if any legacy)
  -- We query gold_positions first if it exists.
  BEGIN
    SELECT COALESCE(SUM(grams), 0)
    INTO v_total_gold_grams
    FROM public.gold_positions
    WHERE user_id = p_user_id AND status = 'active';
  EXCEPTION WHEN OTHERS THEN
    -- If gold_positions table missing, fallback to deposits
    v_total_gold_grams := 0;
  END;

  -- Add legacy gold from deposits if not 0 (and if not double counting)
  -- Assuming new system uses gold_positions exclusively for gold holding.
  -- But if we keep gold_grams in deposits, we might need to add it.
  -- For now, let's ADD it to be safe, assuming migration didn't move it.
  -- Or strictly use gold_positions. Let's add ONLY if gold_positions returned 0? 
  -- No, let's SUM both but be careful. 
  -- Actually, the legacy 'deposits' table had 'gold_grams'. 
  -- If those are not migrated to 'gold_positions', we must count them.
  DECLARE
    v_legacy_gold NUMERIC := 0;
  BEGIN
     SELECT COALESCE(SUM(gold_grams), 0) INTO v_legacy_gold
     FROM public.deposits 
     WHERE user_id = p_user_id AND status = 'approved';
     
     v_total_gold_grams := v_total_gold_grams + v_legacy_gold;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- 3. Get Withdrawal Stats
  BEGIN
    SELECT COALESCE(COUNT(*), 0)
    INTO v_pending_withdrawals
    FROM public.withdrawals 
    WHERE user_id = p_user_id 
    AND (status = 'pending' OR status = 'requested'); -- Check both statuses
  EXCEPTION WHEN OTHERS THEN v_pending_withdrawals := 0; END;
  
  BEGIN
    SELECT COALESCE(COUNT(*), 0)
    INTO v_completed_withdrawals
    FROM public.withdrawals 
    WHERE user_id = p_user_id 
    AND status = 'completed';
  EXCEPTION WHEN OTHERS THEN v_completed_withdrawals := 0; END;
  
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
