-- Allow Admins to INSERT/UPDATE/DELETE categories
-- Previously only SELECT was allowed (viewable by everyone)

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL -- INSERT/UPDATE/DELETE/SELECT
USING (
    public.is_admin() -- Using our security definer function
)
WITH CHECK (
    public.is_admin()
);

-- If is_admin() is not found (if user didn't run fix_recursion.sql), fallback:
/*
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
*/
-- But I trust is_admin() exists now. If not, this script will fail and warn them.
