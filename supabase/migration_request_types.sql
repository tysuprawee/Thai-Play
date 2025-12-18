-- Add request_type column (game, feature, bug)
ALTER TABLE public.game_requests 
ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'game' CHECK (request_type IN ('game', 'feature', 'bug'));

-- Update existing rows (if any nulls, though default handles it)
UPDATE public.game_requests SET request_type = 'game' WHERE request_type IS NULL;
