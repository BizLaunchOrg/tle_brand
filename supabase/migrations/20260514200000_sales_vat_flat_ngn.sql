-- Fixed whole-naira VAT on products (once per order). Amount still stored on orders as sales_vat_ngn.

alter table public.shop_settings
  add column if not exists sales_vat_flat_ngn bigint not null default 0;

comment on column public.shop_settings.sales_vat_flat_ngn is
  'Whole naira: VAT on goods added once per order (not a percent). Copied to orders.sales_vat_ngn at checkout.';
