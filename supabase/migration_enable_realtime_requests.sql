-- Add game_requests to the supabase_realtime publication to enable listening to changes
-- This is required for 'postgres_changes' to work on this table
alter publication supabase_realtime add table game_requests;
