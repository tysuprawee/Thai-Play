-- Add listing_id to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS listing_id uuid references public.listings(id);

-- Backfill listing_id from orders
UPDATE public.reviews r
SET listing_id = o.listing_id
FROM public.orders o
WHERE r.order_id = o.id
AND r.listing_id IS NULL;

-- Make it not null (optional, if we want to enforce it for future)
-- ALTER TABLE public.reviews ALTER COLUMN listing_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON public.reviews(listing_id);

-- Update RLS if needed (Reviews are already public, so no change needed for select)
-- But we can ensure the column is viewable (it is by default)
