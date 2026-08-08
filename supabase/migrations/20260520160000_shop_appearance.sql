-- Storefront appearance (hero banners, exclusive offer, brand colors).
-- Single JSON blob on shop_settings so public SELECT already covers it.

alter table public.shop_settings
  add column if not exists appearance jsonb;

comment on column public.shop_settings.appearance is
  'Hero banners (1–4), exclusive offer copy/toggle, and brand color hexes for the storefront.';
