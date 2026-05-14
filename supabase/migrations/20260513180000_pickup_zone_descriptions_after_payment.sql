-- Align pickup zone copy with checkout: contact after payment to confirm pick up.
update public.shop_settings
set delivery_zones = (
  select jsonb_agg(
    case
      when elem->>'id' = 'pickup-headquarters' then
        jsonb_set(
          elem,
          '{description}',
          to_jsonb(
            'Address: 16, Kadiri Street, Ikate Surulere. Please contact 07062818542 after payment to confirm pick up.'::text
          )
        )
      when elem->>'id' = 'pickup-lagos-island' then
        jsonb_set(
          elem,
          '{description}',
          to_jsonb(
            'Harvesting Faith Ministries, off Adeniji Adele road, Lagos Island. Please contact 07062818542 after payment to confirm pick up.'::text
          )
        )
      else elem
    end
  )
  from jsonb_array_elements(delivery_zones) as elem
)
where id = 'default'
  and delivery_zones is not null
  and jsonb_typeof(delivery_zones) = 'array'
  and jsonb_array_length(delivery_zones) > 0;
