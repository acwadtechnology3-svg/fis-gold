# Troubleshooting "Bucket not found" Error

## The Problem

Even though the bucket exists in Supabase Dashboard, you're getting "Bucket not found" error.

## Common Causes

### 1. Bucket is Not Public ✅ **CHECK THIS FIRST**

The bucket must be set to **Public**:

1. Go to Supabase Dashboard → Storage → `images` bucket
2. Click on **Settings** (or click the bucket name)
3. Check if **"Public bucket"** is **enabled** (toggle should be ON)
4. If it's OFF, turn it ON
5. Save changes

### 2. Storage Policies Not Applied

The storage policies must be applied to allow uploads:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run the storage policies SQL from: `supabase/migrations/20260112000002_storage_policies.sql`
3. Or run this SQL:

```sql
-- Storage Policies for images bucket
DROP POLICY IF EXISTS "Authenticated users can upload goldsmith files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own goldsmith files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own goldsmith files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read files in images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own goldsmith files" ON storage.objects;

CREATE POLICY "Authenticated users can upload goldsmith files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'images' 
  AND (string_to_array(name, '/'))[1] = 'goldsmiths'
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
);

CREATE POLICY "Users can update their own goldsmith files"
ON storage.objects FOR UPDATE TO authenticated
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

CREATE POLICY "Users can delete their own goldsmith files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'images' 
  AND (string_to_array(name, '/'))[1] = 'goldsmiths'
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
);

CREATE POLICY "Public can read files in images bucket"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'images');

CREATE POLICY "Users can read their own goldsmith files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'images' 
  AND (
    (string_to_array(name, '/'))[1] = 'goldsmiths' 
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  )
  OR bucket_id = 'images'
);
```

### 3. Verify Bucket Settings

1. Go to **Storage** → **Buckets**
2. Click on `images` bucket
3. Verify:
   - ✅ **Name**: `images` (exact match)
   - ✅ **Public bucket**: Enabled
   - ✅ **File size limit**: Set (e.g., 5 MB)
   - ✅ Bucket is active

### 4. Verify Policies are Applied

1. Go to **Storage** → **Policies**
2. Look for policies related to `images` bucket:
   - "Authenticated users can upload goldsmith files"
   - "Users can update their own goldsmith files"
   - "Users can delete their own goldsmith files"
   - "Public can read files in images bucket"
   - "Users can read their own goldsmith files"

### 5. Check Browser Console

Open browser Developer Tools (F12) → Console tab and check for detailed error messages. The actual error message will help identify the issue.

## Quick Checklist

- [ ] Bucket name is exactly `images` (not `image` or `Images`)
- [ ] Bucket is set to **Public**
- [ ] Storage policies are applied (check in Storage → Policies)
- [ ] User is authenticated (logged in)
- [ ] Browser console shows detailed error (check F12)

## Still Having Issues?

1. **Delete and recreate the bucket:**
   - Delete the `images` bucket
   - Create a new bucket named `images`
   - Make sure it's **Public**
   - Apply the storage policies SQL

2. **Check RLS (Row Level Security):**
   - Go to Storage → Policies
   - Make sure RLS is enabled
   - Verify all policies are active

3. **Test with a simple upload:**
   - Try uploading a file directly in Supabase Dashboard → Storage → `images` bucket
   - If this works, the issue is with the code/API permissions
   - If this doesn't work, the issue is with bucket configuration

