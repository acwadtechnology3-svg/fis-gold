-- Create 'withdrawals' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('withdrawals', 'withdrawals', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public can view objects (so users can see their receipt)
-- Or better: Users can only view their own receipts?
-- For simplicity and 'getPublicUrl' usage, we'll allow public read.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'withdrawals' );

-- Policy: Admins and Authenticated users can upload (Users upload deposit proofs, Admins upload withdrawal proofs)
-- Actually, withdrawals bucket is for ADMINS to upload proof of payment completion.
-- Users upload DEPOSIT proofs to 'images' bucket (as seen in NewDepositDialog).
-- So 'withdrawals' bucket is primarily for ADMINS to upload proof that they paid the user.
DROP POLICY IF EXISTS "Admins can upload withdrawal proofs" ON storage.objects;
CREATE POLICY "Admins can upload withdrawal proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'withdrawals' 
  AND is_admin() 
);

-- Policy: Admins can update/delete
DROP POLICY IF EXISTS "Admins override withdrawal proofs" ON storage.objects;
CREATE POLICY "Admins override withdrawal proofs"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'withdrawals' AND is_admin() );

DROP POLICY IF EXISTS "Admins delete withdrawal proofs" ON storage.objects;
CREATE POLICY "Admins delete withdrawal proofs"
ON storage.objects FOR DELETE
USING ( bucket_id = 'withdrawals' AND is_admin() );
