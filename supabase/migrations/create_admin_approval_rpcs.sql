-- 1. Add 'pending' status to position_status enum
-- We use a DO block to safely add the enum value if it doesn't exist
DO $$
BEGIN
    ALTER TYPE position_status ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Modify buy_asset to create PENDING position
CREATE OR REPLACE FUNCTION buy_asset(
    p_user_id UUID, 
    p_snapshot_id UUID, 
    p_amount DECIMAL(18, 4), 
    p_duration_days INTEGER, 
    p_idempotency_key TEXT,
    p_metal_type TEXT DEFAULT 'gold'
) RETURNS TABLE (
    success BOOLEAN, 
    message TEXT, 
    position_id UUID, 
    grams DECIMAL(12, 6), 
    buy_price DECIMAL(12, 4)
) AS $$
DECLARE 
    v_snapshot RECORD; 
    v_wallet RECORD; 
    v_grams DECIMAL(12, 6); 
    v_buy_price DECIMAL(12, 4);
    v_lock_until TIMESTAMPTZ; 
    v_position_id UUID;
    v_min_investment DECIMAL(18, 4);
BEGIN
    -- Check idempotency
    SELECT gp.id, gp.grams, gp.buy_price_ask INTO v_position_id, v_grams, v_buy_price 
    FROM gold_positions gp 
    WHERE gp.user_id = p_user_id AND gp.idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Already processed'::TEXT, v_position_id, v_grams, v_buy_price;
        RETURN;
    END IF;

    -- Validations
    SELECT COALESCE((setting_value->>'amount')::DECIMAL(18, 4), 0) INTO v_min_investment
    FROM investment_settings WHERE setting_key = 'minimum_investment' AND is_active = true;

    IF v_min_investment > 0 AND p_amount < v_min_investment THEN
         RETURN QUERY SELECT false, ('Minimum investment is ' || v_min_investment || ' EGP')::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL;
         RETURN;
    END IF;
    
    SELECT * INTO v_snapshot FROM gold_price_snapshots WHERE id = p_snapshot_id FOR UPDATE;
    IF NOT FOUND OR v_snapshot.used THEN 
        RETURN QUERY SELECT false, 'Snapshot invalid or used'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL; 
        RETURN; 
    END IF;
    
    -- Price Resolution
    v_buy_price := 0;
    BEGIN v_buy_price := v_snapshot.sell_price_gram; EXCEPTION WHEN OTHERS THEN v_buy_price := 0; END;
    IF v_buy_price IS NULL OR v_buy_price = 0 THEN
        BEGIN v_buy_price := v_snapshot.sell_price; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    
    IF v_buy_price IS NULL OR v_buy_price <= 0 THEN
         RETURN QUERY SELECT false, 'Invalid price'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL; 
         RETURN;
    END IF;

    -- Wallet Check & Lock
    SELECT * INTO v_wallet FROM wallet_accounts WHERE wallet_accounts.user_id = p_user_id FOR UPDATE;
    IF v_wallet.available_balance < p_amount THEN 
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL; 
        RETURN; 
    END IF;
    
    v_grams := ROUND(p_amount / v_buy_price, 6);
    v_lock_until := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    -- Create Position as PENDING
    INSERT INTO gold_positions (
        user_id, metal_type, grams, buy_amount, buy_price_ask, 
        price_snapshot_id, duration_days, lock_until, status, idempotency_key
    )
    VALUES (
        p_user_id, p_metal_type, v_grams, p_amount, v_buy_price, 
        p_snapshot_id, p_duration_days, v_lock_until, 'pending', p_idempotency_key
    )
    RETURNING gold_positions.id INTO v_position_id;
    
    -- Mark snapshot used
    UPDATE gold_price_snapshots SET used = true, used_at = NOW(), used_in_position_id = v_position_id WHERE id = p_snapshot_id;
    
    -- Deduct from Available, Add to Locked (Hold funds while pending)
    UPDATE wallet_accounts 
    SET available_balance = available_balance - p_amount, 
        locked_balance = locked_balance + p_amount, 
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Ledger for Lock
    INSERT INTO wallet_ledger (
        user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, idempotency_key, description
    )
    VALUES (
        p_user_id, 'buy_gold_lock', 'debit', p_amount, 'EGP', 'available', v_wallet.available_balance - p_amount, 
        'gold_positions', v_position_id, 'buy_reserve_' || p_idempotency_key, 'Reserve funds for Buy Request'
    );
    
    RETURN QUERY SELECT true, 'تم تقديم طلب الشراء للمراجعة'::TEXT, v_position_id, v_grams, v_buy_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Modify sell_asset to create Withdrawal REQUEST with 20% Penalty for Early Exit
