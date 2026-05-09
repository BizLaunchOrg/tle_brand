-- Cart + favorites per authenticated user (sync across devices).
-- Orders with shipping snapshot (checkout).

-- ---------------------------------------------------------------------------
-- user_cart_items
-- ---------------------------------------------------------------------------
create table if not exists public.user_cart_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_slug text not null,
  variant_id text not null default '',
  quantity integer not null,
  updated_at timestamptz not null default now(),
  constraint user_cart_items_pkey primary key (user_id, product_slug, variant_id),
  constraint user_cart_items_qty_check check (quantity > 0 and quantity <= 999)
);

create index if not exists user_cart_items_user_id_idx on public.user_cart_items (user_id);

alter table public.user_cart_items enable row level security;

create policy "user_cart_items_select_own"
  on public.user_cart_items for select
  using (auth.uid() = user_id);

create policy "user_cart_items_insert_own"
  on public.user_cart_items for insert
  with check (auth.uid() = user_id);

create policy "user_cart_items_update_own"
  on public.user_cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_cart_items_delete_own"
  on public.user_cart_items for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_favorites
-- ---------------------------------------------------------------------------
create table if not exists public.user_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_slug text not null,
  created_at timestamptz not null default now(),
  constraint user_favorites_pkey primary key (user_id, product_slug)
);

create index if not exists user_favorites_user_id_idx on public.user_favorites (user_id);

alter table public.user_favorites enable row level security;

create policy "user_favorites_select_own"
  on public.user_favorites for select
  using (auth.uid() = user_id);

create policy "user_favorites_insert_own"
  on public.user_favorites for insert
  with check (auth.uid() = user_id);

create policy "user_favorites_delete_own"
  on public.user_favorites for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- orders (checkout — shipping + line snapshot)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  shipping jsonb not null,
  line_items jsonb not null,
  subtotal_ngn bigint not null check (subtotal_ngn >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

create policy "orders_select_own"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "orders_insert_own"
  on public.orders for insert
  with check (auth.uid() = user_id);
