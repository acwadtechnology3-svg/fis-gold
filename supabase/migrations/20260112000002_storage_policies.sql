-- Storage Policies for goldsmiths files
-- This assumes a bucket named "images" exists
-- Note: Bucket must be created manually in Supabase Dashboard first

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload goldsmith files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own goldsmith files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own goldsmith files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read files in images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own goldsmith files" ON storage.objects;

-- Policy: Allow authenticated users to upload files to goldsmiths folder
-- Path format: goldsmiths/{user_id}/{filename}
CREATE POLICY "Authenticated users can upload goldsmith files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' 
  AND (string_to_array(name, '/'))[1] = 'goldsmiths'
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
);

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Users can update their own goldsmith files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (string_to_array(name, '/'))[1] = 'goldsmiths'
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images' 
  AND (string_to_array(name, '/'))[1] = 'goldsmiths'
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
);

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete their own goldsmith files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (string_to_array(name, '/'))[1] = 'goldsmiths'
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
);

-- Policy: Allow public read access to all files in images bucket
CREATE POLICY "Public can read files in images bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Also allow authenticated users to read their own files
CREATE POLICY "Users can read their own goldsmith files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' 
  AND (
    (string_to_array(name, '/'))[1] = 'goldsmiths' 
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  )
  OR bucket_id = 'images'
);
