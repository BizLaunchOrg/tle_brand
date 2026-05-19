-- Reset shop operational data (orders, bookings, carts) so admin dashboards feel empty.
-- Run in Supabase Dashboard → SQL Editor (uses postgres role; bypasses RLS).
--
-- Payment proof files cannot be deleted here (Supabase blocks direct storage SQL).
-- After this script, run either:
--   npm run reset:operational
-- or empty buckets in Dashboard → Storage:
--   order-payment-proofs, makeup-booking-payment-proofs
--
-- KEEPS: catalog_products, catalog_categories, shop_settings, admin_users,
--         makeup_availability_*, product-media bucket, auth users.

begin;

truncate table public.orders;
truncate table public.makeup_bookings;
truncate table public.user_cart_items;
truncate table public.user_favorites;
truncate table public.user_addresses;
truncate table public.push_subscriptions;

commit;

-- ---------------------------------------------------------------------------
-- OPTIONAL — remove all customer sign-in accounts (not admins in admin_users)
-- ---------------------------------------------------------------------------
-- delete from auth.users
-- where id not in (select user_id from public.admin_users);
