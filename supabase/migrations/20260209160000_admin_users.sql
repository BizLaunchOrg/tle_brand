-- Admin allowlist: users in this table (or JWT app_metadata.role = 'admin') can access /admin.
-- Grant admin in SQL Editor (replace email):
--   insert into public.admin_users (user_id)
--   select id from auth.users where lower(email) = lower('your@email.com')
--   on conflict (user_id) do nothing;
--
-- Optional (Dashboard → Authentication → Users): set User Metadata or Raw App Meta Data:
--   { "role": "admin" }

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Signed-in users may only read their own admin row (existence check for the gate).
create policy "admin_users_select_self"
  on public.admin_users for select
  using (auth.uid() = user_id);

-- No insert/update/delete for clients — manage rows in SQL Editor or service role only.

-- ---------------------------------------------------------------------------
-- Orders: admins may read all orders (in addition to owners).
-- ---------------------------------------------------------------------------
create policy "orders_select_admin"
  on public.orders for select
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );
