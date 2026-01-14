-- ============================================================================
-- COMPLETE DATABASE SCHEMA FOR FIS GOLD SYSTEM
-- ============================================================================
-- This file contains all database migrations combined into one SQL script
-- Execute this in your Supabase SQL Editor or via Supabase CLI
-- 
-- IMPORTANT NOTES:
-- 1. Run this script in a fresh database or ensure no conflicts exist
-- 2. Create storage bucket "images" manually in Supabase Dashboard
-- 3. Some functions require service role key for user creation
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Initial Schema (20260108121854)
-- ============================================================================

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create deposits table
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount >= 2000),
  package_type TEXT NOT NULL CHECK (package_type IN ('1_year', '2_years', '3_years')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  gold_grams DECIMAL(10,4),
  gold_price_at_deposit DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on deposits
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Deposits policies
CREATE POLICY "Users can view their own deposits"
ON public.deposits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits"
ON public.deposits FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deposit_id UUID REFERENCES public.deposits(id) ON DELETE SET NULL,
  amount DECIMAL(15,2) NOT NULL,
  withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('cash', 'gold', 'silver')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  gold_price_at_withdrawal DECIMAL(15,2),
  fee_percentage DECIMAL(5,2) DEFAULT 0,
  fee_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Withdrawals policies
CREATE POLICY "Users can view their own withdrawals"
ON public.withdrawals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals"
ON public.withdrawals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create portfolio_summary view function
CREATE OR REPLACE FUNCTION public.get_user_portfolio(p_user_id UUID)
RETURNS TABLE (
  total_invested DECIMAL,
  total_gold_grams DECIMAL,
  pending_deposits BIGINT,
  approved_deposits BIGINT,
  pending_withdrawals BIGINT,
  completed_withdrawals BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as total_invested,
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.gold_grams ELSE 0 END), 0) as total_gold_grams,
    COUNT(CASE WHEN d.status = 'pending' THEN 1 END) as pending_deposits,
    COUNT(CASE WHEN d.status = 'approved' THEN 1 END) as approved_deposits,
    (SELECT COUNT(*) FROM public.withdrawals w WHERE w.user_id = p_user_id AND w.status = 'pending') as pending_withdrawals,
    (SELECT COUNT(*) FROM public.withdrawals w WHERE w.user_id = p_user_id AND w.status = 'completed') as completed_withdrawals
  FROM public.deposits d
  WHERE d.user_id = p_user_id;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MIGRATION 2: User Roles System (20260108152602)
-- ============================================================================

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy: Admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all deposits
CREATE POLICY "Admins can view all deposits"
ON public.deposits
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update deposits
CREATE POLICY "Admins can update deposits"
ON public.deposits
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all withdrawals
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update withdrawals
CREATE POLICY "Admins can update withdrawals"
ON public.withdrawals
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- MIGRATION 3: Metal Prices (20260108155424)
-- ============================================================================

