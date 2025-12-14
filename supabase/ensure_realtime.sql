-- Ensure messages table is part of the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- Verify replica identity to ensure full rows are sent on updates (usually default is enough but this is safer for filters)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Ensure notifications table is part of the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- Set Replica Identity for notifications too (good practice for updates)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
