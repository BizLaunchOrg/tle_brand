-- Checkout: optional list of delivery / pickup locations with per-zone fee (₦).
-- When non-empty, customers pick a zone at checkout; fee comes from the zone.
-- When empty, legacy flat delivery_fee_ngn applies.

alter table public.shop_settings
  add column if not exists delivery_zones jsonb;

comment on column public.shop_settings.delivery_zones is
  'JSON array of {id,label,feeNgn,description?}. Empty [] uses delivery_fee_ngn only.';

-- One-time seed for existing stores (column was null).
update public.shop_settings
set delivery_zones = '[
  {"id":"pickup-lagos-island","label":"Pick up at Lagos Island","feeNgn":0,"description":"Harvesting Faith Ministries, off Adeniji Adele road, Lagos Island. Please contact 07062818542 after payment to confirm pick up."},
  {"id":"pickup-headquarters","label":"Pick up at Headquarters","feeNgn":0,"description":"Address: 16, Kadiri Street, Ikate Surulere. Please contact 07062818542 after payment to confirm pick up."},
  {"id":"lagos-mainland","label":"Lagos Mainland (except Surulere)","feeNgn":4000,"description":null},
  {"id":"surulere","label":"Surulere","feeNgn":3000,"description":null},
  {"id":"lagos-island","label":"Lagos Island","feeNgn":5000,"description":null}
]'::jsonb
where id = 'default'
  and delivery_zones is null;
