-- Anonymous storefront visitors: one row per device (visitor_key) per calendar day (Africa/Lagos).
-- Count rows in a date range for unique visitors; sum(page_views) for total views.

create table if not exists public.store_visitor_days (
  visitor_key uuid not null,
  visit_date date not null,
  page_views integer not null default 1 check (page_views > 0),
  last_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (visitor_key, visit_date)
);

create index if not exists store_visitor_days_visit_date_idx
  on public.store_visitor_days (visit_date desc);

alter table public.store_visitor_days enable row level security;

create policy "store_visitor_days_admin_select"
  on public.store_visitor_days for select
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

-- Clients call this (not direct table insert). Same visitor_key + day = one unique visitor.
create or replace function public.record_store_visit(
  p_visitor_key uuid,
  p_path text default '/'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (timezone('Africa/Lagos', now()))::date;
  safe_path text := left(coalesce(nullif(trim(p_path), ''), '/'), 500);
begin
  if p_visitor_key is null then
    return;
  end if;

  insert into public.store_visitor_days (visitor_key, visit_date, page_views, last_path)
  values (p_visitor_key, d, 1, safe_path)
  on conflict (visitor_key, visit_date)
  do update set
    page_views = public.store_visitor_days.page_views + 1,
    last_path = excluded.last_path,
    updated_at = now();
end;
$$;

revoke all on function public.record_store_visit(uuid, text) from public;
grant execute on function public.record_store_visit(uuid, text) to anon, authenticated;
