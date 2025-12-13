-- 1. PROFILES: Allow admins to view all profiles (already public, but good to be explicit for updates)
-- Assuming admin check is done via role column

-- 2. LISTINGS: Allow admins to delete any listing
create policy "Admins can delete any listing"
  on public.listings for delete
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- 3. ORDERS: Allow admins to view all orders
create policy "Admins can view all orders"
  on public.orders for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- 4. ORDERS: Allow admins to update all orders
create policy "Admins can update all orders"
  on public.orders for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- 5. MESSAGES: Allow admins to view all messages
create policy "Admins can view all messages"
  on public.order_messages for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
