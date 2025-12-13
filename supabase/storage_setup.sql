-- 1. Create the bucket
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- 2. Policy: Public Read Access
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'listing-images' );

-- 3. Policy: Authenticated Upload
create policy "Authenticated User Upload"
on storage.objects for insert
with check (
  bucket_id = 'listing-images'
  and auth.role() = 'authenticated'
);

-- 4. Policy: User can update/delete their own files
create policy "User Update Own Files"
on storage.objects for update
using (
  bucket_id = 'listing-images' 
  and auth.uid() = owner
);

create policy "User Delete Own Files"
on storage.objects for delete
using (
  bucket_id = 'listing-images'
  and auth.uid() = owner
);
