-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  display_name text unique,
  avatar_url text,
  bio text,
  languages text[] default '{th}',
  location text default 'Thailand',
  seller_level text default 'new', -- new, verified, pro
  status text default 'active', -- active, banned
  role text default 'user', -- user, admin
  response_time_hours int default 24,
  last_active_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. CATEGORIES
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name_th text not null,
  slug text unique not null,
  type text not null check (type in ('game', 'service', 'item', 'other')),
  icon text,
  fee_percent decimal(5,2) default 5.00,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. LISTINGS
create table public.listings (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles(id) not null,
  category_id uuid references public.categories(id) not null,
  title_th text not null,
  description_th text,  
  listing_type text not null check (listing_type in ('service', 'item', 'account')),
  price_min decimal(10,2) not null,
  price_max decimal(10,2),
  currency text default 'THB',
  status text default 'active' check (status in ('active', 'paused', 'closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. LISTING MEDIA
create table public.listing_media (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  media_url text not null,
  sort_order int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. ORDERS
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  listing_id uuid references public.listings(id) not null,
  status text default 'pending_payment' check (status in ('pending_payment', 'escrowed', 'delivered', 'completed', 'disputed', 'cancelled')),
  amount decimal(10,2) not null,
  fee_amount decimal(10,2) default 0,
  net_amount decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. ORDER MESSAGES
create table public.order_messages (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  message_th text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. REVIEWS
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) unique not null,
  reviewer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  rating int check (rating >= 1 and rating <= 5),
  comment_th text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS POLICIES
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.orders enable row level security;
alter table public.order_messages enable row level security;
alter table public.reviews enable row level security;

-- Profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Categories
create policy "Categories are viewable by everyone"
  on public.categories for select
  using ( true );

-- Listings
create policy "Listings are viewable by everyone"
  on public.listings for select
  using ( true );

create policy "Users can insert own listings"
  on public.listings for insert
  with check ( auth.uid() = seller_id );

create policy "Users can update own listings"
  on public.listings for update
  using ( auth.uid() = seller_id );

-- Orders
create policy "Users can view their own orders"
  on public.orders for select
  using ( auth.uid() = buyer_id or auth.uid() = seller_id );

create policy "Buyers can create orders"
  on public.orders for insert
  with check ( auth.uid() = buyer_id );

create policy "Buyers and Sellers can update orders"
  on public.orders for update
  using ( auth.uid() = buyer_id or auth.uid() = seller_id );

-- Messages
create policy "Users can view messages in their orders"
  on public.order_messages for select
  using ( exists (
    select 1 from public.orders
    where orders.id = order_messages.order_id
    and (orders.buyer_id = auth.uid() or orders.seller_id = auth.uid())
  ));

create policy "Users can send messages in their orders"
  on public.order_messages for insert
  with check ( exists (
    select 1 from public.orders
    where orders.id = order_messages.order_id
    and (orders.buyer_id = auth.uid() or orders.seller_id = auth.uid())
  ) and auth.uid() = sender_id );

-- Reviews
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using ( true );

create policy "Buyers can create reviews for completed orders"
  on public.reviews for insert
  with check ( auth.uid() = reviewer_id );

-- TRIGGER FOR NEW USER PROFILE
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA (Categories)
-- SEED DATA (Categories)
insert into public.categories (name_th, slug, type) values
('RoV', 'rov', 'game'),
('Valorant', 'valorant', 'game');
