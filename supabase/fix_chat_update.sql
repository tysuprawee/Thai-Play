-- Allow Users to UPDATE conversations they are part of
-- This is required for "Delete Chat" (which updates hidden_for) and updating last_message_preview

-- Check if policy exists (names might vary, so we'll just try to create a standard one or drop if exists)
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;

CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
USING (
    (auth.uid() = participant1_id) OR (auth.uid() = participant2_id)
);

-- Note: We generally trust the Application Layer (Server Actions) to validate WHAT they update (e.g. hidden_for).
-- But RLS ensures they can only touch their own rows.
