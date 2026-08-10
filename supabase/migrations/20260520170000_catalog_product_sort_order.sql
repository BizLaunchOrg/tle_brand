-- Manual shelf order for catalog products (lower sort_order = shown first).

alter table public.catalog_products
  add column if not exists sort_order integer not null default 0;

create index if not exists catalog_products_sort_order_idx
  on public.catalog_products (sort_order asc, updated_at desc);

-- Preserve current "newest updated first" order as the initial shelf order.
with ranked as (
  select id, (row_number() over (order by updated_at desc) - 1)::integer as rn
  from public.catalog_products
)
update public.catalog_products cp
set sort_order = ranked.rn
from ranked
where cp.id = ranked.id;
