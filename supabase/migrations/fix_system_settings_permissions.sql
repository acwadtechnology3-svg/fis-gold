-- Allow authenticated users to view public system settings
-- This is necessary for the deposit dialog to fetch company wallet numbers

DROP POLICY IF EXISTS "Public can view system_settings" ON system_settings;

CREATE POLICY "Public can view system_settings"
  ON system_settings FOR SELECT
  USING (
    -- Allow everyone (including anon) to read these specific public settings
    key IN ('company_wallet_number', 'company_instapay_address', 'min_deposit_amount', 'maintenance_mode')
    OR
    -- Or fallback to admin check for everything else
    is_admin()
  );

-- Also ensure the keys exist with correct values (idempotent insert)
INSERT INTO system_settings (key, value, description)
VALUES 
  ('company_wallet_number', '"01027136059"', 'رقم محفظة الشركة للإيداع'),
  ('company_instapay_address', '"fisgold@instapay"', 'عنوان InstaPay للشركة للإيداع')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
