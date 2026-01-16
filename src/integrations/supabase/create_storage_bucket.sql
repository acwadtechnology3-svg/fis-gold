-- Create a new storage bucket for marketing assets (banners, partners)
insert into storage.buckets (id, name, public)
values ('marketing', 'marketing', true)
on conflict (id) do nothing;

-- Policy to allow public access to the bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'marketing' );

-- Policy to allow authenticated users (admin) to upload assets
-- Assuming admins are authenticated users for now, or you can refine this with specific role checks
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'marketing' and auth.role() = 'authenticated' );

-- Policy to allow authenticated users to update assets
create policy "Authenticated users can update"
  on storage.objects for update
  using ( bucket_id = 'marketing' and auth.role() = 'authenticated' );

-- Policy to allow authenticated users to delete assets
create policy "Authenticated users can delete"
  on storage.objects for delete
  using ( bucket_id = 'marketing' and auth.role() = 'authenticated' );
