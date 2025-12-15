
-- Enable admins to update messages (for read receipts)
CREATE POLICY "Admins can update support messages"
ON public.messages
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
        AND (c.participant1_id = '00000000-0000-0000-0000-000000000000' OR c.participant2_id = '00000000-0000-0000-0000-000000000000')
    )
    AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
        AND (c.participant1_id = '00000000-0000-0000-0000-000000000000' OR c.participant2_id = '00000000-0000-0000-0000-000000000000')
    )
    AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);
