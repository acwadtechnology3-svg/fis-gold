-- ============================================================================
-- FIX ADMIN RLS AND PENALTY LOGIC
-- ============================================================================

-- 1. DROP EXISTING POLICIES FOR POSITIONS AND WITHDRAWALS TO AVOID CONFLICTS
DROP POLICY IF EXISTS "positions_select_own" ON gold_positions;
DROP POLICY IF EXISTS "withdrawals_select_own" ON withdrawals;
DROP POLICY IF EXISTS "positions_admin_all" ON gold_positions;
DROP POLICY IF EXISTS "withdrawals_admin_all" ON withdrawals;

-- 2. CREATE NEW POLICIES THAT CHECK user_roles TABLE
-- This is crucial because "admin" PG role is often not used in Supabase Auth context directly this way.
-- Instead, we check if the authenticated user has an 'admin' entry in user_roles.

-- Gold Positions: Users see their own
CREATE POLICY "positions_select_own" ON gold_positions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Gold Positions: Admins see ALL
CREATE POLICY "positions_select_admin" ON gold_positions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Withdrawals: Users see their own
CREATE POLICY "withdrawals_select_own" ON withdrawals
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Withdrawals: Admins see ALL
CREATE POLICY "withdrawals_select_admin" ON withdrawals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- 3. RE-APPLY RPCs TO ENSURE PENALTY LOGIC IS PRESENT
-- (Copying the logic from previous migration to ensure it overrides any old versions)

DROP FUNCTION IF EXISTS sell_asset(UUID, TEXT);
DROP FUNCTION IF EXISTS sell_asset; -- Try dropping generic as well if overload not detected properly or to clean up


CREATE OR REPLACE FUNCTION sell_asset(
    p_position_id UUID,
    p_idempotency_key TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    withdrawal_id UUID,
    net_amount DECIMAL
) AS $$
DECLARE
    p_user_id UUID;
    v_position RECORD;
    v_snapshot RECORD;
    v_grams DECIMAL;
    v_sell_price DECIMAL;
    v_gross_amount DECIMAL;
    v_fee_amount DECIMAL;
    v_net_amount DECIMAL;
    v_lock_until TIMESTAMPTZ;
    v_is_early_exit BOOLEAN;
    v_penalty_percent DECIMAL(5, 4) := 0.20; -- 20% Fixed Penalty
    v_withdrawal_id UUID;
BEGIN
    p_user_id := auth.uid();

    -- 1. Check Idempotency
    IF EXISTS (SELECT 1 FROM withdrawals WHERE idempotency_key = 'sell_' || p_idempotency_key) THEN
        RETURN QUERY SELECT FALSE, 'تم تنفيذ العملية مسبقاً', NULL::UUID, 0::DECIMAL;
        RETURN;
    END IF;

    -- 2. Get Position (Must be active or matured)
    SELECT * INTO v_position FROM gold_positions 
    WHERE id = p_position_id AND user_id = p_user_id
    AND status IN ('active', 'matured');

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'لم يتم العثور على المركز أو أنه غير نشط', NULL::UUID, 0::DECIMAL;
        RETURN;
    END IF;

    v_grams := v_position.grams;
    v_lock_until := v_position.lock_until;

    -- 3. Get Current Sell Price (Snapshot)
    SELECT * INTO v_snapshot FROM gold_price_snapshots 
    WHERE user_id = p_user_id AND used = false AND expires_at > NOW()
    AND metal_type = v_position.metal_type
    ORDER BY created_at DESC LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'لم يتم العثور على عرض سعر صالح، يرجى التحديث', NULL::UUID, 0::DECIMAL;
        RETURN;
    END IF;

    -- Handle potential missing columns in snapshot by checking record structure or using COALESCE if columns exist
    -- Assuming columns exist based on previous work: sell_price
    v_sell_price := v_snapshot.sell_price; 

    -- 4. Calculate Amounts
    v_gross_amount := v_grams * v_sell_price;
    v_is_early_exit := (v_lock_until > NOW());

    IF v_is_early_exit THEN
        v_fee_amount := v_gross_amount * v_penalty_percent; -- Apply 20% penalty
    ELSE
        v_fee_amount := 0;
    END IF;

    v_net_amount := v_gross_amount - v_fee_amount;

    -- 5. Create Withdrawal Request
    INSERT INTO withdrawals (
        user_id,
        withdrawal_type,
        gross_amount,
        fee_amount,
        net_amount,
        currency,
        position_id,
        status, -- Set to REQUESTED
        idempotency_key,
        metadata
    ) VALUES (
        p_user_id,
        'forced',
        v_gross_amount,
        v_fee_amount,
        v_net_amount,
        'EGP',
        p_position_id,
        'requested', -- Important: Requires admin approval
        'sell_' || p_idempotency_key,
        jsonb_build_object(
            'is_early_exit', v_is_early_exit,
            'penalty_percent', CASE WHEN v_is_early_exit THEN v_penalty_percent ELSE 0 END,
            'sell_price', v_sell_price,
            'grams', v_grams
        )
    ) RETURNING id INTO v_withdrawal_id;

    -- 6. Update Position Status to Closing
    UPDATE gold_positions 
    SET status = 'closing',
        updated_at = NOW()
    WHERE id = p_position_id;

    -- 7. Mark Snapshot as Used
    UPDATE gold_price_snapshots SET used = true, used_at = NOW(), used_in_position_id = p_position_id WHERE id = v_snapshot.id;

    RETURN QUERY SELECT TRUE, 'تم إرسال طلب البيع للمراجعة', v_withdrawal_id, v_net_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sell_asset(UUID, TEXT) TO authenticated;
