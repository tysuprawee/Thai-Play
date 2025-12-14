-- Comprehensive Fix for Realtime Read Receipts
-- Use this to ensure all database settings are correct for Realtime updates.

BEGIN;

-- 1. Ensure 'messages' table has 'is_read' column
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 2. Force REPLICA IDENTITY FULL
-- This ensures 'UPDATE' payloads contain ALL columns, not just changed ones.
-- Critical for client-side filtering and robust updates.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 3. Reset and Fix RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting or restrictive policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.messages;
DROP POLICY IF EXISTS "Specific users can view" ON public.messages;
DROP POLICY IF EXISTS "Users can read messages where they are sender or receiver" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.messages;

-- Create PERMISSIVE policies for Sender/Receiver
-- Policy: View (SELECT)
CREATE POLICY "View Messages"
ON public.messages FOR SELECT
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Policy: Insert
CREATE POLICY "Insert Messages"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
);

-- Policy: Update
-- Ensure both Senders (rarely) and Receivers (read receipts) can update
CREATE POLICY "Update Messages"
ON public.messages FOR UPDATE
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- 4. Publish to Realtime
-- Ensure the table is in the publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.messages, public.notifications, public.order_messages, public.orders, public.conversations, public.profiles;

COMMIT;
