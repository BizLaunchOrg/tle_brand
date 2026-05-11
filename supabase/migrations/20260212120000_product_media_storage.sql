-- Public bucket for product photos (URLs stored in catalog_products.payload).
-- Run in Supabase SQL editor or via CLI migrate.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_media_public_read" on storage.objects;
drop policy if exists "product_media_admin_insert" on storage.objects;
drop policy if exists "product_media_admin_update" on storage.objects;
drop policy if exists "product_media_admin_delete" on storage.objects;

-- Anyone can read (storefront + admin previews use public URLs).
create policy "product_media_public_read"
  on storage.objects for select
  using (bucket_id = 'product-media');

-- Admins only: upload / replace / delete objects in this bucket.
create policy "product_media_admin_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-media'
    and exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "product_media_admin_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-media'
    and exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  )
  with check (
    bucket_id = 'product-media'
    and exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "product_media_admin_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-media'
    and exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );
