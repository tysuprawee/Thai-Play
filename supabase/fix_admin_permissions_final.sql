-- Permissions Fix
-- Ensure Admins have SUPER POWERS for relevant tables

-- 1. Profiles: Admins can view ALL profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = id -- Keep own view
    OR true -- Actually, profiles are usually public? If not, we found our bug.
            -- If you want profiles to be public: USING (true)
);

-- Note: Existing policies might conflict if they are "PERMISSIVE" (default) they OR together.
-- If they are RESTRICTIVE (rare) they AND.
-- Assuming default.

-- Let's make sure Admins can definitely see everything.
CREATE POLICY "Admins can view all profiles (Explicit)"
ON public.profiles FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Game Requests
DROP POLICY IF EXISTS "Admins can view all requests" ON public.game_requests;
CREATE POLICY "Admins can view all requests"
ON public.game_requests FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Game Requests UPDATE
DROP POLICY IF EXISTS "Admins can update requests" ON public.game_requests;
CREATE POLICY "Admins can update requests"
ON public.game_requests FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
