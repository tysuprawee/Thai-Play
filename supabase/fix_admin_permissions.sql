-- 1. Update User Roles
-- Sets 'suprawee2929' and 'Exeria2142' to admin role
UPDATE public.profiles
SET role = 'admin'
WHERE display_name IN ('Exeria2142', 'suprawee2929');

-- 2. Create Admin Access Policies (Drop first to avoid conflicts)

-- PROFILES
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- LISTINGS
DROP POLICY IF EXISTS "Admins can update any listing" ON public.listings;
CREATE POLICY "Admins can update any listing"
  ON public.listings FOR UPDATE
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can delete any listing" ON public.listings;
CREATE POLICY "Admins can delete any listing"
  ON public.listings FOR DELETE
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- ORDERS
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- ORDER MESSAGES
DROP POLICY IF EXISTS "Admins can view all messages" ON public.order_messages;
CREATE POLICY "Admins can view all messages"
  ON public.order_messages FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- REVIEWS
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );
