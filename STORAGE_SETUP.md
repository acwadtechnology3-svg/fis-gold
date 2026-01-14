# Storage Bucket Setup Guide

## Bucket Name
**Bucket Name:** `images` (must be exactly this name)

## Step 1: Create the Bucket in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"** or **"إنشاء bucket جديد"**
3. Fill in the details:
   - **Name**: `images` (exact name, required)
   - **Public bucket**: ✅ **Enable this** (very important!)
   - **File size limit**: 5 MB (or 10 MB)
   - **Allowed MIME types**: Leave empty or add `image/*`
4. Click **"Create bucket"** or **"إنشاء"**

## Step 2: Apply Storage Policies

The storage policies are already included in the `complete_database_schema.sql` file (Migration 11).

If you're running the complete schema SQL file, the policies will be created automatically.

If you need to apply policies separately, run this SQL in **Supabase Dashboard** → **SQL Editor**:

```sql
-- Storage Policies for goldsmiths files
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

-- Policy: Allow public read access to all files in public bucket
CREATE POLICY "Public can read files in public bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public');

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
  OR bucket_id = 'public'
);
```

## Step 3: Verify the Setup

1. Go to **Storage** → **Policies**
2. Verify these policies exist:
   - ✅ **Authenticated users can upload goldsmith files** (INSERT)
   - ✅ **Users can update their own goldsmith files** (UPDATE)
   - ✅ **Users can delete their own goldsmith files** (DELETE)
   - ✅ **Public can read files in images bucket** (SELECT)
   - ✅ **Users can read their own goldsmith files** (SELECT)

## Storage Structure

Files are stored in this structure:
```
public/
  └── goldsmiths/
      └── {user_id}/
          ├── id_card_{timestamp}.jpg
          ├── commercial_registration_{timestamp}.jpg
          ├── tax_card_{timestamp}.jpg
          ├── logo_{timestamp}.jpg
          └── shop_photo_{timestamp}.jpg
```

## Policies Summary

| Policy Name | Operation | Who Can Use | Path |
|------------|-----------|-------------|------|
| Authenticated users can upload goldsmith files | INSERT | Authenticated users | `goldsmiths/{user_id}/*` |
| Users can update their own goldsmith files | UPDATE | Authenticated users | `goldsmiths/{user_id}/*` |
| Users can delete their own goldsmith files | DELETE | Authenticated users | `goldsmiths/{user_id}/*` |
| Public can read files in images bucket | SELECT | Everyone (public) | `images/*` |
| Users can read their own goldsmith files | SELECT | Authenticated users | `goldsmiths/{user_id}/*` or `images/*` |

## Important Notes

- ✅ Bucket name **must** be exactly `images`
- ✅ Bucket **must** be set to public
- ✅ Policies are applied to the `storage.objects` table
- ✅ File path format: `goldsmiths/{user_id}/{filename}`
- ✅ Users can only manage files in their own folder (`goldsmiths/{user_id}/*`)

## Troubleshooting

### Error: "bucket does not exist"
- **Solution**: Create the bucket named `public` in Supabase Dashboard → Storage

### Error: "new row violates row-level security"
- **Solution**: Make sure all policies are applied correctly

### Error: "permission denied"
- **Solution**: 
  1. Verify bucket is set to "Public bucket"
  2. Verify all policies are created
  3. Check that user is authenticated
  4. Verify file path matches the pattern: `goldsmiths/{user_id}/{filename}`

