-- Add structured data support for Instant Delivery secrets
ALTER TABLE public.listing_secrets 
ADD COLUMN IF NOT EXISTS secret_type text DEFAULT 'code', -- 'code' or 'account'
ADD COLUMN IF NOT EXISTS credential_data jsonb DEFAULT '{}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN public.listing_secrets.secret_type IS 'Type of the secret: "code" or "account"';
COMMENT ON COLUMN public.listing_secrets.credential_data IS 'JSON structure for account credentials (username, password, note, etc.)';

-- Update existing rows to have type 'code' (handled by DEFAULT, but valid to be explicit if needed)
-- UPDATE public.listing_secrets SET secret_type = 'code' WHERE secret_type IS NULL;
