-- Payment receipt screenshots for makeup bookings (private bucket; admins use signed URLs).

alter table public.makeup_bookings
  add column if not exists payment_proof_storage_path text;

comment on column public.makeup_bookings.payment_proof_storage_path is
  'Object path inside bucket makeup-booking-payment-proofs (first segment = booking id).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'makeup-booking-payment-proofs',
  'makeup-booking-payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "makeup_booking_payment_proofs_insert_anon" on storage.objects;
drop policy if exists "makeup_booking_payment_proofs_insert_authenticated" on storage.objects;
drop policy if exists "makeup_booking_payment_proofs_admin_select" on storage.objects;

-- Public booking forms upload as anon or authenticated; first path segment must be a UUID (matches booking row id).
create policy "makeup_booking_payment_proofs_insert_anon"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'makeup-booking-payment-proofs'
    and split_part(name, '/', 1)
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and split_part(name, '/', 2) <> ''
  );

create policy "makeup_booking_payment_proofs_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'makeup-booking-payment-proofs'
    and split_part(name, '/', 1)
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and split_part(name, '/', 2) <> ''
  );

create policy "makeup_booking_payment_proofs_admin_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'makeup-booking-payment-proofs'
    and exists (
      select 1 from public.admin_users au
      where au.user_id = auth.uid()
    )
  );
