-- Create payouts table
create table public.payouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  amount decimal(10,2) not null check (amount > 0),
  fee_amount decimal(10,2) default 0, -- Future proofing for withdrawal fees
  net_amount decimal(10,2) not null, -- amount - fee
  status text default 'pending' check (status in ('pending', 'completed', 'rejected')),
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  note text, -- Admin note or rejection reason
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

-- Enable RLS
alter table public.payouts enable row level security;

-- Policies

-- Users can view their own payouts
create policy "Users can view own payouts"
  on public.payouts for select
  using ( auth.uid() = user_id );

-- Users can insert their own payout requests (pending only)
create policy "Users can request payouts"
  on public.payouts for insert
  with check ( auth.uid() = user_id and status = 'pending' );

-- Only Admins can update payouts (approve/reject) - We will assume an admin role check or separate logic later, 
-- but for now, let's keep it restricted. Since we don't have a robust admin role RLS set up in all files yet, 
-- we will use the pattern where users cannot update their own layouts.
-- (If you have admin policies set up, add them here. For now, users just CREATE and READ).

-- Grant access to authenticated users
grant select, insert on public.payouts to authenticated;
