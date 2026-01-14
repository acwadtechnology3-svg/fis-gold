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
