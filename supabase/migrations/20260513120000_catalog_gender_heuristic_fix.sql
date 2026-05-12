-- Heuristic gender cleanup for scraped catalog rows (e.g. men's jewellery saved as "her").
-- Review in a staging DB first. Safe-guards: only touches rows currently gender = her, and skips
-- text that clearly references women/ladies/bridal.

update public.catalog_products
set
  payload = jsonb_set(payload, '{gender}', '"him"', true),
  updated_at = now()
where lower(coalesce(payload->>'gender', 'her')) = 'her'
  and not (
    lower(
      coalesce(payload->>'name', '')
        || ' '
        || coalesce(payload->>'cat', '')
        || ' '
        || coalesce(payload->>'alt', '')
        || ' '
        || coalesce(payload->>'description', '')
    ) ~ '(women|womens|ladies|lady|female|girl|mom|mother|bridal|wife|for her|her ring|she |hers)'
  )
  and (
    lower(trim(coalesce(payload->>'cat', ''))) in (
      'men',
      'mens',
      'male',
      'him',
      'gents',
      'men''s',
      'men''s jewelry',
      'mens jewelry',
      'men jewelry'
    )
    or lower(trim(coalesce(payload->>'cat', ''))) like 'men %'
    or lower(trim(coalesce(payload->>'cat', ''))) like 'men''s %'
    or lower(trim(coalesce(payload->>'cat', ''))) like 'mens %'
    or lower(trim(coalesce(payload->>'cat', ''))) like 'male %'
    or lower(
      coalesce(payload->>'name', '')
        || ' '
        || coalesce(payload->>'alt', '')
        || ' '
        || coalesce(payload->>'description', '')
    ) ~ '(^|[^a-z])(men|mens|male|gents|cufflink|tie clip|for him|boyfriend|husband|dad|father|beard|oxford|wallet chain for men)([^a-z]|$)'
  );

-- Optional: mark obvious shared pieces as unisex (tune keywords to your catalogue).
-- update public.catalog_products
-- set payload = jsonb_set(payload, '{gender}', '"unisex"', true), updated_at = now()
-- where lower(payload->>'gender') = 'her'
--   and lower(coalesce(payload->>'name','') || ' ' || coalesce(payload->>'cat','')) ~ '(unisex|gender[- ]neutral|any gender)';
