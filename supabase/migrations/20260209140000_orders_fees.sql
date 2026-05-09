-- Optional fee breakdown on orders (run after initial orders migration).

alter table public.orders
  add column if not exists delivery_ngn bigint not null default 0;

alter table public.orders
  add column if not exists processing_ngn bigint not null default 0;

alter table public.orders
  add column if not exists total_ngn bigint not null default 0;
