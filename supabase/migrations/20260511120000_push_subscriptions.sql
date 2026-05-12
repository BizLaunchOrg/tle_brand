-- Web Push subscriptions for admin devices (service worker push).
-- After migrating: deploy Edge Function admin-push-hook, set secrets, add VITE_VAPID_PUBLIC_KEY to the frontend host,
-- then in Supabase Dashboard → Database → Webhooks create two webhooks (INSERT only):
--   public.orders        → POST https://<project-ref>.supabase.co/functions/v1/admin-push-hook
--   public.makeup_bookings → same URL
-- Header on each: x-webhook-secret = same value as Edge secret WEBHOOK_SECRET.
-- Push link base URL: save in Admin → Account (shop_settings.public_app_url) or set Edge secret PUBLIC_APP_URL.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create or replace function public.push_subscriptions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.push_subscriptions_touch_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_admin_self"
  on public.push_subscriptions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
