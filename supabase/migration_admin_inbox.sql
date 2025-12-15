-- Enable RLS on conversations if not already (assuming it is)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 1. Policies for CONVERSATIONS
-- Allow Admins to view ALL conversations involving the Support Bot
CREATE POLICY "Admins can view support conversations"
ON public.conversations
FOR SELECT
USING (
    (participant1_id = '00000000-0000-0000-0000-000000000000' OR participant2_id = '00000000-0000-0000-0000-000000000000')
    AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- 2. Policies for MESSAGES
-- Allow Admins to view messages in Support conversations
CREATE POLICY "Admins can view support messages"
ON public.messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
        AND (c.participant1_id = '00000000-0000-0000-0000-000000000000' OR c.participant2_id = '00000000-0000-0000-0000-000000000000')
    )
    AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- Allow Admins to insert messages into Support conversations (although we might use Server Action for this to masquerade as Support)
-- If sending AS THE ADMIN personally:
CREATE POLICY "Admins can reply in support chats"
ON public.messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
        AND (c.participant1_id = '00000000-0000-0000-0000-000000000000' OR c.participant2_id = '00000000-0000-0000-0000-000000000000')
    )
    AND
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);
