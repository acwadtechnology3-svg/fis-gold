-- ============================================================================
-- WALLET + GOLD INVESTMENT SYSTEM - FRESH START MIGRATION
-- ============================================================================
-- Version: 3.0.0 (Clean Install)
-- This migration DROPS all existing tables and creates fresh ones
-- Run this ONCE on a clean database
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EVERYTHING (Clean start)
-- ============================================================================

-- Drop views first
DROP VIEW IF EXISTS active_positions_summary CASCADE;
DROP VIEW IF EXISTS wallet_balance_computed CASCADE;
DROP VIEW IF EXISTS latest_silver_price CASCADE;
DROP VIEW IF EXISTS latest_gold_price CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS process_forced_withdrawal CASCADE;
DROP FUNCTION IF EXISTS buy_gold CASCADE;
DROP FUNCTION IF EXISTS get_minimum_investment CASCADE;
DROP FUNCTION IF EXISTS verify_wallet_ledger_consistency CASCADE;
DROP FUNCTION IF EXISTS lock_wallet_for_update CASCADE;
DROP FUNCTION IF EXISTS calculate_forced_withdrawal_fee CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS investment_settings CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS gold_positions CASCADE;
DROP TABLE IF EXISTS gold_price_snapshots CASCADE;
DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS wallet_ledger CASCADE;
DROP TABLE IF EXISTS wallet_accounts CASCADE;
DROP TABLE IF EXISTS fee_rules CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS silver_prices CASCADE;
DROP TABLE IF EXISTS gold_prices CASCADE;

-- Drop types
DROP TYPE IF EXISTS withdrawal_status CASCADE;
DROP TYPE IF EXISTS withdrawal_type CASCADE;
DROP TYPE IF EXISTS position_status CASCADE;
DROP TYPE IF EXISTS deposit_status CASCADE;
DROP TYPE IF EXISTS ledger_direction CASCADE;
DROP TYPE IF EXISTS ledger_event_type CASCADE;

-- ============================================================================
-- STEP 2: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 3: ENUM TYPES
-- ============================================================================

CREATE TYPE ledger_event_type AS ENUM (
    'deposit_credit', 'deposit_reversal', 'buy_gold_debit', 'buy_gold_lock',
    'position_unlock', 'position_profit', 'position_loss', 'withdrawal_debit',
    'withdrawal_fee', 'withdrawal_reversal', 'forced_withdrawal_fee',
    'admin_credit', 'admin_debit', 'fee_refund'
);

CREATE TYPE ledger_direction AS ENUM ('credit', 'debit');

CREATE TYPE deposit_status AS ENUM (
    'initiated', 'pending', 'processing', 'settled', 'failed', 'expired', 'cancelled'
);

CREATE TYPE position_status AS ENUM (
    'active', 'matured', 'closing', 'closed', 'forced_closing', 'forced_closed'
);

CREATE TYPE withdrawal_type AS ENUM ('normal', 'forced');

CREATE TYPE withdrawal_status AS ENUM (
    'requested', 'approved', 'processing', 'completed', 'failed', 'cancelled'
);

-- ============================================================================
-- STEP 4: HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: TABLES (in dependency order)
-- ============================================================================

-- 5.1 Gold Prices
CREATE TABLE gold_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    karat VARCHAR(10) NOT NULL DEFAULT '24',
    sell_price DECIMAL(12, 2) NOT NULL,
    buy_price DECIMAL(12, 2) NOT NULL,
    opening_price DECIMAL(12, 2),
    change_value DECIMAL(12, 2),
    change_percent DECIMAL(6, 2),
    currency VARCHAR(10) DEFAULT 'EGP',
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gold_prices_created_at ON gold_prices(created_at DESC);
CREATE INDEX idx_gold_prices_karat ON gold_prices(karat);

-- 5.2 Silver Prices
CREATE TABLE silver_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    price_per_gram DECIMAL(10, 2) NOT NULL,
    price_per_ounce DECIMAL(12, 2),
    sell_price DECIMAL(12, 2),
    buy_price DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'EGP',
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_silver_prices_created_at ON silver_prices(created_at DESC);

-- 5.3 Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    kyc_status TEXT DEFAULT 'pending',
    kyc_verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_profiles_email ON profiles(email);

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.4 Fee Rules
CREATE TABLE fee_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fee_type TEXT NOT NULL,
    percent DECIMAL(5, 4) NOT NULL,
    min_fee DECIMAL(18, 4) DEFAULT 0,
    max_fee DECIMAL(18, 4),
    flat_fee DECIMAL(18, 4) DEFAULT 0,
    currency TEXT DEFAULT 'EGP',
    days_before_maturity_threshold INTEGER,
    effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_fee_rules_active ON fee_rules(fee_type, is_active, effective_from);

-- 5.5 Wallet Accounts
CREATE TABLE wallet_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    available_balance DECIMAL(18, 4) DEFAULT 0 NOT NULL,
    locked_balance DECIMAL(18, 4) DEFAULT 0 NOT NULL,
    currency TEXT DEFAULT 'EGP' NOT NULL,
    version BIGINT DEFAULT 1 NOT NULL,
    last_ledger_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_available_balance_non_negative CHECK (available_balance >= 0),
    CONSTRAINT chk_locked_balance_non_negative CHECK (locked_balance >= 0)
);

CREATE INDEX idx_wallet_accounts_user_id ON wallet_accounts(user_id);

CREATE TRIGGER update_wallet_accounts_updated_at
    BEFORE UPDATE ON wallet_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.6 Wallet Ledger
CREATE TABLE wallet_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    event_type ledger_event_type NOT NULL,
    direction ledger_direction NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    currency TEXT DEFAULT 'EGP' NOT NULL,
    balance_type TEXT NOT NULL,
    balance_after DECIMAL(18, 4) NOT NULL,
    related_table TEXT,
    related_id UUID,
    idempotency_key TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    correlation_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

CREATE UNIQUE INDEX idx_wallet_ledger_idempotency ON wallet_ledger(user_id, idempotency_key);
CREATE INDEX idx_wallet_ledger_user_id ON wallet_ledger(user_id);
CREATE INDEX idx_wallet_ledger_user_created ON wallet_ledger(user_id, created_at DESC);
CREATE INDEX idx_wallet_ledger_event_type ON wallet_ledger(event_type);
CREATE INDEX idx_wallet_ledger_related ON wallet_ledger(related_table, related_id);

-- 5.7 Deposits
CREATE TABLE deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL,
    provider_ref TEXT,
    provider_session_id TEXT,
    amount DECIMAL(18, 4) NOT NULL,
    currency TEXT DEFAULT 'EGP' NOT NULL,
    status deposit_status DEFAULT 'initiated' NOT NULL,
    status_reason TEXT,
    idempotency_key TEXT NOT NULL,
    webhook_received_at TIMESTAMPTZ,
    webhook_payload_hash TEXT,
    webhook_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    CONSTRAINT chk_deposit_amount_positive CHECK (amount > 0)
);

CREATE UNIQUE INDEX idx_deposits_idempotency ON deposits(user_id, idempotency_key);
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_user_status ON deposits(user_id, status);