CREATE OR REPLACE FUNCTION sell_asset(
    p_user_id UUID, 
    p_position_id UUID, 
    p_snapshot_id UUID, 
    p_idempotency_key TEXT
) RETURNS TABLE (
    success BOOLEAN, 
    message TEXT, 
    ledger_id UUID, 
    net_amount DECIMAL(18, 4), 
    sell_price DECIMAL(12, 4)
) AS $$
DECLARE 
    v_position RECORD;
    v_snapshot RECORD;
    v_sell_price DECIMAL(12, 4);
    v_gross_amount DECIMAL(18, 4);
    v_net_amount DECIMAL(18, 4);
    v_fee_amount DECIMAL(18, 4);
    v_withdrawal_id UUID;
    v_is_early_exit BOOLEAN;
    v_penalty_percent DECIMAL(5, 4) := 0.20; -- 20% FIXED PENALTY
BEGIN
    -- Check for existing pending/processing withdrawal for this position
    PERFORM 1 FROM withdrawals WHERE position_id = p_position_id AND status IN ('requested', 'approved', 'processing');
    IF FOUND THEN
        RETURN QUERY SELECT false, 'يوجد طلب بيع قيد المراجعة بالفعل'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;

    SELECT * INTO v_position FROM gold_positions WHERE id = p_position_id AND user_id = p_user_id FOR UPDATE;
    
    IF NOT FOUND OR v_position.status NOT IN ('active', 'matured') THEN
        RETURN QUERY SELECT false, 'المركز غير نشط أو غير موجود'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;

    -- Get Price
    SELECT * INTO v_snapshot FROM gold_price_snapshots WHERE id = p_snapshot_id FOR UPDATE;
    
    v_sell_price := 0;
    BEGIN v_sell_price := v_snapshot.buy_price_gram; EXCEPTION WHEN OTHERS THEN v_sell_price := 0; END;
    IF v_sell_price IS NULL OR v_sell_price = 0 THEN
        BEGIN v_sell_price := v_snapshot.buy_price; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    
    IF v_sell_price <= 0 THEN
         RETURN QUERY SELECT false, 'سعر غير صالح'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL;
         RETURN;
    END IF;

    v_gross_amount := v_position.grams * v_sell_price;
    
    -- Check Early Exit (If locked_until is in future)
    v_is_early_exit := (v_position.lock_until > NOW());
    
    IF v_is_early_exit THEN
        v_fee_amount := v_gross_amount * v_penalty_percent;
        v_net_amount := v_gross_amount - v_fee_amount;
    ELSE
        v_fee_amount := 0;
        v_net_amount := v_gross_amount;
    END IF;

    -- Create Withdrawal Request
    INSERT INTO withdrawals (
        user_id, withdrawal_type, gross_amount, fee_amount, net_amount, 
        currency, position_id, status, idempotency_key, metadata
    )
    VALUES (
        p_user_id, 'forced', v_gross_amount, v_fee_amount, v_net_amount, 
        'EGP', p_position_id, 'requested', 'sell_' || p_idempotency_key, 
        jsonb_build_object('is_early_exit', v_is_early_exit, 'penalty_percent', v_penalty_percent, 'sell_price', v_sell_price)
    )
    RETURNING id INTO v_withdrawal_id;
    
    -- Update Position to CLOSING
    UPDATE gold_positions SET status = 'closing', updated_at = NOW() WHERE id = p_position_id;
    
    -- Mark snapshot used
    UPDATE gold_price_snapshots SET used = true, used_at = NOW(), used_in_position_id = p_position_id WHERE id = p_snapshot_id;

    RETURN QUERY SELECT true, 'تم تقديم طلب البيع للمراجعة'::TEXT, v_withdrawal_id, v_net_amount, v_sell_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Admin Function: Approve Buy Request
