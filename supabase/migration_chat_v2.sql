-- Add hidden_for column to conversations for soft deletion
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS hidden_for UUID[] DEFAULT '{}';

-- Add media_url and type to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text'; -- 'text' or 'image'
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Storage Bucket for Chat Attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage
-- Use distinct names to avoid "policy already exists" error
CREATE POLICY "Public Access Chat Attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
CREATE POLICY "Auth Upload Chat Attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');
