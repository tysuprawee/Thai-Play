-- Create a conversations table to manage unique 1:1 chat rooms
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    participant1_id UUID REFERENCES auth.users(id) NOT NULL,
    participant2_id UUID REFERENCES auth.users(id) NOT NULL,
    last_message_preview TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Constraint to ensure unique conversation between two users
-- We enforce p1 < p2 logic in the application usually, but here we can add a unique index
-- Best practice: Always store the smaller UUID in participant1_id
CREATE UNIQUE INDEX IF NOT EXISTS unique_conversation_participants ON public.conversations 
    (LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id));

-- Add conversation_id to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id);

-- Add presence fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
-- We technically don't need is_online in DB if we calculate it from last_seen, but let's keep it simple.
-- Actually, let's just stick to last_seen.

-- Enable RLS for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" 
    ON public.conversations FOR SELECT 
    USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations" 
    ON public.conversations FOR INSERT 
    WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can update their conversations" 
    ON public.conversations FOR UPDATE
    USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Update realtime publication to include conversations (for last message updates)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles; -- For presence updates

-- Helper function to find or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
    p1 UUID;
    p2 UUID;
BEGIN
    -- Sort IDs to Ensure Consistency
    IF user1_id < user2_id THEN
        p1 := user1_id;
        p2 := user2_id;
    ELSE
        p1 := user2_id;
        p2 := user1_id;
    END IF;

    -- Check if exists
    SELECT id INTO conv_id
    FROM conversations
    WHERE participant1_id = p1 AND participant2_id = p2;

    -- If not exists, create
    IF conv_id IS NULL THEN
        INSERT INTO conversations (participant1_id, participant2_id)
        VALUES (p1, p2)
        RETURNING id INTO conv_id;
    END IF;

    RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
