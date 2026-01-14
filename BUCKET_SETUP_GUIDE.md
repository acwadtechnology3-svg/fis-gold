# Storage Buckets Setup Guide

## Required Buckets

Your application needs **2 storage buckets**:

1. **`images`** - For goldsmith files (ID cards, commercial registration, logos, shop photos, products)
2. **`profile_documents`** - For user profile documents (avatar, ID front/back)

---

## Step 1: Create the Buckets in Supabase Dashboard

### Create "images" Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Fill in the details:
   - **Name**: `images` (exact name, required)
   - **Public bucket**: ✅ **Enable this** (very important!)
   - **File size limit**: 5 MB (or 10 MB)
   - **Allowed MIME types**: Leave empty or add `image/*`
4. Click **"Create bucket"**

### Create "profile_documents" Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Fill in the details:
   - **Name**: `profile_documents` (exact name, required)
   - **Public bucket**: ✅ **Enable this** (very important!)
   - **File size limit**: 5 MB (or 10 MB)
   - **Allowed MIME types**: Leave empty or add `image/*`
4. Click **"Create bucket"**

---

## Step 2: Apply Storage Policies

The storage policies for the `images` bucket are already included in `complete_database_schema.sql` (Migration 11).

For the `profile_documents` bucket, run this SQL in **Supabase Dashboard** → **SQL Editor**:

```sql
-- Storage Policies for profile_documents bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload profile documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile documents" ON storage.objects;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload profile documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_documents'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow public viewing (required since we use getPublicUrl)
CREATE POLICY "Public can view profile documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile_documents');

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete their own profile documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_documents' 
  AND auth.uid() = owner
);
```

---

## Step 3: Verify the Setup

1. Go to **Storage** → **Policies**
2. Verify these policies exist for each bucket:

### For "images" bucket:
   - ✅ Authenticated users can upload goldsmith files (INSERT)
   - ✅ Users can update their own goldsmith files (UPDATE)
   - ✅ Users can delete their own goldsmith files (DELETE)
   - ✅ Public can read files in images bucket (SELECT)
   - ✅ Users can read their own goldsmith files (SELECT)

### For "profile_documents" bucket:
   - ✅ Authenticated users can upload profile documents (INSERT)
   - ✅ Public can view profile documents (SELECT)
   - ✅ Users can delete their own profile documents (DELETE)

---

## Quick Setup SQL (Run in Supabase SQL Editor)

Run this complete SQL to set up both buckets with all policies:

```sql
-- ============================================================================
-- PROFILE DOCUMENTS BUCKET POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload profile documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile documents" ON storage.objects;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload profile documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_documents'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow public viewing (required since we use getPublicUrl)
CREATE POLICY "Public can view profile documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile_documents');

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete their own profile documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_documents' 
  AND auth.uid() = owner
);

-- ============================================================================
-- IMAGES BUCKET POLICIES (if not already applied from complete_database_schema.sql)
-- ============================================================================

-- Note: Images bucket policies are already in complete_database_schema.sql
-- If you haven't run that file yet, you can run the storage policies migration:
-- supabase/migrations/20260112000002_storage_policies.sql
```

---

## Summary

✅ **Create 2 buckets:**
- `images` (public)
- `profile_documents` (public)

✅ **Apply policies:**
- Images bucket policies: Already in `complete_database_schema.sql`
- Profile documents policies: Run the SQL above

✅ **Verify:**
- Both buckets exist
- All policies are applied
- Buckets are set to "Public"

---

## Troubleshooting

### Error: "Bucket not found"
- **Solution**: Create the missing bucket in Supabase Dashboard → Storage

### Error: "new row violates row-level security"
- **Solution**: Make sure all policies are applied correctly

### Error: "permission denied"
- **Solution**: 
  1. Verify buckets are set to "Public bucket"
  2. Verify all policies are created
  3. Check that user is authenticated

