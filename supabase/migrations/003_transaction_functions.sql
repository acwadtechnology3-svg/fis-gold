-- ============================================================================
-- WALLET + GOLD INVESTMENT SYSTEM - TRANSACTION & LOCKING FUNCTIONS
-- ============================================================================
-- (E) Transaction & Locking Strategy
-- ============================================================================

-- ============================================================================
-- ADVISORY LOCK HELPER
-- ============================================================================
-- Uses advisory locks for user-level operations to prevent concurrent operations

CREATE OR REPLACE FUNCTION acquire_user_lock(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    lock_key BIGINT;
BEGIN
    -- Convert UUID to bigint for advisory lock
    lock_key := ('x' || substr(p_user_id::text, 1, 16))::bit(64)::bigint;
    
    -- Try to acquire lock (non-blocking)
    RETURN pg_try_advisory_lock(lock_key);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_user_lock(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    lock_key BIGINT;
BEGIN
    lock_key := ('x' || substr(p_user_id::text, 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_unlock(lock_key);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- WALLET LOCKING FOR UPDATE
-- ============================================================================
-- This function locks the wallet row and returns current balances

CREATE OR REPLACE FUNCTION lock_wallet_for_update(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    available_balance DECIMAL(18, 4),
    locked_balance DECIMAL(18, 4),
    currency TEXT,
    version BIGINT
) AS $$
BEGIN
    -- Create wallet if doesn't exist
    INSERT INTO wallet_accounts (user_id, available_balance, locked_balance, currency)
    VALUES (p_user_id, 0, 0, 'EGP')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Lock and return the row
    RETURN QUERY
    SELECT 
        wa.id,
        wa.user_id,
        wa.available_balance,
        wa.locked_balance,
        wa.currency,
        wa.version
    FROM wallet_accounts wa
    WHERE wa.user_id = p_user_id
    FOR UPDATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ATOMIC BALANCE UPDATE WITH LEDGER ENTRY
-- ============================================================================
-- This is the core transaction function that ensures atomicity

CREATE OR REPLACE FUNCTION atomic_balance_operation(
    p_user_id UUID,
    p_event_type ledger_event_type,
    p_direction ledger_direction,
    p_amount DECIMAL(18, 4),
    p_balance_type TEXT,
    p_related_table TEXT,
    p_related_id UUID,
    p_idempotency_key TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
    success BOOLEAN,
    ledger_id UUID,
    new_available DECIMAL(18, 4),
    new_locked DECIMAL(18, 4),
    error_message TEXT
) AS $$
DECLARE
    v_wallet RECORD;
    v_new_available DECIMAL(18, 4);
    v_new_locked DECIMAL(18, 4);
    v_ledger_id UUID;
    v_correlation_id UUID := gen_random_uuid();
BEGIN
    -- Check idempotency first
    IF EXISTS (
        SELECT 1 FROM wallet_ledger 
        WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
    ) THEN
        -- Already processed, return existing result
        SELECT wl.id, wa.available_balance, wa.locked_balance
        INTO v_ledger_id, v_new_available, v_new_locked
        FROM wallet_ledger wl
        JOIN wallet_accounts wa ON wa.user_id = wl.user_id
        WHERE wl.user_id = p_user_id AND wl.idempotency_key = p_idempotency_key;
        
        RETURN QUERY SELECT true, v_ledger_id, v_new_available, v_new_locked, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Lock wallet row
    SELECT * INTO v_wallet
    FROM wallet_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        -- Create wallet
        INSERT INTO wallet_accounts (user_id, available_balance, locked_balance, currency)
        VALUES (p_user_id, 0, 0, 'EGP')
        RETURNING * INTO v_wallet;
    END IF;
    
    -- Calculate new balances
    v_new_available := v_wallet.available_balance;
    v_new_locked := v_wallet.locked_balance;
    
    IF p_balance_type = 'available' THEN
        IF p_direction = 'credit' THEN
            v_new_available := v_new_available + p_amount;
        ELSE
            v_new_available := v_new_available - p_amount;
        END IF;
    ELSIF p_balance_type = 'locked' THEN
        IF p_direction = 'credit' THEN
            v_new_locked := v_new_locked + p_amount;
        ELSE
            v_new_locked := v_new_locked - p_amount;
        END IF;
    END IF;
    
    -- Validate new balances
    IF v_new_available < 0 THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, 
            'Insufficient available balance'::TEXT;
        RETURN;
    END IF;
    
    IF v_new_locked < 0 THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, 
            'Insufficient locked balance'::TEXT;
        RETURN;
    END IF;
    
    -- Insert ledger entry
    INSERT INTO wallet_ledger (
        user_id,
        event_type,
        direction,
        amount,
        currency,
        balance_type,
        balance_after,
        related_table,
        related_id,
        idempotency_key,
        description,
        metadata,
        correlation_id
    ) VALUES (
        p_user_id,
        p_event_type,
        p_direction,
        p_amount,
        v_wallet.currency,
        p_balance_type,
        CASE WHEN p_balance_type = 'available' THEN v_new_available ELSE v_new_locked END,
        p_related_table,
        p_related_id,
        p_idempotency_key,
        p_description,
        p_metadata,
        v_correlation_id
    )
    RETURNING id INTO v_ledger_id;
    
    -- Update wallet balance
    UPDATE wallet_accounts
    SET 
        available_balance = v_new_available,
        locked_balance = v_new_locked,
        version = version + 1,
        last_ledger_id = v_ledger_id,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT true, v_ledger_id, v_new_available, v_new_locked, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEPOSIT SETTLEMENT TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION settle_deposit(
    p_deposit_id UUID,
    p_provider_ref TEXT,
    p_webhook_payload_hash TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    ledger_id UUID
) AS $$
DECLARE
    v_deposit RECORD;
    v_result RECORD;
BEGIN
    -- Lock deposit row
    SELECT * INTO v_deposit
    FROM deposits
    WHERE id = p_deposit_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Deposit not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if already settled (idempotent)
    IF v_deposit.status = 'settled' THEN
        RETURN QUERY SELECT true, 'Already settled'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Check for duplicate webhook
    IF v_deposit.webhook_payload_hash = p_webhook_payload_hash THEN
        RETURN QUERY SELECT true, 'Duplicate webhook'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- Execute atomic balance operation
    SELECT * INTO v_result
    FROM atomic_balance_operation(
        v_deposit.user_id,
        'deposit_credit',
        'credit',
        v_deposit.amount,
        'available',
        'deposits',
        p_deposit_id,
        'deposit_settle_' || p_deposit_id::TEXT,
        'Deposit from ' || v_deposit.provider
    );
    
    IF NOT v_result.success THEN
        RETURN QUERY SELECT false, v_result.error_message, NULL::UUID;
        RETURN;
    END IF;
    
    -- Update deposit status
    UPDATE deposits
    SET 
        status = 'settled',
        provider_ref = p_provider_ref,
        settled_at = NOW(),
        webhook_received_at = NOW(),
        webhook_payload_hash = p_webhook_payload_hash
    WHERE id = p_deposit_id;
    
    RETURN QUERY SELECT true, 'Deposit settled successfully'::TEXT, v_result.ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BUY GOLD TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION buy_gold(
    p_user_id UUID,
    p_snapshot_id UUID,
    p_amount DECIMAL(18, 4),
    p_duration_days INTEGER,
    p_idempotency_key TEXT
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
    v_lock_until TIMESTAMPTZ;
    v_position_id UUID;
    v_result RECORD;
BEGIN
    -- Check idempotency
    SELECT id INTO v_position_id
    FROM gold_positions
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
        SELECT gp.grams, gp.buy_price_ask INTO v_grams, v_wallet
        FROM gold_positions gp WHERE gp.id = v_position_id;
        
        RETURN QUERY SELECT true, 'Already processed'::TEXT, v_position_id, 
            v_grams, v_wallet::DECIMAL(12,4);
        RETURN;
    END IF;
    
    -- Lock and validate snapshot
    SELECT * INTO v_snapshot
    FROM gold_price_snapshots
    WHERE id = p_snapshot_id AND user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Snapshot not found'::TEXT, NULL::UUID, 
            NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    IF v_snapshot.used THEN
        RETURN QUERY SELECT false, 'Snapshot already used'::TEXT, NULL::UUID, 
            NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    IF v_snapshot.expires_at < NOW() THEN
        RETURN QUERY SELECT false, 'Snapshot expired'::TEXT, NULL::UUID, 
            NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Lock wallet
    SELECT * INTO v_wallet
    FROM wallet_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_wallet.available_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::UUID, 
            NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Calculate grams (buy at ask price)
    v_grams := ROUND(p_amount / v_snapshot.ask, 6);
    v_lock_until := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    -- Create position
    INSERT INTO gold_positions (
        user_id, metal_type, grams, buy_amount, buy_price_ask,
        price_snapshot_id, duration_days, lock_until, status, idempotency_key
    ) VALUES (
        p_user_id, v_snapshot.metal_type, v_grams, p_amount, v_snapshot.ask,
        p_snapshot_id, p_duration_days, v_lock_until, 'active', p_idempotency_key
    )
    RETURNING id INTO v_position_id;
    
    -- Mark snapshot as used
    UPDATE gold_price_snapshots
    SET used = true, used_at = NOW(), used_in_position_id = v_position_id
    WHERE id = p_snapshot_id;
    
    -- Debit available, credit locked
    UPDATE wallet_accounts
    SET 
        available_balance = available_balance - p_amount,
        locked_balance = locked_balance + p_amount,
        version = version + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Insert ledger entry
    INSERT INTO wallet_ledger (
        user_id, event_type, direction, amount, currency, balance_type,
        balance_after, related_table, related_id, idempotency_key, description
    ) VALUES (
        p_user_id, 'buy_gold_lock', 'debit', p_amount, 'EGP', 'available',
        v_wallet.available_balance - p_amount, 'gold_positions', v_position_id,
        'buy_' || p_idempotency_key,
        'Buy ' || v_grams || 'g gold at ' || v_snapshot.ask || '/g'
    );
    
    RETURN QUERY SELECT true, 'Gold purchased successfully'::TEXT, 
        v_position_id, v_grams, v_snapshot.ask;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FORCED WITHDRAWAL TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION process_forced_withdrawal(
    p_user_id UUID,
    p_position_id UUID,
    p_idempotency_key TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    withdrawal_id UUID,
    gross_amount DECIMAL(18, 4),
    fee_amount DECIMAL(18, 4),
    net_amount DECIMAL(18, 4)
) AS $$
DECLARE
    v_position RECORD;
    v_current_price DECIMAL(12, 4);
    v_gross DECIMAL(18, 4);
    v_fee DECIMAL(18, 4);
    v_fee_percent DECIMAL(5, 4);
    v_fee_rule_id UUID;
    v_net DECIMAL(18, 4);
    v_days_remaining INTEGER;
    v_withdrawal_id UUID;
BEGIN
    -- Check idempotency
    SELECT id INTO v_withdrawal_id
    FROM withdrawals
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
        SELECT gross_amount, fee_amount, net_amount 
        INTO v_gross, v_fee, v_net
        FROM withdrawals WHERE id = v_withdrawal_id;
        
        RETURN QUERY SELECT true, 'Already processed'::TEXT, 
            v_withdrawal_id, v_gross, v_fee, v_net;
        RETURN;
    END IF;
    
    -- Lock position
    SELECT * INTO v_position
    FROM gold_positions
    WHERE id = p_position_id AND user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Position not found'::TEXT, NULL::UUID, 
            NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    IF v_position.status != 'active' THEN
        RETURN QUERY SELECT false, 'Position not active'::TEXT, NULL::UUID, 
            NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Calculate days remaining
    v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_position.lock_until - NOW())) / 86400);
    
    IF v_days_remaining <= 0 THEN
        RETURN QUERY SELECT false, 'Position is matured, use normal withdrawal'::TEXT, 
            NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Get current bid price
    SELECT bid INTO v_current_price
    FROM gold_prices
    WHERE metal_type = v_position.metal_type
    ORDER BY effective_at DESC
    LIMIT 1;
    
    IF v_current_price IS NULL THEN
        RETURN QUERY SELECT false, 'Price unavailable'::TEXT, NULL::UUID, 
            NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Calculate gross amount (sell at bid)
    v_gross := v_position.grams * v_current_price;
    
    -- Calculate fee
    SELECT fee_amount, fee_percent, fee_rule_id 
    INTO v_fee, v_fee_percent, v_fee_rule_id
    FROM calculate_forced_withdrawal_fee(v_gross, v_days_remaining);
    
    v_net := v_gross - v_fee;
    
    -- Lock wallet
    PERFORM * FROM wallet_accounts WHERE user_id = p_user_id FOR UPDATE;
    
    -- Update position
    UPDATE gold_positions
    SET 
        status = 'forced_closed',
        close_time = NOW(),
        close_price_bid = v_current_price,
        close_amount = v_gross,
        profit_loss = v_gross - buy_amount,
        is_forced_close = true,
        forced_fee_amount = v_fee,
        forced_fee_percent = v_fee_percent
    WHERE id = p_position_id;
    
    -- Create withdrawal
    INSERT INTO withdrawals (
        user_id, withdrawal_type, gross_amount, fee_amount, net_amount,
        fee_rule_id, fee_percent_applied, position_id, status, idempotency_key
    ) VALUES (
        p_user_id, 'forced', v_gross, v_fee, v_net,
        v_fee_rule_id, v_fee_percent, p_position_id, 'approved', p_idempotency_key
    )
    RETURNING id INTO v_withdrawal_id;
    
    -- Update wallet (unlock funds minus fee)
    UPDATE wallet_accounts
    SET 
        locked_balance = locked_balance - v_position.buy_amount,
        available_balance = available_balance + v_net,
        version = version + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Insert ledger entries
    INSERT INTO wallet_ledger (
        user_id, event_type, direction, amount, currency, balance_type,
        balance_after, related_table, related_id, idempotency_key, description
    ) VALUES 
    (
        p_user_id, 'position_unlock', 'debit', v_position.buy_amount, 'EGP', 'locked',
        0, 'withdrawals', v_withdrawal_id,
        'unlock_' || p_idempotency_key,
        'Forced early withdrawal - unlock'
    ),
    (
        p_user_id, 'forced_withdrawal_fee', 'debit', v_fee, 'EGP', 'available',
        0, 'withdrawals', v_withdrawal_id,
        'fee_' || p_idempotency_key,
        'Early withdrawal penalty: ' || ROUND(v_fee_percent * 100, 1) || '%'
    );
    
    RETURN QUERY SELECT true, 'Forced withdrawal processed'::TEXT, 
        v_withdrawal_id, v_gross, v_fee, v_net;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RECONCILIATION FUNCTION
-- ============================================================================
-- Verifies ledger and wallet_accounts are in sync

CREATE OR REPLACE FUNCTION reconcile_all_wallets()
RETURNS TABLE (
    user_id UUID,
    is_consistent BOOLEAN,
    available_diff DECIMAL(18, 4),
    locked_diff DECIMAL(18, 4)
) AS $$
BEGIN
    RETURN QUERY
    WITH ledger_balances AS (
        SELECT 
            wl.user_id,
            SUM(CASE 
                WHEN balance_type = 'available' AND direction = 'credit' THEN amount
                WHEN balance_type = 'available' AND direction = 'debit' THEN -amount
                ELSE 0 
            END) AS computed_available,
            SUM(CASE 
                WHEN balance_type = 'locked' AND direction = 'credit' THEN amount
                WHEN balance_type = 'locked' AND direction = 'debit' THEN -amount
                ELSE 0 
            END) AS computed_locked
        FROM wallet_ledger wl
        GROUP BY wl.user_id
    )
    SELECT 
        wa.user_id,
        (ABS(COALESCE(lb.computed_available, 0) - wa.available_balance) < 0.0001 AND
         ABS(COALESCE(lb.computed_locked, 0) - wa.locked_balance) < 0.0001) AS is_consistent,
        COALESCE(lb.computed_available, 0) - wa.available_balance AS available_diff,
        COALESCE(lb.computed_locked, 0) - wa.locked_balance AS locked_diff
    FROM wallet_accounts wa
    LEFT JOIN ledger_balances lb ON lb.user_id = wa.user_id
    WHERE ABS(COALESCE(lb.computed_available, 0) - wa.available_balance) >= 0.0001
       OR ABS(COALESCE(lb.computed_locked, 0) - wa.locked_balance) >= 0.0001;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION lock_wallet_for_update TO service_role;
GRANT EXECUTE ON FUNCTION atomic_balance_operation TO service_role;
GRANT EXECUTE ON FUNCTION settle_deposit TO service_role;
GRANT EXECUTE ON FUNCTION buy_gold TO service_role;
GRANT EXECUTE ON FUNCTION process_forced_withdrawal TO service_role;
GRANT EXECUTE ON FUNCTION calculate_forced_withdrawal_fee TO service_role;
GRANT EXECUTE ON FUNCTION reconcile_all_wallets TO service_role;

