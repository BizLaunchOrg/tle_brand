-- Table for storing saved shipping addresses per user.
-- Each user can have multiple addresses (e.g., Home, Work).

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null, -- Label for the address (e.g. "Home", "Office")
  full_name text not null,
  phone text not null,
  street text not null,
  landmark text,
  city text not null,
  state text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_addresses_user_id_idx on public.user_addresses (user_id);

alter table public.user_addresses enable row level security;

drop policy if exists "user_addresses_select_own" on public.user_addresses;
drop policy if exists "user_addresses_insert_own" on public.user_addresses;
drop policy if exists "user_addresses_update_own" on public.user_addresses;
drop policy if exists "user_addresses_delete_own" on public.user_addresses;

create policy "user_addresses_select_own"
  on public.user_addresses for select
  using (auth.uid() = user_id);

create policy "user_addresses_insert_own"
  on public.user_addresses for insert
  with check (auth.uid() = user_id);

create policy "user_addresses_update_own"
  on public.user_addresses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_addresses_delete_own"
  on public.user_addresses for delete
  using (auth.uid() = user_id);
