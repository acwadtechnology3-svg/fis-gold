-- ============================================================================
-- WALLET + GOLD INVESTMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Version: 1.0.0
-- Updated to match gold-price-api structure
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PRICE TABLES (Compatible with gold-price-api)
-- ============================================================================

-- Gold prices table (matches gold-price-api structure)
CREATE TABLE IF NOT EXISTS gold_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    karat VARCHAR(10) NOT NULL DEFAULT '24',
    sell_price DECIMAL(12, 2) NOT NULL,
    buy_price DECIMAL(12, 2) NOT NULL,
    opening_price DECIMAL(12, 2),
    change_value DECIMAL(12, 2),
    change_percent DECIMAL(6, 2),
    currency VARCHAR(10) DEFAULT 'EGP',
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Silver prices table (matches gold-price-api structure)
CREATE TABLE IF NOT EXISTS silver_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    price_per_gram DECIMAL(10, 2) NOT NULL,
    price_per_ounce DECIMAL(12, 2),
    sell_price DECIMAL(12, 2),
    buy_price DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'EGP',
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gold_prices_created_at ON gold_prices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_silver_prices_created_at ON silver_prices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gold_prices_karat ON gold_prices(karat);

-- ============================================================================
-- PROFILES (User metadata linked to auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'expired')),
    kyc_verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON profiles(kyc_status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WALLET_ACCOUNTS (Cached balance snapshot - fast reads)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_user_id ON wallet_accounts(user_id);

CREATE TRIGGER update_wallet_accounts_updated_at
    BEFORE UPDATE ON wallet_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WALLET_LEDGER (Append-only source of truth)
-- ============================================================================

CREATE TYPE ledger_event_type AS ENUM (
    'deposit_credit',
    'deposit_reversal',
    'buy_gold_debit',
    'buy_gold_lock',
    'position_unlock',
    'position_profit',
    'position_loss',
    'withdrawal_debit',
    'withdrawal_fee',
    'withdrawal_reversal',
    'forced_withdrawal_fee',
    'admin_credit',
    'admin_debit',
    'fee_refund'
);

CREATE TYPE ledger_direction AS ENUM ('credit', 'debit');

CREATE TABLE IF NOT EXISTS wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    event_type ledger_event_type NOT NULL,
    direction ledger_direction NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    currency TEXT DEFAULT 'EGP' NOT NULL,
    balance_type TEXT NOT NULL CHECK (balance_type IN ('available', 'locked')),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_idempotency 
    ON wallet_ledger(user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_id ON wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created ON wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_event_type ON wallet_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_related ON wallet_ledger(related_table, related_id);

-- ============================================================================
-- DEPOSITS
-- ============================================================================

CREATE TYPE deposit_status AS ENUM (
    'initiated', 'pending', 'processing', 'settled', 'failed', 'expired', 'cancelled'
);

CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_deposits_idempotency ON deposits(user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON deposits(user_id, status);

-- ============================================================================
-- GOLD_PRICE_SNAPSHOTS (Price locks for buy orders - links to gold_prices)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gold_price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_id UUID NOT NULL REFERENCES gold_prices(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    metal_type TEXT NOT NULL DEFAULT 'gold',
    sell_price DECIMAL(12, 2) NOT NULL,  -- Ask price (user buys at this)
    buy_price DECIMAL(12, 2) NOT NULL,   -- Bid price (user sells at this)
    captured_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    used_in_position_id UUID,
    client_request_id TEXT,
    client_ip INET,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON gold_price_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_expires ON gold_price_snapshots(expires_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_unused ON gold_price_snapshots(user_id, used, expires_at);

-- ============================================================================
-- GOLD_POSITIONS (Investments)
-- ============================================================================

CREATE TYPE position_status AS ENUM (
    'active', 'matured', 'closing', 'closed', 'forced_closing', 'forced_closed'
);

CREATE TABLE IF NOT EXISTS gold_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    metal_type TEXT NOT NULL DEFAULT 'gold',
    grams DECIMAL(12, 6) NOT NULL,
    buy_amount DECIMAL(18, 4) NOT NULL,
    buy_price_ask DECIMAL(12, 4) NOT NULL,
    price_snapshot_id UUID NOT NULL REFERENCES gold_price_snapshots(id),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_idempotency ON gold_positions(user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON gold_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON gold_positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_user_status ON gold_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_positions_lock_until ON gold_positions(lock_until);
CREATE INDEX IF NOT EXISTS idx_positions_matured ON gold_positions(status, lock_until) WHERE status = 'active';

CREATE TRIGGER update_gold_positions_updated_at
    BEFORE UPDATE ON gold_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FEE_RULES (Configuration for penalties/fees)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fee_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_type TEXT NOT NULL CHECK (fee_type IN (
        'forced_withdrawal', 'early_close', 'transaction_fee', 'deposit_fee', 'withdrawal_fee'
    )),
    percent DECIMAL(5, 4) NOT NULL CHECK (percent >= 0 AND percent <= 1),
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT chk_min_fee_non_negative CHECK (min_fee >= 0),
    CONSTRAINT chk_max_fee_valid CHECK (max_fee IS NULL OR max_fee >= min_fee)
);

CREATE INDEX IF NOT EXISTS idx_fee_rules_active ON fee_rules(fee_type, is_active, effective_from);

-- ============================================================================
-- WITHDRAWALS
-- ============================================================================

CREATE TYPE withdrawal_type AS ENUM ('normal', 'forced');
CREATE TYPE withdrawal_status AS ENUM ('requested', 'approved', 'processing', 'completed', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawals_idempotency ON withdrawals(user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON withdrawals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_position ON withdrawals(position_id);

CREATE TRIGGER update_withdrawals_updated_at
    BEFORE UPDATE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT_LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'admin', 'webhook')),
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    log_date DATE GENERATED ALWAYS AS (DATE(created_at)) STORED
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(log_date);

-- ============================================================================
-- IDEMPOTENCY_KEYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    operation_type TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    
    UNIQUE(user_id, key, operation_type)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(user_id, key, operation_type);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================================================
-- VIEWS (Compatible with gold-price-api)
-- ============================================================================

-- Latest gold price view (from gold-price-api)
CREATE OR REPLACE VIEW latest_gold_price AS
SELECT * FROM gold_prices
ORDER BY created_at DESC
LIMIT 1;

-- Latest silver price view (from gold-price-api)
CREATE OR REPLACE VIEW latest_silver_price AS
SELECT * FROM silver_prices
ORDER BY created_at DESC
LIMIT 1;

-- Wallet balance computed from ledger
CREATE OR REPLACE VIEW wallet_balance_computed AS
SELECT 
    user_id,
    currency,
    SUM(CASE WHEN balance_type = 'available' AND direction = 'credit' THEN amount
             WHEN balance_type = 'available' AND direction = 'debit' THEN -amount
             ELSE 0 END) AS available_balance,
    SUM(CASE WHEN balance_type = 'locked' AND direction = 'credit' THEN amount
             WHEN balance_type = 'locked' AND direction = 'debit' THEN -amount
             ELSE 0 END) AS locked_balance
FROM wallet_ledger
GROUP BY user_id, currency;

-- Active positions with current values
CREATE OR REPLACE VIEW active_positions_summary AS
SELECT 
    p.*,
    (lock_until - NOW()) AS time_to_maturity,
    CASE WHEN lock_until <= NOW() THEN true ELSE false END AS is_matured,
    gp.buy_price AS current_bid,
    gp.sell_price AS current_ask,
    (grams * gp.buy_price) AS current_value,
    (grams * gp.buy_price) - buy_amount AS unrealized_pnl
FROM gold_positions p
LEFT JOIN LATERAL (
    SELECT buy_price, sell_price 
    FROM gold_prices 
    WHERE karat = '24'
    ORDER BY created_at DESC 
    LIMIT 1
) gp ON true
WHERE p.status IN ('active', 'matured');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate forced withdrawal fee
CREATE OR REPLACE FUNCTION calculate_forced_withdrawal_fee(
    p_amount DECIMAL(18, 4),
    p_days_remaining INTEGER
) RETURNS TABLE (
    fee_amount DECIMAL(18, 4),
    fee_percent DECIMAL(5, 4),
    fee_rule_id UUID
) AS $$
DECLARE
    v_rule RECORD;
    v_calculated_fee DECIMAL(18, 4);
BEGIN
    SELECT * INTO v_rule
    FROM fee_rules
    WHERE fee_type = 'forced_withdrawal'
      AND is_active = true
      AND effective_from <= NOW()
      AND (effective_until IS NULL OR effective_until > NOW())
    ORDER BY effective_from DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        v_calculated_fee := GREATEST(10, p_amount * 0.05);
        RETURN QUERY SELECT v_calculated_fee, 0.05::DECIMAL(5,4), NULL::UUID;
        RETURN;
    END IF;
    
    v_calculated_fee := (p_amount * v_rule.percent) + v_rule.flat_fee;
    v_calculated_fee := GREATEST(v_calculated_fee, v_rule.min_fee);
    IF v_rule.max_fee IS NOT NULL THEN
        v_calculated_fee := LEAST(v_calculated_fee, v_rule.max_fee);
    END IF;
    
    RETURN QUERY SELECT v_calculated_fee, v_rule.percent, v_rule.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock wallet for update
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
    INSERT INTO wallet_accounts (user_id, available_balance, locked_balance, currency)
    VALUES (p_user_id, 0, 0, 'EGP')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN QUERY
    SELECT wa.id, wa.user_id, wa.available_balance, wa.locked_balance, wa.currency, wa.version
    FROM wallet_accounts wa
    WHERE wa.user_id = p_user_id
    FOR UPDATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify ledger consistency
CREATE OR REPLACE FUNCTION verify_wallet_ledger_consistency(p_user_id UUID)
RETURNS TABLE (
    is_consistent BOOLEAN,
    available_diff DECIMAL(18, 4),
    locked_diff DECIMAL(18, 4)
) AS $$
DECLARE
    v_computed_available DECIMAL(18, 4);
    v_computed_locked DECIMAL(18, 4);
    v_cached_available DECIMAL(18, 4);
    v_cached_locked DECIMAL(18, 4);
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN balance_type = 'available' AND direction = 'credit' THEN amount
                          WHEN balance_type = 'available' AND direction = 'debit' THEN -amount
                          ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN balance_type = 'locked' AND direction = 'credit' THEN amount
                          WHEN balance_type = 'locked' AND direction = 'debit' THEN -amount
                          ELSE 0 END), 0)
    INTO v_computed_available, v_computed_locked
    FROM wallet_ledger
    WHERE wallet_ledger.user_id = p_user_id;
    
    SELECT wa.available_balance, wa.locked_balance
    INTO v_cached_available, v_cached_locked
    FROM wallet_accounts wa
    WHERE wa.user_id = p_user_id;
    
    RETURN QUERY SELECT 
        (ABS(v_computed_available - COALESCE(v_cached_available, 0)) < 0.0001 AND
         ABS(v_computed_locked - COALESCE(v_cached_locked, 0)) < 0.0001),
        v_computed_available - COALESCE(v_cached_available, 0),
        v_computed_locked - COALESCE(v_cached_locked, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEFAULT FEE RULES
-- ============================================================================

INSERT INTO fee_rules (fee_type, percent, min_fee, max_fee, flat_fee, description)
VALUES 
    ('forced_withdrawal', 0.05, 10, 5000, 0, 'Early withdrawal penalty: 5% with min 10 EGP, max 5000 EGP'),
    ('withdrawal_fee', 0.001, 5, 100, 0, 'Standard withdrawal fee: 0.1% with min 5 EGP, max 100 EGP')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
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

-- Gold/Silver prices - public read access
CREATE POLICY "gold_prices_select_public" ON gold_prices FOR SELECT USING (true);
CREATE POLICY "silver_prices_select_public" ON silver_prices FOR SELECT USING (true);
CREATE POLICY "gold_prices_insert_service" ON gold_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "silver_prices_insert_service" ON silver_prices FOR INSERT WITH CHECK (true);

-- Profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Wallet accounts
CREATE POLICY "wallet_accounts_select_own" ON wallet_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Wallet ledger
CREATE POLICY "wallet_ledger_select_own" ON wallet_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Deposits
CREATE POLICY "deposits_select_own" ON deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deposits_insert_own" ON deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'initiated');

-- Price snapshots
CREATE POLICY "snapshots_select_own" ON gold_price_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert_own" ON gold_price_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND used = false);

-- Positions
CREATE POLICY "positions_select_own" ON gold_positions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fee rules - public read
CREATE POLICY "fee_rules_select_active" ON fee_rules FOR SELECT TO authenticated USING (is_active = true);

-- Withdrawals
CREATE POLICY "withdrawals_select_own" ON withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Idempotency keys
CREATE POLICY "idempotency_select_own" ON idempotency_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "idempotency_insert_own" ON idempotency_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION lock_wallet_for_update TO service_role;
GRANT EXECUTE ON FUNCTION calculate_forced_withdrawal_fee TO service_role;
GRANT EXECUTE ON FUNCTION verify_wallet_ledger_consistency TO service_role;

