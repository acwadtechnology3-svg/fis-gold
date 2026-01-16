-- Add company wallet and InstaPay settings for deposit page
-- These settings will be editable from the admin dashboard

INSERT INTO system_settings (key, value, description)
VALUES 
  ('company_wallet_number', '"01027136059"', 'رقم محفظة الشركة للإيداع'),
  ('company_instapay_address', '"fisgold@instapay"', 'عنوان InstaPay للشركة للإيداع')
ON CONFLICT (key) DO NOTHING;
