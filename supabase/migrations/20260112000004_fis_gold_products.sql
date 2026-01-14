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