-- 5.8 Gold Price Snapshots
CREATE TABLE gold_price_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    price_id UUID NOT NULL REFERENCES gold_prices(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    metal_type TEXT NOT NULL DEFAULT 'gold',
    sell_price DECIMAL(12, 2) NOT NULL,
    buy_price DECIMAL(12, 2) NOT NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    used_in_position_id UUID,
    client_request_id TEXT,
    client_ip INET,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_snapshots_user_id ON gold_price_snapshots(user_id);
CREATE INDEX idx_snapshots_expires ON gold_price_snapshots(expires_at);
CREATE INDEX idx_snapshots_user_unused ON gold_price_snapshots(user_id, used, expires_at);

-- 5.9 Gold Positions
CREATE TABLE gold_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    metal_type TEXT NOT NULL DEFAULT 'gold',
    grams DECIMAL(12, 6) NOT NULL,
    buy_amount DECIMAL(18, 4) NOT NULL,
    buy_price_ask DECIMAL(12, 4) NOT NULL,
    price_snapshot_id UUID NOT NULL REFERENCES gold_price_snapshots(id),
    duration_days INTEGER NOT NULL,
    buy_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    lock_until TIMESTAMPTZ NOT NULL,
    status position_status DEFAULT 'active' NOT NULL,
    close_time TIMESTAMPTZ,
    close_price_bid DECIMAL(12, 4),
    close_amount DECIMAL(18, 4),
    profit_loss DECIMAL(18, 4),
    is_forced_close BOOLEAN DEFAULT false,
    forced_fee_amount DECIMAL(18, 4),
    forced_fee_percent DECIMAL(5, 4),
    idempotency_key TEXT NOT NULL,
    correlation_id UUID DEFAULT gen_random_uuid(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_grams_positive CHECK (grams > 0),
    CONSTRAINT chk_buy_amount_positive CHECK (buy_amount > 0),
    CONSTRAINT chk_lock_after_buy CHECK (lock_until > buy_time)
);

CREATE UNIQUE INDEX idx_positions_idempotency ON gold_positions(user_id, idempotency_key);
CREATE INDEX idx_positions_user_id ON gold_positions(user_id);
CREATE INDEX idx_positions_status ON gold_positions(status);
CREATE INDEX idx_positions_user_status ON gold_positions(user_id, status);
CREATE INDEX idx_positions_lock_until ON gold_positions(lock_until);

CREATE TRIGGER update_gold_positions_updated_at
    BEFORE UPDATE ON gold_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.10 Withdrawals
CREATE TABLE withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    withdrawal_type withdrawal_type NOT NULL,
    gross_amount DECIMAL(18, 4) NOT NULL,
    fee_amount DECIMAL(18, 4) DEFAULT 0,
    net_amount DECIMAL(18, 4) NOT NULL,
    currency TEXT DEFAULT 'EGP' NOT NULL,
    fee_rule_id UUID REFERENCES fee_rules(id),
    fee_percent_applied DECIMAL(5, 4),
    fee_calculation_details JSONB,
    position_id UUID REFERENCES gold_positions(id),
    status withdrawal_status DEFAULT 'requested' NOT NULL,
    status_reason TEXT,
    payout_provider TEXT,
    payout_reference TEXT,
    idempotency_key TEXT NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    approved_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    correlation_id UUID DEFAULT gen_random_uuid(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_gross_amount_positive CHECK (gross_amount > 0),
    CONSTRAINT chk_fee_non_negative CHECK (fee_amount >= 0),
    CONSTRAINT chk_net_equals_gross_minus_fee CHECK (ABS(net_amount - (gross_amount - fee_amount)) < 0.0001)
);

CREATE UNIQUE INDEX idx_withdrawals_idempotency ON withdrawals(user_id, idempotency_key);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_user_status ON withdrawals(user_id, status);
CREATE INDEX idx_withdrawals_position ON withdrawals(position_id);

CREATE TRIGGER update_withdrawals_updated_at
    BEFORE UPDATE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.11 Idempotency Keys
CREATE TABLE idempotency_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    operation_type TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    status TEXT DEFAULT 'processing',
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, key, operation_type)
);

CREATE INDEX idx_idempotency_lookup ON idempotency_keys(user_id, key, operation_type);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- 5.12 Audit Logs
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id),
    actor_type TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    correlation_id UUID,
    old_data JSONB,
    new_data JSONB,
    payload_hash TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id);

-- 5.13 Investment Settings
CREATE TABLE investment_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_investment_settings_updated_at
    BEFORE UPDATE ON investment_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: VIEWS
-- ============================================================================

CREATE VIEW latest_gold_price AS
SELECT * FROM gold_prices ORDER BY created_at DESC LIMIT 1;

CREATE VIEW latest_silver_price AS
SELECT * FROM silver_prices ORDER BY created_at DESC LIMIT 1;

CREATE VIEW wallet_balance_computed AS
SELECT 
    user_id, currency,
    SUM(CASE WHEN balance_type = 'available' AND direction = 'credit' THEN amount
             WHEN balance_type = 'available' AND direction = 'debit' THEN -amount ELSE 0 END) AS available_balance,
    SUM(CASE WHEN balance_type = 'locked' AND direction = 'credit' THEN amount
             WHEN balance_type = 'locked' AND direction = 'debit' THEN -amount ELSE 0 END) AS locked_balance
FROM wallet_ledger GROUP BY user_id, currency;

CREATE VIEW active_positions_summary AS
SELECT p.*, (lock_until - NOW()) AS time_to_maturity,
    CASE WHEN lock_until <= NOW() THEN true ELSE false END AS is_matured,
    gp.buy_price AS current_bid, gp.sell_price AS current_ask,
    (grams * gp.buy_price) AS current_value,
    (grams * gp.buy_price) - buy_amount AS unrealized_pnl
FROM gold_positions p
LEFT JOIN LATERAL (SELECT buy_price, sell_price FROM gold_prices WHERE karat = '24' ORDER BY created_at DESC LIMIT 1) gp ON true
WHERE p.status IN ('active', 'matured');

-- ============================================================================
-- STEP 7: FUNCTIONS
-- ============================================================================

-- 7.1 Calculate Fee
CREATE FUNCTION calculate_forced_withdrawal_fee(
    p_amount DECIMAL(18, 4), p_days_remaining INTEGER
) RETURNS TABLE (fee_amount DECIMAL(18, 4), fee_percent DECIMAL(5, 4), fee_rule_id UUID) AS $$
DECLARE v_rule RECORD; v_calculated_fee DECIMAL(18, 4);
BEGIN
    SELECT * INTO v_rule FROM fee_rules
    WHERE fee_type = 'forced_withdrawal' AND is_active = true
      AND effective_from <= NOW() AND (effective_until IS NULL OR effective_until > NOW())
    ORDER BY effective_from DESC LIMIT 1;
    
    IF NOT FOUND THEN
        v_calculated_fee := GREATEST(10, p_amount * 0.05);
        RETURN QUERY SELECT v_calculated_fee, 0.05::DECIMAL(5,4), NULL::UUID;
        RETURN;
    END IF;
    
    v_calculated_fee := (p_amount * v_rule.percent) + v_rule.flat_fee;
    v_calculated_fee := GREATEST(v_calculated_fee, v_rule.min_fee);
    IF v_rule.max_fee IS NOT NULL THEN v_calculated_fee := LEAST(v_calculated_fee, v_rule.max_fee); END IF;
    
    RETURN QUERY SELECT v_calculated_fee, v_rule.percent, v_rule.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 Lock Wallet
CREATE FUNCTION lock_wallet_for_update(p_user_id UUID)
RETURNS TABLE (id UUID, user_id UUID, available_balance DECIMAL(18, 4), locked_balance DECIMAL(18, 4), currency TEXT, version BIGINT) AS $$
BEGIN
    INSERT INTO wallet_accounts (user_id, available_balance, locked_balance, currency)
    VALUES (p_user_id, 0, 0, 'EGP') ON CONFLICT (user_id) DO NOTHING;
    
    RETURN QUERY SELECT wa.id, wa.user_id, wa.available_balance, wa.locked_balance, wa.currency, wa.version
    FROM wallet_accounts wa WHERE wa.user_id = p_user_id FOR UPDATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3 Verify Consistency
CREATE FUNCTION verify_wallet_ledger_consistency(p_user_id UUID)
RETURNS TABLE (is_consistent BOOLEAN, available_diff DECIMAL(18, 4), locked_diff DECIMAL(18, 4)) AS $$
DECLARE v_computed_available DECIMAL(18, 4); v_computed_locked DECIMAL(18, 4);
    v_cached_available DECIMAL(18, 4); v_cached_locked DECIMAL(18, 4);
BEGIN
    SELECT COALESCE(SUM(CASE WHEN balance_type = 'available' AND direction = 'credit' THEN amount
                             WHEN balance_type = 'available' AND direction = 'debit' THEN -amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN balance_type = 'locked' AND direction = 'credit' THEN amount
                             WHEN balance_type = 'locked' AND direction = 'debit' THEN -amount ELSE 0 END), 0)
    INTO v_computed_available, v_computed_locked FROM wallet_ledger WHERE wallet_ledger.user_id = p_user_id;
    
    SELECT wa.available_balance, wa.locked_balance INTO v_cached_available, v_cached_locked
    FROM wallet_accounts wa WHERE wa.user_id = p_user_id;
    
    RETURN QUERY SELECT 
        (ABS(v_computed_available - COALESCE(v_cached_available, 0)) < 0.0001 AND
         ABS(v_computed_locked - COALESCE(v_cached_locked, 0)) < 0.0001),
        v_computed_available - COALESCE(v_cached_available, 0),
        v_computed_locked - COALESCE(v_cached_locked, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.4 Get Minimum Investment
CREATE FUNCTION get_minimum_investment() RETURNS DECIMAL(18, 4) AS $$
DECLARE v_min_investment DECIMAL(18, 4);
BEGIN
    SELECT (setting_value->>'amount')::DECIMAL(18, 4) INTO v_min_investment
    FROM investment_settings WHERE setting_key = 'minimum_investment' AND is_active = true;
    RETURN COALESCE(v_min_investment, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.5 Buy Gold
CREATE FUNCTION buy_gold(
    p_user_id UUID, p_snapshot_id UUID, p_amount DECIMAL(18, 4), p_duration_days INTEGER, p_idempotency_key TEXT
) RETURNS TABLE (success BOOLEAN, message TEXT, position_id UUID, grams DECIMAL(12, 6), buy_price DECIMAL(12, 4)) AS $$
DECLARE 
    v_snapshot RECORD; 
    v_wallet RECORD; 
    v_grams DECIMAL(12, 6); 
    v_buy_price DECIMAL(12, 4);
    v_lock_until TIMESTAMPTZ; 
    v_position_id UUID;
BEGIN
    -- Check idempotency
    SELECT gp.id, gp.grams, gp.buy_price_ask INTO v_position_id, v_grams, v_buy_price 
    FROM gold_positions gp 
    WHERE gp.user_id = p_user_id AND gp.idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Already processed'::TEXT, v_position_id, v_grams, v_buy_price;
        RETURN;
    END IF;
    
    -- Get and lock snapshot
    SELECT * INTO v_snapshot FROM gold_price_snapshots WHERE id = p_snapshot_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN 
        RETURN QUERY SELECT false, 'Snapshot not found'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
        RETURN; 
    END IF;
    IF v_snapshot.used THEN 
        RETURN QUERY SELECT false, 'Snapshot already used'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
        RETURN; 
    END IF;
    IF v_snapshot.expires_at < NOW() THEN 
        RETURN QUERY SELECT false, 'Snapshot expired'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
        RETURN; 
    END IF;
    
    -- Get and lock wallet
    SELECT * INTO v_wallet FROM wallet_accounts WHERE wallet_accounts.user_id = p_user_id FOR UPDATE;
    IF v_wallet.available_balance < p_amount THEN 
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::UUID, NULL::DECIMAL(12,6), NULL::DECIMAL(12,4); 
        RETURN; 
    END IF;
    
    -- Calculate grams and lock time
    v_grams := ROUND(p_amount / v_snapshot.sell_price, 6);
    v_lock_until := NOW() + (p_duration_days || ' days')::INTERVAL;
    
    -- Create position
    INSERT INTO gold_positions (user_id, metal_type, grams, buy_amount, buy_price_ask, price_snapshot_id, duration_days, lock_until, status, idempotency_key)
    VALUES (p_user_id, v_snapshot.metal_type, v_grams, p_amount, v_snapshot.sell_price, p_snapshot_id, p_duration_days, v_lock_until, 'active', p_idempotency_key)
    RETURNING gold_positions.id INTO v_position_id;
    
    -- Mark snapshot as used
    UPDATE gold_price_snapshots SET used = true, used_at = NOW(), used_in_position_id = v_position_id WHERE gold_price_snapshots.id = p_snapshot_id;
    
    -- Update wallet balances
    UPDATE wallet_accounts SET available_balance = wallet_accounts.available_balance - p_amount, locked_balance = wallet_accounts.locked_balance + p_amount, version = version + 1, updated_at = NOW()
    WHERE wallet_accounts.user_id = p_user_id;
    
    -- Insert ledger entry
    INSERT INTO wallet_ledger (user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, idempotency_key, description)
    VALUES (p_user_id, 'buy_gold_lock', 'debit', p_amount, 'EGP', 'available', v_wallet.available_balance - p_amount, 'gold_positions', v_position_id, 'buy_' || p_idempotency_key, 'Buy ' || v_grams || 'g gold at ' || v_snapshot.sell_price || '/g');
    
    RETURN QUERY SELECT true, 'Gold purchased successfully'::TEXT, v_position_id, v_grams, v_snapshot.sell_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.6 Process Forced Withdrawal
CREATE FUNCTION process_forced_withdrawal(
    p_user_id UUID, p_position_id UUID, p_idempotency_key TEXT
) RETURNS TABLE (success BOOLEAN, message TEXT, withdrawal_id UUID, gross_amount DECIMAL(18, 4), fee_amount DECIMAL(18, 4), net_amount DECIMAL(18, 4)) AS $$
DECLARE v_position RECORD; v_current_price DECIMAL(12, 4); v_gross DECIMAL(18, 4); v_fee DECIMAL(18, 4);
    v_fee_percent DECIMAL(5, 4); v_fee_rule_id UUID; v_net DECIMAL(18, 4); v_days_remaining INTEGER; v_withdrawal_id UUID;
BEGIN
    SELECT w.id INTO v_withdrawal_id FROM withdrawals w WHERE w.user_id = p_user_id AND w.idempotency_key = p_idempotency_key;
    IF FOUND THEN
        SELECT w.gross_amount, w.fee_amount, w.net_amount INTO v_gross, v_fee, v_net FROM withdrawals w WHERE w.id = v_withdrawal_id;
        RETURN QUERY SELECT true, 'Already processed'::TEXT, v_withdrawal_id, v_gross, v_fee, v_net;
        RETURN;
    END IF;
    
    SELECT * INTO v_position FROM gold_positions gp WHERE gp.id = p_position_id AND gp.user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT false, 'Position not found'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL; RETURN; END IF;
    IF v_position.status != 'active' THEN RETURN QUERY SELECT false, 'Position not active'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL; RETURN; END IF;
    
    v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_position.lock_until - NOW())) / 86400);
    IF v_days_remaining <= 0 THEN RETURN QUERY SELECT false, 'Position is matured, use normal withdrawal'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL; RETURN; END IF;
    
    SELECT gp.buy_price INTO v_current_price FROM gold_prices gp WHERE gp.karat = '24' ORDER BY gp.created_at DESC LIMIT 1;
    IF v_current_price IS NULL THEN RETURN QUERY SELECT false, 'Price unavailable'::TEXT, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL; RETURN; END IF;
    
    v_gross := v_position.grams * v_current_price;
    SELECT f.fee_amount, f.fee_percent, f.fee_rule_id INTO v_fee, v_fee_percent, v_fee_rule_id FROM calculate_forced_withdrawal_fee(v_gross, v_days_remaining) f;
    v_net := v_gross - v_fee;
    
    PERFORM * FROM wallet_accounts wa WHERE wa.user_id = p_user_id FOR UPDATE;
    
    UPDATE gold_positions SET status = 'forced_closed', close_time = NOW(), close_price_bid = v_current_price, close_amount = v_gross,
        profit_loss = v_gross - gold_positions.buy_amount, is_forced_close = true, forced_fee_amount = v_fee, forced_fee_percent = v_fee_percent
    WHERE gold_positions.id = p_position_id;
    
    INSERT INTO withdrawals (user_id, withdrawal_type, gross_amount, fee_amount, net_amount, fee_rule_id, fee_percent_applied, position_id, status, idempotency_key)
    VALUES (p_user_id, 'forced', v_gross, v_fee, v_net, v_fee_rule_id, v_fee_percent, p_position_id, 'approved', p_idempotency_key)
    RETURNING withdrawals.id INTO v_withdrawal_id;
    
    UPDATE wallet_accounts SET locked_balance = wallet_accounts.locked_balance - v_position.buy_amount, available_balance = wallet_accounts.available_balance + v_net, version = version + 1, updated_at = NOW()
    WHERE wallet_accounts.user_id = p_user_id;
    
    INSERT INTO wallet_ledger (user_id, event_type, direction, amount, currency, balance_type, balance_after, related_table, related_id, idempotency_key, description)
    VALUES (p_user_id, 'position_unlock', 'debit', v_position.buy_amount, 'EGP', 'locked', 0, 'withdrawals', v_withdrawal_id, 'unlock_' || p_idempotency_key, 'Forced early withdrawal - unlock'),
           (p_user_id, 'forced_withdrawal_fee', 'debit', v_fee, 'EGP', 'available', 0, 'withdrawals', v_withdrawal_id, 'fee_' || p_idempotency_key, 'Early withdrawal penalty: ' || ROUND(v_fee_percent * 100, 1) || '%');
    
    RETURN QUERY SELECT true, 'Forced withdrawal processed'::TEXT, v_withdrawal_id, v_gross, v_fee, v_net;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: DEFAULT DATA
