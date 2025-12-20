-- Ensure Support User Exists in Auth.UseRs (requires bypassing RLS/Auth constraints usually, but in SQL Editor or migration tool it runs as postgres)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'support@thaiplay.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0123456789', -- Dummy hash
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Ensure Support User Exists in Public.Profiles
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
    role = 'admin';
