-- Add specifications, tags, and stock columns to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stock int DEFAULT 1;

-- Ensure Reviews table exists (idempotent check)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) unique not null,
  reviewer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  rating int check (rating >= 1 and rating <= 5),
  comment_th text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on reviews if not already enabled
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Re-apply policies to be safe (DROP IF EXISTS first)
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Buyers can create reviews for completed orders" ON public.reviews;
CREATE POLICY "Buyers can create reviews for completed orders"
  ON public.reviews FOR INSERT
  WITH CHECK ( auth.uid() = reviewer_id );

-- Allow sellers to view reviews on their profile (covered by public select)
