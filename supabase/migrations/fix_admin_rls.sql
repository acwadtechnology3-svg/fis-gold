-- ============================================================
-- ADMIN RLS POLICIES - Production Ready
-- This file creates admin-level access for key tables
-- ============================================================

-- 1. Create user_roles table (if not exists)
create table if not exists user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'moderator', 'user')),
  created_at timestamptz default now(),
  unique(user_id, role)
);

alter table user_roles enable row level security;

-- 2. Create is_admin helper function
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from user_roles
    where user_id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- 3. RLS Policy for user_roles itself
-- Admins can view all roles
drop policy if exists "Admins can view all roles" on user_roles;
create policy "Admins can view all roles"
  on user_roles for select
  using (is_admin() or auth.uid() = user_id);

-- Admins can insert roles
drop policy if exists "Admins can insert roles" on user_roles;
create policy "Admins can insert roles"
  on user_roles for insert
  with check (is_admin());

-- Admins can delete roles  
drop policy if exists "Admins can delete roles" on user_roles;
create policy "Admins can delete roles"
  on user_roles for delete
  using (is_admin());

-- ============================================================
-- 4. PROFILES table - Admin access
-- ============================================================
drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

drop policy if exists "Admins can update all profiles" on profiles;
create policy "Admins can update all profiles"
  on profiles for update
  using (is_admin());

-- ============================================================
-- 5. DEPOSITS table - Admin access
-- ============================================================
drop policy if exists "Admins can view all deposits" on deposits;
create policy "Admins can view all deposits"
  on deposits for select
  using (is_admin());

drop policy if exists "Admins can update all deposits" on deposits;
create policy "Admins can update all deposits"
  on deposits for update
  using (is_admin());

-- ============================================================
-- 6. WITHDRAWALS table - Admin access
-- ============================================================
drop policy if exists "Admins can view all withdrawals" on withdrawals;
create policy "Admins can view all withdrawals"
  on withdrawals for select
  using (is_admin());

drop policy if exists "Admins can update all withdrawals" on withdrawals;
create policy "Admins can update all withdrawals"
  on withdrawals for update
  using (is_admin());

-- ============================================================
-- 7. WALLET_ACCOUNTS table - Admin access
-- ============================================================
drop policy if exists "Admins can view all wallet_accounts" on wallet_accounts;
create policy "Admins can view all wallet_accounts"
  on wallet_accounts for select
  using (is_admin());

-- ============================================================
-- 8. WALLET_LEDGER table - Admin access
-- ============================================================
drop policy if exists "Admins can view all wallet_ledger" on wallet_ledger;
create policy "Admins can view all wallet_ledger"
  on wallet_ledger for select
  using (is_admin());

-- ============================================================
-- 9. GOLD_POSITIONS table - Admin access
-- ============================================================
drop policy if exists "Admins can view all gold_positions" on gold_positions;
create policy "Admins can view all gold_positions"
  on gold_positions for select
  using (is_admin());

-- ============================================================
-- 10. FEE_RULES table - Admin full access
-- ============================================================
drop policy if exists "Admins can manage fee_rules" on fee_rules;
create policy "Admins can manage fee_rules"
  on fee_rules for all
  using (is_admin());

-- ============================================================
-- 11. GOLDSMITHS table - Admin access
-- ============================================================
drop policy if exists "Admins can view all goldsmiths" on goldsmiths;
create policy "Admins can view all goldsmiths"
  on goldsmiths for select
  using (is_admin());

drop policy if exists "Admins can update all goldsmiths" on goldsmiths;
create policy "Admins can update all goldsmiths"
  on goldsmiths for update
  using (is_admin());

-- ============================================================
-- 12. PRODUCTS table - Admin access
-- ============================================================
drop policy if exists "Admins can manage products" on products;
create policy "Admins can manage products"
  on products for all
  using (is_admin());

-- ============================================================
-- 13. CHAT_MESSAGES table - Admin access
-- ============================================================
drop policy if exists "Admins can view all chat_messages" on chat_messages;
create policy "Admins can view all chat_messages"
  on chat_messages for select
  using (is_admin());

drop policy if exists "Admins can insert chat_messages" on chat_messages;
create policy "Admins can insert chat_messages"
  on chat_messages for insert
  with check (is_admin());

drop policy if exists "Admins can update chat_messages" on chat_messages;
create policy "Admins can update chat_messages"
  on chat_messages for update
  using (is_admin());

-- ============================================================
-- Done! After running this, admins will be able to:
-- - View all users, deposits, withdrawals
-- - Approve/reject deposits and withdrawals
-- - Manage goldsmiths and products
-- - Update fee rules
-- - Reply to user chats
-- ============================================================
