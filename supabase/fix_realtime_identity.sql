-- Set Replica Identity to FULL for messages to ensure UPDATE events contain all columns
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Set Replica Identity to FULL for profiles to ensure online status updates work reliably
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add profiles to realtime if not already present (This command might fail if already added, which is fine, but we can try to be safe or just run it separately if needed. Since the user can run commands one by one, we will list them.)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
