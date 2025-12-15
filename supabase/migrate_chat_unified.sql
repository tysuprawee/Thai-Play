-- 1. Add order_id to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id);

-- 2. Drop the old strict 1:1 constraint (We now allow multiple chats per pair if order_id differs)
DROP INDEX IF EXISTS unique_conversation_participants;

-- 3. Create new constraints
-- A. Main DM (order_id IS NULL) -> Only one per pair
CREATE UNIQUE INDEX IF NOT EXISTS unique_main_chat_participants ON public.conversations 
    (LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id))
    WHERE order_id IS NULL;

-- B. Order Chat (order_id IS NOT NULL) -> Only one per order per pair
CREATE UNIQUE INDEX IF NOT EXISTS unique_order_chat_participants ON public.conversations 
    (LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id), order_id)
    WHERE order_id IS NOT NULL;


-- 4. Update get_or_create_conversation function to support order context
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID, order_id_param UUID DEFAULT NULL)
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
    IF order_id_param IS NULL THEN
        SELECT id INTO conv_id
        FROM conversations
        WHERE participant1_id = p1 AND participant2_id = p2 AND order_id IS NULL;
    ELSE
        SELECT id INTO conv_id
        FROM conversations
        WHERE participant1_id = p1 AND participant2_id = p2 AND order_id = order_id_param;
    END IF;

    -- If not exists, create
    IF conv_id IS NULL THEN
        INSERT INTO conversations (participant1_id, participant2_id, order_id)
        VALUES (p1, p2, order_id_param)
        RETURNING id INTO conv_id;
    END IF;

    RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. RLS Updates (Ensure users can view conversations linked to their orders)
-- The existing policy "Users can view their own conversations" checks (auth.uid() = participant1_id OR auth.uid() = participant2_id)
-- This STILL HOLDS TRUE for order chats. The participants are still the user. 
-- So no RLS change needed for conversations! 

-- HOWEVER, strictly speaking, maybe we want to verify against the order? 
-- Nah, if I am p1 or p2, I should see it. Simpler is better.

