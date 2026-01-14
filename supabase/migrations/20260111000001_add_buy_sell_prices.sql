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
