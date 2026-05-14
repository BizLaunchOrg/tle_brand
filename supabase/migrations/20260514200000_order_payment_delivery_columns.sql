-- Split payment vs delivery for admin (checkout stays paid + pending delivery by default).

alter table public.orders
  add column if not exists payment_status text;

alter table public.orders
  add column if not exists delivery_status text;

update public.orders
set
  payment_status = case
    when lower(trim(coalesce(status, ''))) in ('cancelled', 'awaiting_payment') then 'unpaid'
    when lower(trim(coalesce(status, ''))) = 'pending' then 'unpaid'
    else 'paid'
  end,
  delivery_status = case
    when lower(trim(coalesce(status, ''))) in ('delivered', 'completed', 'fulfilled') then 'delivered'
    when lower(trim(coalesce(status, ''))) in ('processing', 'shipped') then 'processing'
    else 'pending'
  end
where payment_status is null or delivery_status is null;

alter table public.orders
  alter column payment_status set default 'paid',
  alter column payment_status set not null;

alter table public.orders
  alter column delivery_status set default 'pending',
  alter column delivery_status set not null;

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('paid', 'unpaid'));

alter table public.orders drop constraint if exists orders_delivery_status_check;
alter table public.orders
  add constraint orders_delivery_status_check
  check (delivery_status in ('pending', 'processing', 'delivered'));
