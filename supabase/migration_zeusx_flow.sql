-- Migration for ZeusX Workflow
-- Adds columns to track auto-completion, funds holding, and disputes.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS auto_confirm_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS funds_release_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_reason text,
ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending' CHECK (payout_status IN ('pending', 'ready', 'paid'));

-- Comment on columns for clarity
COMMENT ON COLUMN public.orders.auto_confirm_at IS 'Timestamp when the order will automatically be marked as completed if no action is taken by the buyer.';
COMMENT ON COLUMN public.orders.funds_release_at IS 'Timestamp when the funds will be available for the seller to withdraw (after holding period).';
