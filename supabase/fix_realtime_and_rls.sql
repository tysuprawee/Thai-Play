-- 1. Add tables to supabase_realtime publication
-- This is often missed when creating tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Verify/Fix Notifications RLS just in case
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Backfill receiver_id for existing messages that might be missing it (Best Effort)
-- This is needed if we have old messages that stick around and we want them correct, 
-- though mostly important for new messages.
-- Complex to do fully correctly in SQL without cursor, but we can try a simple join if conversation exists.
-- UPDATE public.messages m
-- SET receiver_id = CASE 
--     WHEN c.participant1_id = m.sender_id THEN c.participant2_id 
--     ELSE c.participant1_id 
--   END
-- FROM public.conversations c
-- WHERE m.conversation_id = c.id AND m.receiver_id IS NULL;