-- Create metal prices table
CREATE TABLE public.metal_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metal_type text NOT NULL, -- 'gold' or 'silver'
  price_per_gram numeric NOT NULL,
  price_per_ounce numeric NOT NULL,
  source text NOT NULL DEFAULT 'api', -- 'api' or 'manual'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_metal_prices_type_created ON public.metal_prices(metal_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.metal_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can view prices (public data)
CREATE POLICY "Anyone can view metal prices"
ON public.metal_prices
FOR SELECT
USING (true);

-- Only admins can insert/update prices
CREATE POLICY "Admins can insert metal prices"
ON public.metal_prices
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update metal prices"
ON public.metal_prices
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_metal_prices_updated_at
BEFORE UPDATE ON public.metal_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get latest prices
CREATE OR REPLACE FUNCTION public.get_latest_metal_prices()
RETURNS TABLE(metal_type text, price_per_gram numeric, price_per_ounce numeric, source text, updated_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (mp.metal_type) 
    mp.metal_type, 
    mp.price_per_gram, 
    mp.price_per_ounce, 
    mp.source, 
    mp.updated_at
  FROM public.metal_prices mp
  ORDER BY mp.metal_type, mp.created_at DESC;
$$;

-- ============================================================================
-- MIGRATION 4: Extensions (20260108163006)
-- ============================================================================

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================================
-- MIGRATION 5: Admin Role Functions (20260109000000)
-- ============================================================================

-- Function to grant admin role to a user
-- This function uses SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION public.grant_admin_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Function to grant admin role by email
-- This function uses SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION public.grant_admin_role_by_email(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', _email;
  END IF;
  
  -- Insert admin role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- ============================================================================
-- MIGRATION 6: Admin Features (20260110000000)
-- ============================================================================

-- Create activity_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'deposit_approved', 'deposit_rejected', 'withdrawal_approved', etc.
  entity_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'user', 'price', etc.
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action_type ON public.activity_log(action_type);
CREATE INDEX idx_activity_log_entity_type ON public.activity_log(entity_type);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
ON public.activity_log
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view settings (public data)
CREATE POLICY "Anyone can view system settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('withdrawal_fee_percentage', '{"value": 2.5}', 'نسبة رسوم السحب'),
  ('min_deposit_amount', '{"value": 2000}', 'الحد الأدنى لمبلغ الإيداع'),
  ('auto_approve_deposits', '{"value": false}', 'الموافقة التلقائية على الإيداعات'),
  ('email_notifications', '{"value": true}', 'تفعيل إشعارات البريد الإلكتروني'),
  ('maintenance_mode', '{"value": false}', 'وضع الصيانة')
ON CONFLICT (key) DO NOTHING;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  IF NOT public.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can log activities';
  END IF;
  
  INSERT INTO public.activity_log (
    user_id,
    action_type,
    entity_type,
    entity_id,
    description,
    metadata
  )
  VALUES (
    v_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_description,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to get user portfolio summary (for admin)
CREATE OR REPLACE FUNCTION public.get_user_portfolio_admin(p_user_id UUID)
RETURNS TABLE(
  total_invested NUMERIC,
  total_gold_grams NUMERIC,
  pending_deposits NUMERIC,
  approved_deposits NUMERIC,
  pending_withdrawals NUMERIC,
  completed_withdrawals NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0)::NUMERIC as total_invested,
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.gold_grams ELSE 0 END), 0)::NUMERIC as total_gold_grams,
    COALESCE(SUM(CASE WHEN d.status = 'pending' THEN d.amount ELSE 0 END), 0)::NUMERIC as pending_deposits,
    COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0)::NUMERIC as approved_deposits,
    COALESCE(SUM(CASE WHEN w.status = 'pending' THEN w.amount ELSE 0 END), 0)::NUMERIC as pending_withdrawals,
    COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.amount ELSE 0 END), 0)::NUMERIC as completed_withdrawals
  FROM auth.users u
  LEFT JOIN public.deposits d ON d.user_id = u.id
  LEFT JOIN public.withdrawals w ON w.user_id = u.id
  WHERE u.id = p_user_id
  GROUP BY u.id;
END;
$$;

-- Add email column to profiles if it doesn't exist (for better user management)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    
    -- Update existing profiles with email from auth.users
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.user_id = u.id;
  END IF;
END $$;

-- Add is_active column to profiles for user management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 7: Default Admin (20260111000000)
-- ============================================================================

-- Create default admin account
-- Email: admin@fisgold.com
-- Password: Admin123!@#
-- 
-- Note: This will create the user in auth.users and grant admin role
-- You can change the password after first login

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@fisgold.com';
  v_password TEXT := 'Admin123!@#';
  v_full_name TEXT := 'مدير النظام';
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  -- If user doesn't exist, create it
  IF v_user_id IS NULL THEN
    -- Insert into auth.users (this requires service role or direct database access)
    -- Note: This is a simplified version. In production, use Supabase Admin API
    -- For now, we'll just grant admin role to existing users or create via function
    
    -- Create a function that can be called with service role
    RAISE NOTICE 'User % does not exist. Please create it manually through Supabase Dashboard or use the create-admin script.', v_email;
  ELSE
    -- User exists, grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to existing user: %', v_email;
  END IF;
END $$;

-- Alternative: Create a function to create admin user (requires service role)
CREATE OR REPLACE FUNCTION public.create_default_admin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@fisgold.com';
  v_password TEXT := 'Admin123!@#';
  v_full_name TEXT := 'مدير النظام';
BEGIN
  -- This function should be called with service role key
  -- It will create user and grant admin role
  
  -- Check if user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User does not exist. Please create user first through Supabase Auth or use the create-admin script.';
  ELSE
    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN 'Admin role granted to: ' || v_email;
  END IF;
END;
$$;

-- ============================================================================
-- MIGRATION 8: Buy/Sell Prices (20260111000001)
-- ============================================================================

-- Add buy_price and sell_price columns to metal_prices table
-- Migration to support separate buy and sell prices

-- Add new columns
ALTER TABLE public.metal_prices
ADD COLUMN IF NOT EXISTS buy_price_per_gram NUMERIC,
ADD COLUMN IF NOT EXISTS sell_price_per_gram NUMERIC,
ADD COLUMN IF NOT EXISTS buy_price_per_ounce NUMERIC,
ADD COLUMN IF NOT EXISTS sell_price_per_ounce NUMERIC;

