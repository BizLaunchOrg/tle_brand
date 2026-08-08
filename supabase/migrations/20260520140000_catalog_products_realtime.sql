-- Enable live catalog updates for the storefront (ShopProductsContext realtime channel).
-- Without this, customers only see new products after a full page refresh.

do $$
begin
  if to_regclass('public.catalog_products') is null then
    raise notice 'catalog_products missing — skip realtime publication';
    return;
  end if;

  begin
    alter publication supabase_realtime add table public.catalog_products;
  exception
    when duplicate_object then
      null; -- already in publication
    when undefined_object then
      raise notice 'supabase_realtime publication missing — enable Realtime in project settings';
  end;
end $$;
