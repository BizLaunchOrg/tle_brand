-- VAT on product subtotal (goods); rate in shop_settings; amount stored per order.

alter table public.shop_settings
  add column if not exists sales_vat_percent numeric(6, 3) not null default 0;

comment on column public.shop_settings.sales_vat_percent is
  'Percent VAT on cart subtotal (goods only), 0–100. Whole-naira amount stored on order as sales_vat_ngn.';

alter table public.orders
  add column if not exists sales_vat_ngn bigint not null default 0;

comment on column public.orders.sales_vat_ngn is
  'VAT on product subtotal at checkout; included in total_ngn.';
