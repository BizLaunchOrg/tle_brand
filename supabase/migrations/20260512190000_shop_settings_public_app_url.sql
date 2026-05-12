-- Public HTTPS origin for admin push deep links (notification tap opens /admin/...).
-- Edge Function admin-push-hook reads this when PUBLIC_APP_URL secret is unset.
alter table public.shop_settings
  add column if not exists public_app_url text;

comment on column public.shop_settings.public_app_url is
  'Storefront origin only, e.g. https://www.tlebrand.com — no path. Used by admin-push-hook; trailing slash is stripped in app.';
