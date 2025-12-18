-- Add cleared_at timestamps for Soft Delete history clearing
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS participant1_cleared_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS participant2_cleared_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
