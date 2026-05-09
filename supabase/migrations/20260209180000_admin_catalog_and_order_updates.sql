-- Staging catalog (admin-managed). Storefront still uses static PRODUCTS unless you wire this in later.
-- Admins: full CRUD. RLS mirrors admin_users pattern.

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_products_created_at_idx on public.catalog_products (created_at desc);

alter table public.catalog_products enable row level security;

create policy "catalog_products_select_admin"
  on public.catalog_products for select
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "catalog_products_insert_admin"
  on public.catalog_products for insert
  with check (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "catalog_products_update_admin"
  on public.catalog_products for update
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "catalog_products_delete_admin"
  on public.catalog_products for delete
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

-- Allow admins to update order status (e.g. pending → completed).
create policy "orders_update_admin"
  on public.orders for update
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );
