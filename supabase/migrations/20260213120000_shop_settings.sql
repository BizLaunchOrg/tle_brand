-- Store-wide checkout fees (flat ₦ amounts). Editable by admins in Account settings.

create table if not exists public.shop_settings (
  id text primary key default 'default' check (id = 'default'),
  delivery_fee_ngn integer not null default 4000,
  processing_fee_ngn integer not null default 1200,
  updated_at timestamptz not null default now()
);

insert into public.shop_settings (id, delivery_fee_ngn, processing_fee_ngn)
values ('default', 4000, 1200)
on conflict (id) do nothing;

alter table public.shop_settings enable row level security;

drop policy if exists "shop_settings_select_public" on public.shop_settings;
drop policy if exists "shop_settings_update_admin" on public.shop_settings;

-- Checkout (authenticated customers) and storefront need to read fees.
create policy "shop_settings_select_public"
  on public.shop_settings for select
  using (true);

-- Only allowlisted admins may change fees.
create policy "shop_settings_update_admin"
  on public.shop_settings for update to authenticated
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );
