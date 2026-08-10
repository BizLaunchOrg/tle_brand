-- Editable makeup & photoshoot menu (admin-managed).
-- Public SELECT on shop_settings already covers this column.

alter table public.shop_settings
  add column if not exists makeup_menu jsonb;

comment on column public.shop_settings.makeup_menu is
  'Makeup & photoshoot services/packages shown on makeup page and home booking.';
