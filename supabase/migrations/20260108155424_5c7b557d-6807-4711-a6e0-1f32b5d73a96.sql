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