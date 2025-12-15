-- 1. Add Columns for Features
ALTER TABLE public.order_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 2. Enable Realtime for order_messages (Already enabled, skipping to avoid error)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;

-- 3. Set Replica Identity for Update Events (Critical for Read Receipts updates)
ALTER TABLE public.order_messages REPLICA IDENTITY FULL;

-- 4. RLS Policy Overhaul for Realtime to work reliably
-- First, drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view messages for their orders" ON public.order_messages;
DROP POLICY IF EXISTS "Users can insert messages to their orders" ON public.order_messages;
DROP POLICY IF EXISTS "Users can update messages in their orders" ON public.order_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.order_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.order_messages;
-- (Drop standard generic ones if they exist)

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Policy: VIEW (Select)
-- Allow if user is buyer or seller of the linked order
CREATE POLICY "order_msgs_select"
ON public.order_messages FOR SELECT
USING (
  exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
    and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
  )
);

-- Policy: INSERT
-- Allow if sender is self AND user is buyer/seller of order
CREATE POLICY "order_msgs_insert"
ON public.order_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND exists (
    select 1 from public.orders o
    where o.id = order_id
    and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
  )
);

-- Policy: UPDATE (Mark as Read)
-- Allow if user is buyer/seller. 
-- For read receipts, usually the *receiver* updates the 'is_read' flag.
CREATE POLICY "order_msgs_update"
ON public.order_messages FOR UPDATE
USING (
   exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
    and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
  )
);
