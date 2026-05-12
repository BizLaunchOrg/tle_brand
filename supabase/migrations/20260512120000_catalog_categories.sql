-- Preset shop categories for admin picklists (optional; products still store `cat` on payload).

create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists catalog_categories_name_lower_idx on public.catalog_categories (lower(trim(name)));

alter table public.catalog_categories enable row level security;

create policy "catalog_categories_select_admin"
  on public.catalog_categories for select
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "catalog_categories_insert_admin"
  on public.catalog_categories for insert
  with check (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "catalog_categories_delete_admin"
  on public.catalog_categories for delete
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );
