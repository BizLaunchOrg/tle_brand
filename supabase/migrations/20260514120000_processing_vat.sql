-- Optional VAT on the flat processing fee: rate in shop_settings; VAT amount stored per order.

alter table public.shop_settings
  add column if not exists processing_vat_percent numeric(6, 3) not null default 0;

comment on column public.shop_settings.processing_vat_percent is
  'Percent VAT applied to processing_fee_ngn only (0–100). Whole-naira VAT rounded on checkout.';

alter table public.orders
  add column if not exists processing_vat_ngn bigint not null default 0;

comment on column public.orders.processing_vat_ngn is
  'VAT on processing at checkout; subtotal + delivery + processing_ngn + this = total_ngn.';
