-- Fix RLS Policies for Messages to ensure Read Receipts work
-- Problem: If RLS doesn't allow the sender to 'SELECT' the row after it's updated by the receiver, Realtime won't broadcast the UPDATE event.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 1. DROP existing policies to be clean (names might vary, so we drop the common ones or all if possible)
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.messages;

-- 2. Create correct policies
-- Allow users to see messages where they are sender OR receiver
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Allow users to insert messages as themselves
CREATE POLICY "Users can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
);

-- Allow users to update messages (e.g. marking as read)
-- Crucially, both sender and receiver should be able to update (though usually receiver marks read)
CREATE POLICY "Users can update messages"
ON public.messages FOR UPDATE
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);
