-- Add is_online_hidden to profiles
alter table public.profiles 
add column if not exists is_online_hidden boolean default false;

-- Update the view/policies if necessary (users can always update their own profile, so existing policy should cover it)
-- "Users can update own profile" policy exists.
