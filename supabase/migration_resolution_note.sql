-- Add resolution tracking columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS resolution_note text,
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolved_by uuid references public.profiles(id);

-- Check Constraints if needed (optional)
COMMENT ON COLUMN public.orders.resolution_note IS 'Reason provided by admin when resolving a dispute';
