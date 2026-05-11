-- Recurring session slots: same time on multiple weekdays in one row (weekdays int[]).
-- Public can read active rules for the booking calendar; only admins manage rows.

create table if not exists public.makeup_availability_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  active boolean not null default true,
  weekdays integer[] not null,
  time_slot text not null,
  constraint makeup_availability_rules_weekdays_nonempty check (coalesce(cardinality(weekdays), 0) >= 1),
  constraint makeup_availability_rules_weekday_range check (
    weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::integer[]
  )
);

create index if not exists makeup_availability_rules_active_idx
  on public.makeup_availability_rules (active);

alter table public.makeup_availability_rules enable row level security;

-- Booking site: only active rules (no auth required).
create policy "makeup_availability_rules_select_public_active"
  on public.makeup_availability_rules for select
  using (active = true);

-- Admins: read all rules (including inactive) for editing.
create policy "makeup_availability_rules_select_admin"
  on public.makeup_availability_rules for select
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

create policy "makeup_availability_rules_insert_admin"
  on public.makeup_availability_rules for insert
  with check (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

create policy "makeup_availability_rules_update_admin"
  on public.makeup_availability_rules for update
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

create policy "makeup_availability_rules_delete_admin"
  on public.makeup_availability_rules for delete
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );
