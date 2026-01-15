-- ============================================================================
-- FIX: Add missing columns for manual deposits
-- ============================================================================

ALTER TABLE deposits ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE deposits ALTER COLUMN provider DROP NOT NULL; -- Make provider optional if we use payment_method, or just use it.
ALTER TABLE deposits ALTER COLUMN idempotency_key DROP NOT NULL; -- Make it optional or default generated? No, better to keep it but generate in frontend.
-- Actually, let's keep idempotency_key required for safety, but ensure frontend sends it.

-- Add payment_method if distinct from provider
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS payment_method TEXT;
