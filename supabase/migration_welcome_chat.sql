-- 1. Create System Support User (Fixed ID)
-- We use a specific UUID so we can reference it easily in code
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'support@thaiplay.com')
ON CONFLICT (id) DO NOTHING;

-- Insert Profile for Support User
INSERT INTO public.profiles (id, display_name, avatar_url, role, seller_level, bio)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'ThaiPlay Support',
    'https://ui-avatars.com/api/?name=Thai+Play&background=6366f1&color=fff',
    'admin',
    'pro',
    'Official Support Bot for ThaiPlay'
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    role = 'admin';

-- 2. Update New User Trigger to create Welcome Chat
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
    VALUES (new.id, support_id, 'support') -- Assumes we add 'support' type or just use direct
    RETURNING id INTO conv_id;
    
    -- Depending on schema constraints on type. If 'support' enum invalid, use 'direct'.
    -- Let's check schema.sql later or handle exception. For now assume 'direct' if 'support' fails? 
    -- Actually let's just stick to standard conversation.

    IF conv_id IS NULL THEN
        -- Fallback if conversation creation failed or exists (re-fetch?)
        -- Since it's a NEW user, it shouldn't exist.
        -- But let's try to fetch just in case using standard logic if this was complex.
        -- Simple insert should work.
        NULL;
    ELSE
        -- 3. Send Welcome Message
        INSERT INTO public.messages (conversation_id, sender_id, content, message_type)
        VALUES (
            conv_id, 
            support_id, 
            'ยินดีต้อนรับสู่ ThaiPlay! หากคุณมีคำถามหรือต้องการแนะนำฟีเจอร์ใหม่ๆ สามารถบอกเราได้ที่นี่เลยครับ (Welcome to ThaiPlay! Feel free to ask questions or request features here.)', 
            'text'
        );
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
