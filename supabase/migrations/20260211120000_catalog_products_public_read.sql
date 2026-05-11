-- Allow the storefront (anon key) to read staged catalog so /shop can load from Supabase.
-- Inserts/updates/deletes remain admin-only (existing policies).
--
-- Prerequisite: `20260209180000_admin_catalog_and_order_updates.sql` must run first (creates `catalog_products`).
-- If you see "relation catalog_products does not exist", apply that migration (or run `supabase db push` from repo root).

do $$
begin
  if to_regclass('public.catalog_products') is null then
    raise exception
      'public.catalog_products is missing. Apply migration 20260209180000_admin_catalog_and_order_updates.sql first, then rerun this file.';
  end if;
end $$;

drop policy if exists "catalog_products_select_public" on public.catalog_products;

create policy "catalog_products_select_public"
  on public.catalog_products
  for select
  to anon, authenticated
  using (true);
