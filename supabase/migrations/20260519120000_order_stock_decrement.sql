-- Decrement catalog payload stock when an order is inserted (checkout + offline sales).
-- Sets stockDepletedAt when quantity reaches 0; does not set manualStockZero.

create or replace function public.decrement_catalog_line_stock(
  p_slug text,
  p_variant_id text,
  p_qty int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row catalog_products%rowtype;
  v_payload jsonb;
  v_opts jsonb;
  v_opt jsonb;
  v_i int;
  v_len int;
  v_stock int;
  v_now text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  v_any_left boolean := false;
begin
  if p_slug is null or trim(p_slug) = '' or coalesce(p_qty, 0) < 1 then
    return;
  end if;

  select * into v_row from public.catalog_products where slug = trim(p_slug) for update;
  if not found then
    return;
  end if;

  v_payload := v_row.payload;
  if coalesce(v_payload->>'stockUnlimited', 'false') = 'true' then
    return;
  end if;

  -- Variant-level stock
  if p_variant_id is not null and trim(p_variant_id) <> '' and jsonb_typeof(v_payload->'colorOptions') = 'array' then
    v_opts := v_payload->'colorOptions';
    v_len := jsonb_array_length(v_opts);
    for v_i in 0 .. v_len - 1 loop
      v_opt := v_opts->v_i;
      if coalesce(v_opt->>'id', '') <> trim(p_variant_id) then
        continue;
      end if;
      if v_opt ? 'stock' and (v_opt->>'stock') ~ '^-?\d+$' then
        v_stock := greatest(0, (v_opt->>'stock')::int - p_qty);
        v_opt := jsonb_set(v_opt, '{stock}', to_jsonb(v_stock));
        if v_stock = 0 then
          v_opt := jsonb_set(v_opt, '{stockDepletedAt}', to_jsonb(v_now));
          v_opt := v_opt - 'manualStockZero';
        end if;
        v_opts := jsonb_set(v_opts, array[v_i::text], v_opt);
        v_payload := jsonb_set(v_payload, '{colorOptions}', v_opts);
        v_payload := v_payload - 'manualStockZero';
        update public.catalog_products
        set payload = v_payload, updated_at = now()
        where id = v_row.id;
        return;
      end if;
    end loop;
  end if;

  -- Product-level stock
  if v_payload ? 'stock' and (v_payload->>'stock') ~ '^-?\d+$' then
    v_stock := greatest(0, (v_payload->>'stock')::int - p_qty);
    v_payload := jsonb_set(v_payload, '{stock}', to_jsonb(v_stock));
    if v_stock = 0 then
      v_payload := jsonb_set(v_payload, '{stockDepletedAt}', to_jsonb(v_now));
      v_payload := v_payload - 'manualStockZero';
    end if;
    update public.catalog_products
    set payload = v_payload, updated_at = now()
    where id = v_row.id;
  end if;
end;
$$;

create or replace function public.trg_orders_decrement_catalog_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line jsonb;
  v_slug text;
  v_variant text;
  v_qty int;
begin
  if jsonb_typeof(new.line_items) <> 'array' then
    return new;
  end if;

  for v_line in select * from jsonb_array_elements(new.line_items) loop
    v_slug := coalesce(nullif(trim(v_line->>'slug'), ''), nullif(trim(v_line->>'id'), ''));
    v_variant := nullif(trim(v_line->>'variantId'), '');
    v_qty := greatest(1, coalesce((v_line->>'quantity')::int, 1));
    perform public.decrement_catalog_line_stock(v_slug, v_variant, v_qty);
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_decrement_catalog_stock on public.orders;

create trigger orders_decrement_catalog_stock
  after insert on public.orders
  for each row
  execute function public.trg_orders_decrement_catalog_stock();
