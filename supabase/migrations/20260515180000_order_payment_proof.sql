-- Checkout payment screenshot (transfer proof) stored before order insert.

alter table public.orders
  add column if not exists payment_proof_storage_path text;

comment on column public.orders.payment_proof_storage_path is
  'Object path inside bucket order-payment-proofs (first segment = order id).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-payment-proofs',
  'order-payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "order_payment_proofs_insert_anon" on storage.objects;
drop policy if exists "order_payment_proofs_insert_authenticated" on storage.objects;
drop policy if exists "order_payment_proofs_admin_select" on storage.objects;

create policy "order_payment_proofs_insert_anon"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'order-payment-proofs'
    and split_part(name, '/', 1)
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and split_part(name, '/', 2) <> ''
  );

create policy "order_payment_proofs_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'order-payment-proofs'
    and split_part(name, '/', 1)
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and split_part(name, '/', 2) <> ''
  );

create policy "order_payment_proofs_admin_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'order-payment-proofs'
    and exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );
