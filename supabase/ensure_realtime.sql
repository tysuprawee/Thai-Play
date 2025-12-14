-- Ensure messages table is part of the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- Verify replica identity to ensure full rows are sent on updates (usually default is enough but this is safer for filters)
ALTER TABLE public.messages REPLICA IDENTITY FULL;
