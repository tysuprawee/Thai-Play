-- 1. Create the avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Policy: Public Read Access
create policy "Avatar Public Access"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- 3. Policy: Authenticated Upload
create policy "Avatar Authenticated Upload"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
);

-- 4. Policy: User can update/delete their own avatars
create policy "Avatar User Update Own"
on storage.objects for update
using (
  bucket_id = 'avatars' 
  and auth.uid() = owner
);

create policy "Avatar User Delete Own"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.uid() = owner
);
