-- Per-calendar-date overrides for makeup booking times.
-- If a row exists and closed = true → no times that day.
-- If closed = false and time_slots is non-empty → only those times (must be from canonical list in app).
-- If closed = false and time_slots is empty → inherit weekly rules from makeup_availability_rules (same as no row).

create table if not exists public.makeup_availability_calendar (
  on_date date primary key,
  closed boolean not null default false,
  time_slots text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists makeup_availability_calendar_on_date_idx
  on public.makeup_availability_calendar (on_date);

alter table public.makeup_availability_calendar enable row level security;

create policy "makeup_availability_calendar_select_public"
  on public.makeup_availability_calendar for select
  using (true);

create policy "makeup_availability_calendar_insert_admin"
  on public.makeup_availability_calendar for insert
  with check (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

create policy "makeup_availability_calendar_update_admin"
  on public.makeup_availability_calendar for update
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

create policy "makeup_availability_calendar_delete_admin"
  on public.makeup_availability_calendar for delete
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );
