-- ============================================================================
-- WALLET + GOLD INVESTMENT SYSTEM - RLS POLICIES
-- ============================================================================
-- (C) Row Level Security Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- System can do everything (via service role)
-- Note: service_role bypasses RLS by default

-- ============================================================================
-- WALLET_ACCOUNTS
-- ============================================================================

-- Users can read their own wallet balance
CREATE POLICY "wallet_accounts_select_own" ON wallet_accounts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- NO INSERT/UPDATE/DELETE policies for authenticated users
-- All balance changes MUST go through Edge Functions using service role

-- ============================================================================
-- WALLET_LEDGER (Append-only, read-only for users)
-- ============================================================================

-- Users can read their own ledger entries
CREATE POLICY "wallet_ledger_select_own" ON wallet_ledger
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- NO INSERT/UPDATE/DELETE policies for authenticated users
-- All ledger entries created via Edge Functions only

-- ============================================================================
-- DEPOSITS
-- ============================================================================

-- Users can read their own deposits
CREATE POLICY "deposits_select_own" ON deposits
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can initiate deposits (create pending deposits)
-- But cannot set status to 'settled' - that's done by webhook via service role
CREATE POLICY "deposits_insert_own" ON deposits
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        AND status = 'initiated'
    );

-- Users CANNOT update deposits directly
-- Status changes happen via Edge Functions

-- ============================================================================
-- GOLD_PRICES (Public read, server write)
-- ============================================================================

-- Anyone can read gold prices (public data)
CREATE POLICY "gold_prices_select_public" ON gold_prices
    FOR SELECT
    TO authenticated
    USING (true);

-- Anonymous users can also read prices
CREATE POLICY "gold_prices_select_anon" ON gold_prices
    FOR SELECT
    TO anon
    USING (true);

-- NO INSERT/UPDATE for users - prices come from cron job via service role

-- ============================================================================
-- GOLD_PRICE_SNAPSHOTS
-- ============================================================================

-- Users can read their own snapshots
CREATE POLICY "snapshots_select_own" ON gold_price_snapshots
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can request a snapshot (limited insert)
CREATE POLICY "snapshots_insert_own" ON gold_price_snapshots
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND used = false
    );

-- NO UPDATE/DELETE - snapshots are immutable

-- ============================================================================
-- GOLD_POSITIONS
-- ============================================================================

-- Users can read their own positions
CREATE POLICY "positions_select_own" ON gold_positions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users CANNOT insert positions directly
-- Positions are created via POST /gold/buy Edge Function
-- This ensures balance checks and ledger entries are atomic

-- Users CANNOT update positions directly
-- Status changes happen via Edge Functions

-- ============================================================================
-- FEE_RULES (Public read)
-- ============================================================================

-- Anyone can read active fee rules (transparency)
CREATE POLICY "fee_rules_select_active" ON fee_rules
    FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "fee_rules_select_anon" ON fee_rules
    FOR SELECT
    TO anon
    USING (is_active = true);

-- NO INSERT/UPDATE/DELETE for users - admin only via service role

-- ============================================================================
-- WITHDRAWALS
-- ============================================================================

-- Users can read their own withdrawals
CREATE POLICY "withdrawals_select_own" ON withdrawals
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users CANNOT insert withdrawals directly
-- Must go through Edge Function to ensure balance checks

-- ============================================================================
-- AUDIT_LOGS (Read only for support, not users)
-- ============================================================================

-- Regular users cannot read audit logs
-- Only accessible via service role for admin/support

-- ============================================================================
-- IDEMPOTENCY_KEYS
-- ============================================================================

-- Users can read their own idempotency records
CREATE POLICY "idempotency_select_own" ON idempotency_keys
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert idempotency keys
CREATE POLICY "idempotency_insert_own" ON idempotency_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ADMIN ROLE (Optional)
-- ============================================================================

-- Create admin role if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin;
    END IF;
END
$$;

-- Admin can read everything
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY "wallet_accounts_admin_all" ON wallet_accounts
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY "wallet_ledger_admin_all" ON wallet_ledger
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY "deposits_admin_all" ON deposits
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY "positions_admin_all" ON gold_positions
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY "withdrawals_admin_all" ON withdrawals
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY "audit_logs_admin_select" ON audit_logs
    FOR SELECT
    TO admin
    USING (true);

-- ============================================================================
-- SUMMARY: Client-writable vs Server-writable Tables
-- ============================================================================
/*
CLIENT-WRITABLE (via RLS policies):
- profiles (own row, limited fields)
- deposits (INSERT only with status='initiated')
- gold_price_snapshots (INSERT only)
- idempotency_keys (INSERT/SELECT own)

SERVER-WRITABLE ONLY (via Edge Functions with service role):
- wallet_accounts (balance changes)
- wallet_ledger (all entries)
- deposits (status changes, settlement)
- gold_prices (price updates)
- gold_positions (all operations)
- withdrawals (all operations)
- fee_rules (admin config)
- audit_logs (all entries)

KEY PRINCIPLE:
Any operation that changes money (credits, debits, locks, unlocks)
MUST go through Edge Functions using the service role key.
The client can only READ their own data and initiate requests.
*/

