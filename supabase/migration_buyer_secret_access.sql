-- Allow buyers to view secrets for their paid orders
create policy "Buyers can view secrets for paid orders"
  on "public"."listing_secrets"
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1 
      from orders
      where orders.listing_id = listing_secrets.listing_id
        and orders.buyer_id = auth.uid()
        and orders.status in ('escrowed', 'delivered', 'completed', 'disputed')
    )
  );
