-- ============================================================================
-- Gold Price API - Database Schema
-- ============================================================================
-- Supports both sell_price/buy_price AND bid/ask naming conventions
-- - sell_price = ask (price at which customer BUYS gold)
-- - buy_price = bid (price at which customer SELLS gold)
-- ============================================================================

-- Create gold_prices table with bid/ask support
CREATE TABLE IF NOT EXISTS gold_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    karat VARCHAR(10) NOT NULL DEFAULT '24',
    
    -- Primary price fields (gold-price-api convention)
    sell_price DECIMAL(12, 2) NOT NULL,  -- Ask price: customer buys at this
    buy_price DECIMAL(12, 2) NOT NULL,   -- Bid price: customer sells at this
    
    -- Market indicators
    opening_price DECIMAL(12, 2),
    change_value DECIMAL(12, 2),
    change_percent DECIMAL(6, 2),
    
    -- Computed bid/ask aliases
    ask DECIMAL(12, 2) GENERATED ALWAYS AS (sell_price) STORED,
    bid DECIMAL(12, 2) GENERATED ALWAYS AS (buy_price) STORED,
    mid DECIMAL(12, 2) GENERATED ALWAYS AS ((sell_price + buy_price) / 2) STORED,
    spread DECIMAL(12, 2) GENERATED ALWAYS AS (sell_price - buy_price) STORED,
    
    -- Metadata
    currency VARCHAR(10) DEFAULT 'EGP',
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create silver_prices table with bid/ask support
CREATE TABLE IF NOT EXISTS silver_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Price per unit
    price_per_gram DECIMAL(10, 2) NOT NULL,
    price_per_ounce DECIMAL(12, 2),
    
    -- Primary price fields (gold-price-api convention)
    sell_price DECIMAL(12, 2),  -- Ask: customer buys at this
    buy_price DECIMAL(12, 2),   -- Bid: customer sells at this
    
    -- Computed bid/ask aliases (fallback to price_per_gram if null)
    ask DECIMAL(12, 2) GENERATED ALWAYS AS (COALESCE(sell_price, price_per_gram)) STORED,
    bid DECIMAL(12, 2) GENERATED ALWAYS AS (COALESCE(buy_price, price_per_gram * 0.99)) STORED,
    mid DECIMAL(12, 2) GENERATED ALWAYS AS (COALESCE((sell_price + buy_price) / 2, price_per_gram)) STORED,
    
    -- Metadata
    currency VARCHAR(10) DEFAULT 'EGP',
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gold_prices_created_at ON gold_prices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gold_prices_karat ON gold_prices(karat);
CREATE INDEX IF NOT EXISTS idx_silver_prices_created_at ON silver_prices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE gold_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE silver_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on gold_prices" ON gold_prices
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on silver_prices" ON silver_prices
    FOR SELECT USING (true);

-- Create policies for service role to insert (use service_role key for cron job)
CREATE POLICY "Allow service role to insert gold_prices" ON gold_prices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role to insert silver_prices" ON silver_prices
    FOR INSERT WITH CHECK (true);

-- Create view for the latest gold price with all aliases
CREATE OR REPLACE VIEW latest_gold_price AS
SELECT 
    id,
    karat,
    sell_price,
    buy_price,
    ask,
    bid,
    mid,
    spread,
    opening_price,
    change_value,
    change_percent,
    currency,
    source,
    created_at
FROM gold_prices
ORDER BY created_at DESC
LIMIT 1;

-- Create view for the latest silver price with all aliases
CREATE OR REPLACE VIEW latest_silver_price AS
SELECT 
    id,
    price_per_gram,
    price_per_ounce,
    sell_price,
    buy_price,
    ask,
    bid,
    mid,
    currency,
    source,
    created_at
FROM silver_prices
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- Price Naming Convention Reference:
-- ============================================================================
-- 
-- | Name         | Meaning                              | Who uses it      |
-- |--------------|--------------------------------------|------------------|
-- | sell_price   | Price dealer sells to customer       | Customer BUYS    |
-- | buy_price    | Price dealer buys from customer      | Customer SELLS   |
-- | ask          | Same as sell_price (trading term)    | Customer BUYS    |
-- | bid          | Same as buy_price (trading term)     | Customer SELLS   |
-- | mid          | Average of bid and ask               | Reference only   |
-- | spread       | Difference (ask - bid)               | Dealer margin    |
-- 
-- ============================================================================

-- Optional: Clean up old data (keep last 7 days)
-- DELETE FROM gold_prices WHERE created_at < NOW() - INTERVAL '7 days';
-- DELETE FROM silver_prices WHERE created_at < NOW() - INTERVAL '7 days';
