-- ============================================================
-- SYSTEM SETTINGS & FEE RULES TABLES
-- ============================================================

-- 1. Create system_settings table
create table if not exists system_settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value jsonb not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table system_settings enable row level security;

-- 2. Create fee_rules table
create table if not exists fee_rules (
  id uuid default gen_random_uuid() primary key,
  fee_type text unique not null,
  fee_percent decimal(10, 4) not null default 0,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table fee_rules enable row level security;

-- 3. Insert default system settings
insert into system_settings (key, value, description) values
  ('min_deposit_amount', '2000', 'الحد الأدنى لمبلغ الإيداع'),
  ('auto_approve_deposits', 'false', 'الموافقة التلقائية على الإيداعات'),
  ('email_notifications', 'true', 'إرسال إشعارات البريد الإلكتروني'),
  ('maintenance_mode', 'false', 'وضع الصيانة')
on conflict (key) do nothing;

-- 4. Insert default fee rules
insert into fee_rules (fee_type, fee_percent, description) values
  ('forced_withdrawal', 0.10, 'رسوم السحب المبكر (كسر الوديعة) - 10%'),
  ('normal_withdrawal', 0.02, 'رسوم السحب العادي - 2%'),
  ('gold_buy', 0.01, 'رسوم شراء الذهب - 1%'),
  ('gold_sell', 0.01, 'رسوم بيع الذهب - 1%')
on conflict (fee_type) do nothing;

-- 5. RLS Policies for system_settings
drop policy if exists "Admins can view system_settings" on system_settings;
create policy "Admins can view system_settings"
  on system_settings for select
  using (is_admin());

drop policy if exists "Admins can update system_settings" on system_settings;
create policy "Admins can update system_settings"
  on system_settings for update
  using (is_admin());

drop policy if exists "Admins can insert system_settings" on system_settings;
create policy "Admins can insert system_settings"
  on system_settings for insert
  with check (is_admin());

-- 6. RLS Policies for fee_rules (assuming is_admin function exists from fix_admin_rls.sql)
drop policy if exists "Admins can view fee_rules" on fee_rules;
create policy "Admins can view fee_rules"
  on fee_rules for select
  using (is_admin());

drop policy if exists "Admins can update fee_rules" on fee_rules;
create policy "Admins can update fee_rules"
  on fee_rules for update
  using (is_admin());

drop policy if exists "Admins can insert fee_rules" on fee_rules;
create policy "Admins can insert fee_rules"
  on fee_rules for insert
  with check (is_admin());

-- ============================================================
-- Done! Run fix_admin_rls.sql FIRST to create the is_admin() function
-- ============================================================
