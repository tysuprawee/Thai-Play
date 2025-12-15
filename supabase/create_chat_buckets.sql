-- Create 'chat-attachments' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Allow public access to 'chat-attachments' (Just to be safe for this demo)
-- Ideally you restrict this, but for now we want valid uploads.
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'chat-attachments' );

create policy "Auth Upload"
  on storage.objects for insert
  with check ( bucket_id = 'chat-attachments' and auth.role() = 'authenticated' );

-- Also ensure 'listing-images' exists just in case
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;