-- Update existing records: set buy_price and sell_price to current price_per_gram
-- (assuming current price is buy price, and sell price is 2% less for spread)
UPDATE public.metal_prices
SET 
  buy_price_per_gram = price_per_gram,
  sell_price_per_gram = price_per_gram * 0.98, -- 2% spread
  buy_price_per_ounce = price_per_ounce,
  sell_price_per_ounce = price_per_ounce * 0.98
WHERE buy_price_per_gram IS NULL;

-- Make buy_price required (not null) for new records
ALTER TABLE public.metal_prices
ALTER COLUMN buy_price_per_gram SET NOT NULL,
ALTER COLUMN sell_price_per_gram SET NOT NULL,
ALTER COLUMN buy_price_per_ounce SET NOT NULL,
ALTER COLUMN sell_price_per_ounce SET NOT NULL;

-- Update function to return buy and sell prices
-- Drop the function first because we're changing the return type
DROP FUNCTION IF EXISTS public.get_latest_metal_prices();

CREATE OR REPLACE FUNCTION public.get_latest_metal_prices()
RETURNS TABLE(
  metal_type text, 
  price_per_gram numeric, 
  buy_price_per_gram numeric,
  sell_price_per_gram numeric,
  price_per_ounce numeric,
  buy_price_per_ounce numeric,
  sell_price_per_ounce numeric,
  source text, 
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (mp.metal_type) 
    mp.metal_type, 
    COALESCE(mp.buy_price_per_gram, mp.price_per_gram) as price_per_gram, -- Backward compatibility
    mp.buy_price_per_gram,
    mp.sell_price_per_gram,
    COALESCE(mp.buy_price_per_ounce, mp.price_per_ounce) as price_per_ounce, -- Backward compatibility
    mp.buy_price_per_ounce,
    mp.sell_price_per_ounce,
    mp.source, 
    mp.updated_at
  FROM public.metal_prices mp
  ORDER BY mp.metal_type, mp.created_at DESC;
$$;

-- ============================================================================
-- MIGRATION 9: Goldsmiths System (20260112000000)
-- ============================================================================

-- Create goldsmiths table
CREATE TABLE IF NOT EXISTS public.goldsmiths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  commercial_registration TEXT NOT NULL,
  id_card_image_url TEXT,
  commercial_registration_image_url TEXT,
  logo_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  admin_notes TEXT,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX idx_goldsmiths_user_id ON public.goldsmiths(user_id);
CREATE INDEX idx_goldsmiths_status ON public.goldsmiths(status);
CREATE INDEX idx_goldsmiths_rating ON public.goldsmiths(rating_average DESC);

-- Enable RLS
ALTER TABLE public.goldsmiths ENABLE ROW LEVEL SECURITY;

-- Policies for goldsmiths
CREATE POLICY "Goldsmiths can view their own profile"
ON public.goldsmiths
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Goldsmiths can update their own profile"
ON public.goldsmiths
FOR UPDATE
USING (auth.uid() = user_id AND status = 'approved');

CREATE POLICY "Anyone can view approved goldsmiths"
ON public.goldsmiths
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Admins can manage all goldsmiths"
ON public.goldsmiths
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goldsmith_id UUID NOT NULL REFERENCES public.goldsmiths(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight_grams DECIMAL(10,4) NOT NULL,
  karat INTEGER NOT NULL CHECK (karat IN (18, 21, 22, 24)),
  price DECIMAL(15,2) NOT NULL,
  making_charge DECIMAL(15,2) DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  images TEXT[], -- Array of image URLs
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_products_goldsmith_id ON public.products(goldsmith_id);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_karat ON public.products(karat);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Goldsmiths can manage their own products"
ON public.products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.goldsmiths
    WHERE id = products.goldsmith_id
    AND user_id = auth.uid()
    AND status = 'approved'
  )
);

CREATE POLICY "Admins can manage all products"
ON public.products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goldsmith_id UUID NOT NULL REFERENCES public.goldsmiths(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'shipped', 'completed', 'cancelled')),
  shipping_address TEXT,
  shipping_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_goldsmith_id ON public.orders(goldsmith_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for orders
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Goldsmiths can view their orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.goldsmiths
    WHERE id = orders.goldsmith_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Goldsmiths can update their orders"
ON public.orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.goldsmiths
    WHERE id = orders.goldsmith_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goldsmith_id UUID NOT NULL REFERENCES public.goldsmiths(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, goldsmith_id, order_id)
);

