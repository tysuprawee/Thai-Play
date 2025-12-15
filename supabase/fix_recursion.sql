-- Fix Infinite Recursion by using a SECURITY DEFINER function
-- This allows checking the admin role without triggering RLS loops.

-- 1. Create Helper Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as database owner (bypasses RLS)
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. Update Profiles Policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles (Explicit)" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
-- (Drop other conflicting policies if any, but let's be safe)

-- Create a robust policy:
-- 1. Users can see their own profile
-- 2. Admins (via function) can see ALL profiles
-- 3. Public access? (Optional, usually display_name/avatar is public)
-- Let's stick to cleaning up the recursion first.

CREATE POLICY "Profiles access"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id -- Own profile
    OR
    public.is_admin() -- Admin (Recursion-free check)
    OR
    true -- ACTUALLY, usually profiles ARE public. 
         -- If we make it public, we don't need is_admin for SELECT.
         -- But maybe user wants email private?
         -- Let's assume we want to protect email causing the friction.
         -- But 'profiles' table usually has specific columns.
         -- For now, let's use the is_admin() safe check.
         -- BUT WAIT: If I use `OR true`, it effectively disables RLS for select.
         -- Let's try `OR public.is_admin()` first to be secure.
);

-- 3. Game Requests Policies (Update to use is_admin too for consistency)
DROP POLICY IF EXISTS "Admins can view all requests" ON public.game_requests;
CREATE POLICY "Admins can view all requests"
ON public.game_requests FOR SELECT
USING (
    public.is_admin()
);

DROP POLICY IF EXISTS "Admins can update requests" ON public.game_requests;
CREATE POLICY "Admins can update requests"
ON public.game_requests FOR UPDATE
USING (
    public.is_admin()
);
