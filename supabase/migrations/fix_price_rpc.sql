-- ============================================================================
-- FIX: Create get_latest_metal_prices RPC
-- ============================================================================
-- This function is required by the frontend useMetalPrices hook
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_latest_metal_prices()
RETURNS TABLE (
  metal_type TEXT,
  price_per_gram DECIMAL,
  buy_price_per_gram DECIMAL,
  sell_price_per_gram DECIMAL,
  price_per_ounce DECIMAL,
  buy_price_per_ounce DECIMAL,
  sell_price_per_ounce DECIMAL,
  source TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Gold (24K)
  SELECT 
    'gold'::TEXT as metal_type,
    buy_price as price_per_gram, -- Use buy price as base
    buy_price as buy_price_per_gram,
    sell_price as sell_price_per_gram,
    (buy_price * 31.1035) as price_per_ounce,
    (buy_price * 31.1035) as buy_price_per_ounce,
    (sell_price * 31.1035) as sell_price_per_ounce,
    source::TEXT,
    created_at as updated_at
  FROM gold_prices
  WHERE karat = '24'
  ORDER BY created_at DESC
  LIMIT 1
  
  UNION ALL
  
  -- Silver
  SELECT 
    'silver'::TEXT as metal_type,
    price_per_gram,
    COALESCE(buy_price, price_per_gram) as buy_price_per_gram,
    COALESCE(sell_price, price_per_gram) as sell_price_per_gram,
    price_per_ounce,
    price_per_ounce as buy_price_per_ounce,
    price_per_ounce as sell_price_per_ounce,
    source::TEXT,
    created_at as updated_at
  FROM silver_prices
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$;

-- Grant access to public (or authenticated)
GRANT EXECUTE ON FUNCTION public.get_latest_metal_prices() TO postgres, anon, authenticated, service_role;
