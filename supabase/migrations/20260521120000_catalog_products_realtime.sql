-- Enable Realtime so the storefront can refresh when admin adds/edits/removes products.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'catalog_products'
  ) then
    alter publication supabase_realtime add table public.catalog_products;
  end if;
end $$;
