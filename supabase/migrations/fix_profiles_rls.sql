-- RLS Policies for Profiles table
-- Fixes "new row violates row-level security policy" error

-- Enable RLS just in case
alter table profiles enable row level security;

-- 1. Users can view their own profile
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- 2. Users can insert their own profile (Critical for Sign Up / Complete Profile)
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- 3. Users can update their own profile
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);
