-- 1. Listing Media: Public Read Access
create policy "Media are viewable by everyone"
  on public.listing_media for select
  using ( true );

-- 2. Listing Media: Insert (Only Seller of the listing)
create policy "Sellers can add media to their listings"
  on public.listing_media for insert
  with check (
    exists (
      select 1 from public.listings
      where listings.id = listing_media.listing_id
      and listings.seller_id = auth.uid()
    )
  );

-- 3. Listing Media: Delete (Only Seller of the listing)
create policy "Sellers can delete media from their listings"
  on public.listing_media for delete
  using (
    exists (
      select 1 from public.listings
      where listings.id = listing_media.listing_id
      and listings.seller_id = auth.uid()
    )
  );
