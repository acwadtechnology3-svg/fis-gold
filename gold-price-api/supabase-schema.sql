-- Supabase SQL: Create tables for gold and silver prices
-- Run this in your Supabase SQL Editor

-- Create gold_prices table
CREATE TABLE IF NOT EXISTS gold_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    karat VARCHAR(10) NOT NULL DEFAULT '24',
    sell_price DECIMAL(12, 2) NOT NULL,
    buy_price DECIMAL(12, 2) NOT NULL,
    opening_price DECIMAL(12, 2),
    change_value DECIMAL(12, 2),
    change_percent DECIMAL(6, 2),
    currency VARCHAR(10) DEFAULT 'EGP',
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create silver_prices table
CREATE TABLE IF NOT EXISTS silver_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    price_per_gram DECIMAL(10, 2) NOT NULL,
    price_per_ounce DECIMAL(12, 2),
    sell_price DECIMAL(12, 2),
    buy_price DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'EGP',
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gold_prices_created_at ON gold_prices(created_at DESC);
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

-- Create a view for the latest gold price
CREATE OR REPLACE VIEW latest_gold_price AS
SELECT * FROM gold_prices
ORDER BY created_at DESC
LIMIT 1;

-- Create a view for the latest silver price
CREATE OR REPLACE VIEW latest_silver_price AS
SELECT * FROM silver_prices
ORDER BY created_at DESC
LIMIT 1;

-- Optional: Clean up old data (keep last 7 days) - run this as a scheduled function
-- DELETE FROM gold_prices WHERE created_at < NOW() - INTERVAL '7 days';
-- DELETE FROM silver_prices WHERE created_at < NOW() - INTERVAL '7 days';