-- Create index for faster queries
CREATE INDEX idx_reviews_goldsmith_id ON public.reviews(goldsmith_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

CREATE POLICY "Users can create reviews for their orders"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    order_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = reviews.order_id
      AND user_id = auth.uid()
      AND status = 'completed'
    )
  )
);

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
ON public.reviews
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Function to update goldsmith rating
CREATE OR REPLACE FUNCTION public.update_goldsmith_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.goldsmiths
  SET
    rating_average = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
      FROM public.reviews
      WHERE goldsmith_id = COALESCE(NEW.goldsmith_id, OLD.goldsmith_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE goldsmith_id = COALESCE(NEW.goldsmith_id, OLD.goldsmith_id)
    )
  WHERE id = COALESCE(NEW.goldsmith_id, OLD.goldsmith_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update rating on review insert/update/delete
CREATE TRIGGER update_goldsmith_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_goldsmith_rating();

-- Function to check if user is goldsmith
CREATE OR REPLACE FUNCTION public.is_goldsmith(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.goldsmiths
    WHERE user_id = p_user_id
    AND status = 'approved'
  );
$$;

-- Function to grant goldsmith access (called when approved)
CREATE OR REPLACE FUNCTION public.approve_goldsmith(p_goldsmith_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.goldsmiths
  SET
    status = 'approved',
    approved_at = now(),
    admin_notes = p_notes,
    updated_at = now()
  WHERE id = p_goldsmith_id;
END;
$$;

-- ============================================================================
-- MIGRATION 10: Update Goldsmiths Fields (20260112000001)
-- ============================================================================

-- Update goldsmiths table to add new fields
ALTER TABLE public.goldsmiths
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS tax_card_number TEXT,
ADD COLUMN IF NOT EXISTS tax_card_image_url TEXT,
ADD COLUMN IF NOT EXISTS shop_photo_url TEXT,
ADD COLUMN IF NOT EXISTS years_experience INTEGER,
ADD COLUMN IF NOT EXISTS product_types TEXT[], -- Array of product types: ['crafted', 'ingots', 'gold_coins', 'silver']
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'vodafone_cash', 'company_account', NULL)),
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS vodafone_cash_number TEXT,
ADD COLUMN IF NOT EXISTS company_account TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_accuracy_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS review_accepted BOOLEAN DEFAULT false;

-- Add index for city
CREATE INDEX IF NOT EXISTS idx_goldsmiths_city ON public.goldsmiths(city);

-- ============================================================================
-- MIGRATION 11: Storage Policies (20260112000002)
-- ============================================================================

-- Storage Policies for goldsmiths files
-- This assumes a bucket named "images" exists
-- Note: Bucket must be created manually in Supabase Dashboard first

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

-- Policy: Allow public read access to all files in images bucket
CREATE POLICY "Public can read files in images bucket"
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

-- ============================================================================
-- MIGRATION 12: FIS Gold Products (20260112000004)
-- ============================================================================

-- Allow products without goldsmith_id (for FIS Gold products)
-- Add metal_type column for gold/silver

-- First, drop the foreign key constraint
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_goldsmith_id_fkey;

-- Make goldsmith_id nullable
ALTER TABLE public.products
ALTER COLUMN goldsmith_id DROP NOT NULL;

-- Add metal_type column
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS metal_type TEXT NOT NULL DEFAULT 'gold' CHECK (metal_type IN ('gold', 'silver'));

-- Re-add the foreign key constraint (but allow NULL)
ALTER TABLE public.products
ADD CONSTRAINT products_goldsmith_id_fkey
FOREIGN KEY (goldsmith_id) REFERENCES public.goldsmiths(id) ON DELETE CASCADE;

-- Update karat to allow NULL for silver products
-- Drop existing check constraint first
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_karat_check;

-- Make karat nullable
ALTER TABLE public.products
ALTER COLUMN karat DROP NOT NULL;

-- Add new check constraint that allows NULL for silver
ALTER TABLE public.products
ADD CONSTRAINT products_karat_check CHECK (
  (metal_type = 'gold' AND karat IN (18, 21, 22, 24)) OR
  (metal_type = 'silver' AND (karat IS NULL OR karat = 0))
);

-- Add index for metal_type
CREATE INDEX IF NOT EXISTS idx_products_metal_type ON public.products(metal_type);

-- Update orders table to handle NULL goldsmith_id for FIS Gold products
ALTER TABLE public.orders
ALTER COLUMN goldsmith_id DROP NOT NULL;

-- ============================================================================
-- COMPLETE DATABASE SCHEMA CREATED
-- ============================================================================
-- 
-- Next Steps:
-- 1. Create storage bucket "images" in Supabase Dashboard
-- 2. Set bucket to public access
-- 3. Create admin user manually through Supabase Auth
-- 4. Grant admin role using: SELECT grant_admin_role_by_email('admin@fisgold.com');
-- 
-- ============================================================================

