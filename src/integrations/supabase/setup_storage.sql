-- Create the storage bucket for profile documents
insert into storage.buckets (id, name, public)
values ('profile_documents', 'profile_documents', true);

-- Policy to allow authenticated users to upload files
create policy "Authenticated users can upload profile documents"
  on storage.objects for insert
  with check ( bucket_id = 'profile_documents' and auth.role() = 'authenticated' );

-- Policy to allow public viewing (required since we use getPublicUrl)
-- CAUTION: This means if someone guesses the URL, they can see the ID. 
-- For production, consider using signed URLs and a private bucket.
create policy "Public can view profile documents"
  on storage.objects for select
  using ( bucket_id = 'profile_documents' );

-- Allow users to delete their own files if needed
create policy "Users can delete their own profile documents"
  on storage.objects for delete
  using ( bucket_id = 'profile_documents' and auth.uid() = owner );
