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
  (SELECT 
    'gold'::TEXT as metal_type,
    g.buy_price as price_per_gram,
    g.buy_price as buy_price_per_gram,
    g.sell_price as sell_price_per_gram,
    (g.buy_price * 31.1035) as price_per_ounce,
    (g.buy_price * 31.1035) as buy_price_per_ounce,
    (g.sell_price * 31.1035) as sell_price_per_ounce,
    g.source::TEXT,
    g.created_at as updated_at
  FROM gold_prices g
  WHERE g.karat = '24'
  ORDER BY g.created_at DESC
  LIMIT 1)
  
  UNION ALL
  
  (SELECT 
    'silver'::TEXT as metal_type,
    s.price_per_gram,
    COALESCE(s.buy_price, s.price_per_gram) as buy_price_per_gram,
    COALESCE(s.sell_price, s.price_per_gram) as sell_price_per_gram,
    s.price_per_ounce,
    s.price_per_ounce as buy_price_per_ounce,
    s.price_per_ounce as sell_price_per_ounce,
    s.source::TEXT,
    s.created_at as updated_at
  FROM silver_prices s
  ORDER BY s.created_at DESC
  LIMIT 1);
END;
$$;

-- Grant access to public (or authenticated)
GRANT EXECUTE ON FUNCTION public.get_latest_metal_prices() TO postgres, anon, authenticated, service_role;
