-- ============================================================================
-- WALLET + GOLD INVESTMENT SYSTEM - BUG FIXES MIGRATION
-- ============================================================================
-- Version: 2.0.0
-- Date: 2026-01-15
-- Fixes:
--   1. SQL function using 'ask' instead of 'sell_price'
--   2. SQL function using 'bid' instead of 'buy_price'
--   3. SQL function using 'metal_type' instead of 'karat'
--   4. SQL function using 'effective_at' instead of 'created_at'
--   5. Add investment_settings table for admin configuration
-- ============================================================================

-- ============================================================================
-- 1. INVESTMENT_SETTINGS TABLE (Admin-configurable settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS investment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE investment_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage settings
CREATE POLICY "investment_settings_admin_all" ON investment_settings
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Public can read active settings
CREATE POLICY "investment_settings_select_public" ON investment_settings
    FOR SELECT
    USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_investment_settings_updated_at
    BEFORE UPDATE ON investment_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO investment_settings (setting_key, setting_value, description)
VALUES 
    ('minimum_investment', '{"amount": 0, "currency": "EGP"}', 'Minimum investment amount for gold purchases. Set to 0 for no minimum.'),
    ('investment_durations', '{"options": [30, 60, 90, 180, 365], "default": 90}', 'Available investment duration options in days'),
    ('max_positions_per_user', '{"limit": 100}', 'Maximum number of active positions a user can have')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- 2. FIXED buy_gold FUNCTION
-- ============================================================================
-- Fix: Changed v_snapshot.ask to v_snapshot.sell_price

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
    
    -- Calculate grams (buy at sell_price = ask price)
    -- FIX: Changed from v_snapshot.ask to v_snapshot.sell_price
    v_grams := ROUND(p_amount / v_snapshot.sell_price, 6);
    v_lock_until := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    -- Create position
    INSERT INTO gold_positions (
        user_id, metal_type, grams, buy_amount, buy_price_ask,
        price_snapshot_id, duration_days, lock_until, status, idempotency_key
    ) VALUES (
        p_user_id, v_snapshot.metal_type, v_grams, p_amount, v_snapshot.sell_price,
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
        'Buy ' || v_grams || 'g gold at ' || v_snapshot.sell_price || '/g'
    );
    
    RETURN QUERY SELECT true, 'Gold purchased successfully'::TEXT, 
        v_position_id, v_grams, v_snapshot.sell_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. FIXED process_forced_withdrawal FUNCTION
-- ============================================================================
-- Fixes:
--   - Changed 'bid' to 'buy_price'
--   - Changed 'metal_type' filter to 'karat'
--   - Changed 'effective_at' to 'created_at'
--   - Added credit to available_balance with net amount

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
        SELECT w.gross_amount, w.fee_amount, w.net_amount 
        INTO v_gross, v_fee, v_net
        FROM withdrawals w WHERE w.id = v_withdrawal_id;
        
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
    
    -- Get current buy_price (bid) - FIX: Changed from bid/metal_type/effective_at
    SELECT buy_price INTO v_current_price
    FROM gold_prices
    WHERE karat = '24'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_current_price IS NULL THEN
        RETURN QUERY SELECT false, 'Price unavailable'::TEXT, NULL::UUID, 
            NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Calculate gross amount (sell at buy_price = bid)
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
    
    -- Update wallet: unlock funds and credit net amount to available
    -- FIX: Added credit to available_balance
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
-- 4. HELPER FUNCTION TO GET MINIMUM INVESTMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_minimum_investment()
RETURNS DECIMAL(18, 4) AS $$
DECLARE
    v_min_investment DECIMAL(18, 4);
BEGIN
    SELECT (setting_value->>'amount')::DECIMAL(18, 4)
    INTO v_min_investment
    FROM investment_settings
    WHERE setting_key = 'minimum_investment'
      AND is_active = true;
    
    RETURN COALESCE(v_min_investment, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_minimum_investment TO authenticated;
GRANT EXECUTE ON FUNCTION get_minimum_investment TO service_role;

-- ============================================================================
-- SUMMARY OF FIXES
-- ============================================================================
/*
EDGE FUNCTION FIXES (wallet-api/index.ts):
1. handleWithdrawRequest: Fixed price query to use buy_price/karat instead of bid/metal_type
2. handleWithdrawRequest: Added credit to available_balance with sale proceeds
3. handleForcedWithdrawRequest: Fixed price query to use buy_price/karat instead of bid/metal_type  
4. handleForcedWithdrawRequest: Added credit to available_balance with net_amount

SQL FUNCTION FIXES (this file):
1. buy_gold: Changed v_snapshot.ask to v_snapshot.sell_price
2. process_forced_withdrawal: Changed bid to buy_price
3. process_forced_withdrawal: Changed metal_type to karat
4. process_forced_withdrawal: Changed effective_at to created_at
5. process_forced_withdrawal: Added credit to available_balance with net amount

NEW FEATURES:
1. investment_settings table for admin-configurable settings
2. Default minimum_investment set to 0 (no minimum)
3. get_minimum_investment() helper function
*/