CREATE OR REPLACE FUNCTION approve_buy_request(
    p_position_id UUID,
    p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_position RECORD;
BEGIN
    SELECT * INTO v_position FROM gold_positions WHERE id = p_position_id AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- Update to active
    UPDATE gold_positions 
    SET status = 'active', 
        updated_at = NOW() 
    WHERE id = p_position_id;
    
    -- Log activity via separate log function if exists, or do nothing
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Admin Function: Approve Withdrawal (Sell) Request
CREATE OR REPLACE FUNCTION approve_withdrawal_request(
    p_withdrawal_id UUID,
    p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_withdrawal RECORD;
    v_position RECORD;
    v_wallet RECORD;
BEGIN
    SELECT * INTO v_withdrawal FROM withdrawals WHERE id = p_withdrawal_id AND status = 'requested' FOR UPDATE;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    -- If linked to position (Sell Asset), close the position
    IF v_withdrawal.position_id IS NOT NULL THEN
        SELECT * INTO v_position FROM gold_positions WHERE id = v_withdrawal.position_id FOR UPDATE;
        
        -- Update position to closed
        UPDATE gold_positions 
        SET status = 'closed', 
            close_time = NOW(), 
            close_amount = v_withdrawal.net_amount, 
            updated_at = NOW()
        WHERE id = v_withdrawal.position_id;
        
        -- Wallet Logic
        SELECT * INTO v_wallet FROM wallet_accounts WHERE user_id = v_withdrawal.user_id FOR UPDATE;
        
        -- Unlock original funds (remove from locked)
        UPDATE wallet_accounts 
        SET locked_balance = locked_balance - v_position.buy_amount,
            available_balance = available_balance + v_withdrawal.net_amount,
            updated_at = NOW()
        WHERE user_id = v_withdrawal.user_id;
            
        -- Ledger entries
        -- 1. Unlock
        INSERT INTO wallet_ledger (
            user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, description
        ) VALUES (
            v_withdrawal.user_id, 'position_unlock', 'credit', v_position.buy_amount, 'EGP', 'locked', v_wallet.locked_balance - v_position.buy_amount,
            'gold_positions', v_position.id, 'Unlock funds from closed position'
        );
        
        -- 2. Credit Net Amount
        INSERT INTO wallet_ledger (
            user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, description
        ) VALUES (
            v_withdrawal.user_id, 'deposit_credit', 'credit', v_withdrawal.net_amount, 'EGP', 'available', v_wallet.available_balance + v_withdrawal.net_amount,
            'withdrawals', v_withdrawal.id, 'Credit sell proceed (Net)'
        );
        
    ELSE
        -- Normal Cash Withdrawal (Not Sell Asset)
        SELECT * INTO v_wallet FROM wallet_accounts WHERE user_id = v_withdrawal.user_id FOR UPDATE;
        IF v_wallet.available_balance < v_withdrawal.net_amount THEN
            RAISE EXCEPTION 'Insufficient funds for withdrawal';
        END IF;
        
        UPDATE wallet_accounts 
        SET available_balance = available_balance - v_withdrawal.net_amount,
            updated_at = NOW()
        WHERE user_id = v_withdrawal.user_id;
        
        -- Ledger Debit
         INSERT INTO wallet_ledger (
            user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, description
        ) VALUES (
            v_withdrawal.user_id, 'withdrawal_debit', 'debit', v_withdrawal.net_amount, 'EGP', 'available', v_wallet.available_balance - v_withdrawal.net_amount,
            'withdrawals', v_withdrawal.id, 'Cash Withdrawal Approved'
        );
    END IF;
    
    -- Mark Withdrawal Approved/Completed
    UPDATE withdrawals 
    SET status = 'completed', 
        approved_at = NOW(),
        processed_at = NOW()
    WHERE id = p_withdrawal_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant Permissions (Assuming authenticated role uses these)
GRANT EXECUTE ON FUNCTION buy_asset TO authenticated;
GRANT EXECUTE ON FUNCTION sell_asset TO authenticated;
GRANT EXECUTE ON FUNCTION approve_buy_request TO authenticated; -- Should be restricted to admin via RLS/App Logic
GRANT EXECUTE ON FUNCTION approve_withdrawal_request TO authenticated; -- Should be restricted to admin via RLS/App Logic
