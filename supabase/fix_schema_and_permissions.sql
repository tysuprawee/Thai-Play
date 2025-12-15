-- 1. Add Type to Conversations if missing
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'direct';

-- 2. Verify Game Requests Permissions (Idempotent)
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own requests" ON public.game_requests;
    DROP POLICY IF EXISTS "Users can create requests" ON public.game_requests;
    DROP POLICY IF EXISTS "Admins can view all requests" ON public.game_requests;
    DROP POLICY IF EXISTS "Admins can update requests" ON public.game_requests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own requests" ON public.game_requests FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Users can create requests" ON public.game_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Admins can view all requests" ON public.game_requests FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update requests" ON public.game_requests FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
