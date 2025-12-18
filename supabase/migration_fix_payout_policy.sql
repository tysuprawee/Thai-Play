-- Allow Admins to update payouts (for approval/rejection)
create policy "Admins can update payouts"
  on public.payouts for update
  using ( 
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Also allow "Exeria2142" and "suprawee2929" as hardcoded admins just in case role isn't set
create policy "Hardcoded Admins can update payouts"
  on public.payouts for update
  using ( 
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.display_name in ('Exeria2142', 'suprawee2929')
    )
  );

-- Ensure categories have a default fee if null
update public.categories set fee_percent = 5.00 where fee_percent is null;
