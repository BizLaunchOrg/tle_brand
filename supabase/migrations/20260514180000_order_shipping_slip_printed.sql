-- Admin workflow: record when a packing / shipping slip was confirmed printed (re-print allowed; timestamp = last confirmation).

alter table public.orders
  add column if not exists shipping_slip_printed_at timestamptz null;

comment on column public.orders.shipping_slip_printed_at is
  'Set from admin when packing slip is confirmed printed; may be updated on each confirmation.';
