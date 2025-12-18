-- Add views column if it doesn't exist
alter table public.listings 
add column if not exists views int default 0;

-- Function to safely increment view count
create or replace function public.increment_listing_view(listing_id uuid)
returns void as $$
begin
  update public.listings
  set views = views + 1
  where id = listing_id;
end;
$$ language plpgsql security definer;
