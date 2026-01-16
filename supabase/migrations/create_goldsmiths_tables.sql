-- Goldsmiths Application/Profile
create table if not exists goldsmiths (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    name text not null,
    shop_name text not null,
    address text not null,
    phone text not null,
    email text not null,
    national_id text,
    city text,
    commercial_registration text not null,
    tax_card_number text,
    id_card_image_url text,
    commercial_registration_image_url text,
    tax_card_image_url text,
    logo_url text,
    shop_photo_url text,
    description text,
    years_experience int,
    product_types text[], -- Array of strings
    payment_method text,
    bank_account text,
    vodafone_cash_number text,
    company_account text,
    terms_accepted boolean default false,
    data_accuracy_accepted boolean default false,
    review_accepted boolean default false,
    status text check (status in ('pending', 'approved', 'rejected', 'suspended')) default 'pending',
    admin_notes text,
    rating_average numeric default 0,
    rating_count int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    approved_at timestamptz
);

-- Products
create table if not exists products (
    id uuid default gen_random_uuid() primary key,
    goldsmith_id uuid references goldsmiths(id),
    name text not null,
    weight_grams numeric not null,
    karat numeric,
    price numeric not null,
    making_charge numeric not null,
    quantity int not null default 1,
    images text[], -- Array of image URLs
    description text,
    is_active boolean default true,
    metal_type text check (metal_type in ('gold', 'silver')) default 'gold',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table goldsmiths enable row level security;
alter table products enable row level security;

-- Policies for goldsmiths

-- 1. Public can view approved goldsmiths
create policy "Public can view approved goldsmiths"
  on goldsmiths for select
  using (status = 'approved');

-- 2. Users can view their own goldsmith application (any status)
create policy "Users can view own goldsmith application"
  on goldsmiths for select
  using (auth.uid() = user_id);

-- 3. Users can insert their own application
create policy "Users can insert own goldsmith application"
  on goldsmiths for insert
  with check (auth.uid() = user_id);

-- 4. Users can update their own application
create policy "Users can update own goldsmith application"
  on goldsmiths for update
  using (auth.uid() = user_id);

-- Policies for products

-- 1. Public can view active products
create policy "Public can view active products"
  on products for select
  using (is_active = true);

-- 2. Goldsmiths can view own products (even inactive)
create policy "Goldsmiths can view own products"
  on products for select
  using (
    exists (
      select 1 from goldsmiths
      where id = goldsmith_id
      and user_id = auth.uid()
    )
  );

-- 3. Goldsmiths can insert products (must be approved)
create policy "Approved Goldsmiths can insert products"
  on products for insert
  with check (
    exists (
      select 1 from goldsmiths
      where id = goldsmith_id
      and user_id = auth.uid()
      and status = 'approved'
    )
  );

-- 4. Goldsmiths can update own products
create policy "Approved Goldsmiths can update own products"
  on products for update
  using (
    exists (
      select 1 from goldsmiths
      where id = goldsmith_id
      and user_id = auth.uid()
      and status = 'approved'
    )
  );

-- 5. Goldsmiths can delete own products
create policy "Approved Goldsmiths can delete own products"
  on products for delete
  using (
    exists (
      select 1 from goldsmiths
      where id = goldsmith_id
      and user_id = auth.uid()
      and status = 'approved'
    )
  );
