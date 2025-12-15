-- 1. Fix the Trigger Function for FUTURE users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    support_id uuid := '00000000-0000-0000-0000-000000000000';
    conv_id uuid;
BEGIN
    -- 1. Create Profile
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

    -- 2. Create Conversation with Support
    INSERT INTO public.conversations (participant1_id, participant2_id, type)
    VALUES (new.id, support_id, 'direct')
    RETURNING id INTO conv_id;

    -- 3. Send Welcome Message
    IF conv_id IS NOT NULL THEN
        INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content, message_type)
        VALUES (
            conv_id, 
            support_id, 
            new.id,  -- Added receiver_id
            'ยินดีต้อนรับสู่ ThaiPlay! หากคุณมีคำถามหรือต้องการแนะนำฟีเจอร์ใหม่ๆ สามารถบอกเราได้ที่นี่เลยครับ (Welcome to ThaiPlay! Feel free to ask questions or request features here.)', 
            'text'
        );
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Run Backfill for EXISTING users
DO $$
DECLARE
    support_id uuid := '00000000-0000-0000-0000-000000000000';
    user_rec record;
    conv_id uuid;
BEGIN
    -- Loop through all users who are NOT support
    FOR user_rec IN SELECT id, display_name FROM public.profiles WHERE id != support_id
    LOOP
        -- Check if conversation exists
        IF NOT EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE (participant1_id = user_rec.id AND participant2_id = support_id)
               OR (participant1_id = support_id AND participant2_id = user_rec.id)
        ) THEN
            -- Create Conversation
            INSERT INTO public.conversations (participant1_id, participant2_id, type)
            VALUES (user_rec.id, support_id, 'direct')
            RETURNING id INTO conv_id;

            -- Create Message
            INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content, message_type)
            VALUES (
                conv_id,
                support_id,
                user_rec.id, -- Added receiver_id
                'ยินดีต้อนรับสู่ ThaiPlay! หากคุณมีคำถามหรือต้องการแนะนำฟีเจอร์ใหม่ๆ สามารถบอกเราได้ที่นี่เลยครับ (Welcome to ThaiPlay! Feel free to ask questions or request features here.)',
                'text'
            );
            
            RAISE NOTICE 'Created chat for user: %', user_rec.display_name;
        ELSE
            RAISE NOTICE 'Chat already exists for user: %', user_rec.display_name;
        END IF;
    END LOOP;
END $$;
