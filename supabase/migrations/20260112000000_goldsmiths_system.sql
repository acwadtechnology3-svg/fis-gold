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

-- Add goldsmith role to user_roles enum if needed
-- Note: We'll use the existing app_role enum, but add a check function

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

-- Note: Create storage bucket manually in Supabase Dashboard:
-- 1. Go to Storage
-- 2. Create bucket named "public"
-- 3. Set it to public
-- 4. Add policy: "Allow public read access"
