-- Enable Realtime for order_messages table
-- This is required for the chat in the Order Details page to update dynamically.

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
