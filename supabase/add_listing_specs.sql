-- Add specifications and tags columns to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Allow RLS to update these columns (covered by existing policy "Users can update own listings" which allows all columns update)
