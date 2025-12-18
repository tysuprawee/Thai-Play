-- Listing Secrets Table (for Instant Delivery)
CREATE TABLE IF NOT EXISTS public.listing_secrets (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.listing_secrets ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own secrets
CREATE POLICY "Sellers can manage their secrets" ON public.listing_secrets
    USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_secrets.listing_id
            AND listings.seller_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_secrets.listing_id
            AND listings.seller_id = auth.uid()
        )
    );

-- Buyers can view secrets for their PURCHASED orders (Complex, usually handled by Backend Function or separate query)
-- For now, we are focusing on Seller creation. Buyers access will likely be via an Edge Function or "Orders" policy join.
-- Adding a policy to allow reading if you strictly "own" the order linked to this listing is complex in pure RLS without a join table.
-- We will handle Buyer access via bespoke query in the Orders page, assuming strict backend or RPC in future.
-- But for basic flow:
CREATE POLICY "Admins can view all secrets" ON public.listing_secrets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
