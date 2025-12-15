-- Game Requests Table
CREATE TABLE IF NOT EXISTS public.game_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id uuid REFERENCES public.profiles(id) NOT NULL,
    game_name text NOT NULL,
    description text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own requests" ON public.game_requests
    FOR SELECT USING (auth.uid() = requester_id);

-- Users can create requests
CREATE POLICY "Users can create requests" ON public.game_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Admins can view all (We will rely on role='admin' check in policy)
CREATE POLICY "Admins can view all requests" ON public.game_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update status
CREATE POLICY "Admins can update requests" ON public.game_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
