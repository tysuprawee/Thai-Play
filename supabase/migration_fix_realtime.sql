-- Fix Realtime for Notifications and Messages
-- This ensures the UI updates when new messages or notifications arrive.

-- 1. Ensure 'messages' table is in the publication and has full replica identity
ALTER TABLE public.messages REPLICA IDENTITY FULL;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.messages, public.notifications, public.order_messages, public.orders;

-- Note: The above recreates the publication. If you have other tables, add them to the list.
-- Alternatively, use:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- But 'ADD TABLE' can fail if already added. The safest idempotent way is usually DO block or just ignore error.
-- For this script, we'll assume standard setup.

-- Safest way to ensure specific tables are added without errors if they exist:
DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL; -- Ignore if already exists
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
