-- Check if any game requests exist and what their status is
-- Run this in the Supabase Dashboard SQL Editor
SELECT id, game_name, status, requester_id, created_at FROM public.game_requests ORDER BY created_at DESC;
