-- RLS
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;

-- DROP Policies to be safe
DROP POLICY IF EXISTS "Users can view own requests" ON public.game_requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.game_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.game_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.game_requests;

-- Users can see their own requests
CREATE POLICY "Users can view own requests" ON public.game_requests
    FOR SELECT USING (auth.uid() = requester_id);

-- Users can create requests
CREATE POLICY "Users can create requests" ON public.game_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Admins can view all (using simple role check if possible, or broad select if using service role)
-- Note: 'role' in profiles might not be sync'd to auth.jwt() claims immediately.
-- safest is to query public.profiles.
CREATE POLICY "Admins can view all requests" ON public.game_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update requests" ON public.game_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
