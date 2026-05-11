-- Makeup / session bookings from the public booking form (landing + makeup page).
-- Admins review in dashboard; anyone may insert (RLS); only admins read/update.

create table if not exists public.makeup_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  source text not null default 'landing',
  service_name text not null,
  service_price text not null,
  preferred_date text not null default '',
  preferred_time text not null default '',
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  location_venue text not null default '',
  skin_type text not null default '',
  allergies text not null default '',
  notes text not null default ''
);

create index if not exists makeup_bookings_created_at_idx
  on public.makeup_bookings (created_at desc);

create index if not exists makeup_bookings_status_idx
  on public.makeup_bookings (status);

alter table public.makeup_bookings enable row level security;

create policy "makeup_bookings_insert_public"
  on public.makeup_bookings for insert
  with check (true);

create policy "makeup_bookings_select_admin"
  on public.makeup_bookings for select
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

create policy "makeup_bookings_update_admin"
  on public.makeup_bookings for update
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );
