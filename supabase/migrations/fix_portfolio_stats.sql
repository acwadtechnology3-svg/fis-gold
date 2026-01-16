-- ============================================================================
-- FIX USER PORTFOLIO STATS RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_portfolio(p_user_id UUID)
RETURNS TABLE (
    total_invested DECIMAL,
    total_gold_grams DECIMAL,
    pending_deposits DECIMAL,
    approved_deposits DECIMAL,
    pending_withdrawals DECIMAL,
    completed_withdrawals DECIMAL
) AS $$
DECLARE
    v_total_invested DECIMAL := 0;
    v_total_gold_grams DECIMAL := 0;
    v_pending_deposits DECIMAL := 0;
    v_approved_deposits DECIMAL := 0;
    v_pending_withdrawals DECIMAL := 0;
    v_completed_withdrawals DECIMAL := 0;
BEGIN
    -- 1. Calculate Total Invested (Active + Matured Positions)
    -- This sums the BUY AMOUNT of all currently held assets
    SELECT COALESCE(SUM(buy_amount), 0), COALESCE(SUM(grams), 0)
    INTO v_total_invested, v_total_gold_grams
    FROM gold_positions
    WHERE user_id = p_user_id 
    AND status IN ('active', 'matured');

    -- 2. Calculate Deposits
    SELECT COALESCE(SUM(amount), 0) INTO v_pending_deposits
    FROM deposits
    WHERE user_id = p_user_id AND status IN ('pending', 'initiated');

    SELECT COALESCE(SUM(amount), 0) INTO v_approved_deposits
    FROM deposits
    WHERE user_id = p_user_id AND status IN ('completed', 'approved'); -- Fixed: Include 'approved' status

    -- 3. Calculate Withdrawals
    SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawals
    FROM withdrawals
    WHERE user_id = p_user_id AND status IN ('requested', 'pending', 'processing');

    SELECT COALESCE(SUM(amount), 0) INTO v_completed_withdrawals
    FROM withdrawals
    WHERE user_id = p_user_id AND status = 'completed';

    RETURN QUERY SELECT 
        v_total_invested,
        v_total_gold_grams,
        v_pending_deposits,
        v_approved_deposits,
        v_pending_withdrawals,
        v_completed_withdrawals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_portfolio(UUID) TO authenticated;
