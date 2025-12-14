-- Check if 'messages' is in supabase_realtime
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages';

-- Check RLS Policies for messages
SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'messages';