-- ============================================================================

INSERT INTO fee_rules (fee_type, percent, min_fee, max_fee, flat_fee, description)
VALUES ('forced_withdrawal', 0.05, 10, 5000, 0, 'Early withdrawal penalty: 5% with min 10 EGP, max 5000 EGP'),
       ('withdrawal_fee', 0.001, 5, 100, 0, 'Standard withdrawal fee: 0.1% with min 5 EGP, max 100 EGP');

INSERT INTO investment_settings (setting_key, setting_value, description)
VALUES ('minimum_investment', '{"amount": 0, "currency": "EGP"}', 'Minimum investment amount. Set to 0 for no minimum.'),
       ('investment_durations', '{"options": [30, 60, 90, 180, 365], "default": 90}', 'Available duration options in days'),
       ('max_positions_per_user', '{"limit": 100}', 'Maximum active positions per user');

-- ============================================================================
-- STEP 9: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE gold_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 10: CREATE POLICIES
-- ============================================================================

CREATE POLICY "gold_prices_select_public" ON gold_prices FOR SELECT USING (true);
CREATE POLICY "silver_prices_select_public" ON silver_prices FOR SELECT USING (true);
CREATE POLICY "gold_prices_insert_service" ON gold_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "silver_prices_insert_service" ON silver_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "wallet_accounts_select_own" ON wallet_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wallet_ledger_select_own" ON wallet_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deposits_select_own" ON deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deposits_insert_own" ON deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'initiated');
CREATE POLICY "snapshots_select_own" ON gold_price_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert_own" ON gold_price_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND used = false);
CREATE POLICY "positions_select_own" ON gold_positions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fee_rules_select_active" ON fee_rules FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "withdrawals_select_own" ON withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "idempotency_select_own" ON idempotency_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "idempotency_insert_own" ON idempotency_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investment_settings_select_public" ON investment_settings FOR SELECT USING (is_active = true);

-- ============================================================================
-- STEP 11: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION lock_wallet_for_update TO service_role;
GRANT EXECUTE ON FUNCTION calculate_forced_withdrawal_fee TO service_role;
GRANT EXECUTE ON FUNCTION verify_wallet_ledger_consistency TO service_role;
GRANT EXECUTE ON FUNCTION get_minimum_investment TO authenticated;
GRANT EXECUTE ON FUNCTION get_minimum_investment TO service_role;
GRANT EXECUTE ON FUNCTION buy_gold TO service_role;
GRANT EXECUTE ON FUNCTION process_forced_withdrawal TO service_role;

-- ============================================================================
-- DONE! This creates a fresh database from scratch.
-- ============================================================================
