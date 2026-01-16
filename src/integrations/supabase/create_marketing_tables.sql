-- Create banners table
create table public.banners (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  image_url text, -- Store banner image URL
  description text,
  button_text text,
  button_link text,
  icon_name text default 'Gift', -- Store icon name as string
  gradient_from text default 'amber-500',
  gradient_via text default 'yellow-500', 
  gradient_to text default 'orange-500',
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create partners table
create table public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text, -- Store image URL
  website_url text,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.banners enable row level security;
alter table public.partners enable row level security;

-- Policies for Banners
create policy "Public can view active banners"
  on public.banners for select
  using (is_active = true);

create policy "Admins can manage banners"
  on public.banners for all
  using (
      exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  );

-- Policies for Partners
create policy "Public can view active partners"
  on public.partners for select
  using (is_active = true);

create policy "Admins can manage partners"
  on public.partners for all
  using (
      exists (
      select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
    )
  );
