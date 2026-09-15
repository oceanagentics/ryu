BEGIN;

LOCK TABLE nodes, node_localizations IN ACCESS EXCLUSIVE MODE;

-- Source descriptions are optional in the general owner-local source shape.
-- Rich organization facts require complete localized descriptions in the API
-- aggregate validator so a dated value can carry its scope and qualification.
CREATE OR REPLACE FUNCTION valid_owned_sources(value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE entry record; translation record; source jsonb; accessed text;
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  FOR entry IN SELECT * FROM jsonb_each(value) LOOP
    source := entry.value;
    IF jsonb_typeof(source) IS DISTINCT FROM 'object'
      OR NOT source ?& ARRAY['id','url','title','accessedAt']
      OR source - ARRAY['id','url','title','description','accessedAt'] <> '{}'::jsonb
      OR jsonb_typeof(source->'id') IS DISTINCT FROM 'string'
      OR source->>'id' IS DISTINCT FROM entry.key
      OR entry.key !~ '^[a-z0-9][a-z0-9._:-]*$'
      OR jsonb_typeof(source->'url') IS DISTINCT FROM 'string'
      OR source->>'url' !~ '^https?://[^[:space:]/?#]+[^[:space:]]*$'
      OR jsonb_typeof(source->'accessedAt') IS DISTINCT FROM 'string'
      OR jsonb_typeof(source->'title') IS DISTINCT FROM 'object'
      OR source->'title' = '{}'::jsonb THEN RETURN false; END IF;
    accessed := source->>'accessedAt';
    IF accessed !~ '^\d{4}-\d{2}-\d{2}$' OR to_char(accessed::date, 'YYYY-MM-DD') <> accessed THEN RETURN false; END IF;
    FOR translation IN SELECT * FROM jsonb_each(source->'title') LOOP
      IF translation.key NOT IN ('ar','zh','en','fr','ru','es')
        OR jsonb_typeof(translation.value) IS DISTINCT FROM 'string'
        OR btrim(translation.value #>> '{}') = '' THEN RETURN false; END IF;
    END LOOP;
    IF source ? 'description' THEN
      IF jsonb_typeof(source->'description') IS DISTINCT FROM 'object'
        OR source->'description' = '{}'::jsonb THEN RETURN false; END IF;
      FOR translation IN SELECT * FROM jsonb_each(source->'description') LOOP
        IF translation.key NOT IN ('ar','zh','en','fr','ru','es')
          OR jsonb_typeof(translation.value) IS DISTINCT FROM 'string'
          OR btrim(translation.value #>> '{}') = '' THEN RETURN false; END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END;
$$;

-- Launch organizations may carry empty system-shaped sections. Remove only
-- known empty placeholders and stop before discarding substantive or unknown
-- content. Reused metrics are retained and validated against the organization
-- vocabulary below.
DO $$
DECLARE invalid text;
BEGIN
  SELECT string_agg(id, ', ' ORDER BY id) INTO invalid FROM nodes
  WHERE kind = 'organization' AND (
    properties_json - ARRAY['established','metrics','offices','disciplines','data','access','gallery','priority','sourceRefs','pseudoCountry'] <> '{}'::jsonb
    OR (properties_json ? 'disciplines' AND properties_json->'disciplines' <> '[]'::jsonb)
    OR (properties_json ? 'data' AND properties_json->'data' <> '{"descriptors":[]}'::jsonb)
    OR (properties_json ? 'access' AND properties_json->'access' <> '[]'::jsonb)
    OR (properties_json ? 'gallery' AND properties_json->'gallery' <> '[]'::jsonb)
    OR (properties_json ? 'priority' AND (jsonb_typeof(properties_json->'priority') IS DISTINCT FROM 'string'
      OR btrim(properties_json->>'priority') = ''))
    OR (properties_json ? 'sourceRefs' AND (jsonb_typeof(properties_json->'sourceRefs') IS DISTINCT FROM 'array'
      OR jsonb_array_length(properties_json->'sourceRefs') = 0))
    OR (properties_json ? 'pseudoCountry' AND (id <> 'eur' OR properties_json->'pseudoCountry' <> 'true'::jsonb))
  );
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'review organization properties before migration 016: %', invalid; END IF;

  SELECT string_agg(l.node_id || '/' || l.locale, ', ' ORDER BY l.node_id, l.locale) INTO invalid
  FROM node_localizations l JOIN nodes n ON n.id = l.node_id
  WHERE n.kind = 'organization' AND (
    l.details_json - ARRAY['aliases','profile','offices','researchGaps','data','access','gallery','metrics'] <> '{}'::jsonb
    OR (l.details_json ? 'data' AND l.details_json->'data' <> '{"descriptors":[]}'::jsonb)
    OR (l.details_json ? 'access' AND l.details_json->'access' <> '[]'::jsonb)
    OR (l.details_json ? 'gallery' AND l.details_json->'gallery' <> '[]'::jsonb)
    OR (l.details_json ? 'metrics' AND l.details_json->'metrics' <> '[]'::jsonb)
  );
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'review organization localization details before migration 016: %', invalid; END IF;
END;
$$;

-- The richer meaning is new. Existing rich labels are lowered until each
-- organization has been deliberately researched against the new contract.
UPDATE node_localizations SET review_json = jsonb_set(
  review_json,
  '{history}',
  coalesce(review_json->'history', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('state', 'needs_revision', 'reviewer', NULL, 'date', clock_timestamp(),
      'note', 'Organization richness now requires mission, establishment, scale, office-location and relationship research.')
  )
) WHERE node_id IN (SELECT id FROM nodes WHERE kind = 'organization' AND record_depth = 'rich')
  AND review_json #>> '{history,-1,state}' IS DISTINCT FROM 'needs_revision';

UPDATE nodes SET record_depth = 'thin' WHERE kind = 'organization' AND record_depth = 'rich';

-- Preserve legacy owner-level citations as profile evidence before removing the
-- retired launch-only priority and pseudo-country classifications.
WITH localized_refs AS (
  SELECT l.node_id, l.locale, jsonb_agg(DISTINCT ref.value ORDER BY ref.value) AS value
  FROM node_localizations l
  JOIN nodes n ON n.id = l.node_id
  CROSS JOIN LATERAL jsonb_array_elements_text(
    coalesce(l.details_json->'profile'->'sourceRefs', '[]'::jsonb) || (n.properties_json->'sourceRefs')
  ) AS ref(value)
  WHERE n.kind = 'organization' AND n.properties_json ? 'sourceRefs'
  GROUP BY l.node_id, l.locale
)
UPDATE node_localizations l SET details_json = jsonb_set(
  l.details_json,
  '{profile}',
  coalesce(l.details_json->'profile', '{}'::jsonb) || jsonb_build_object('sourceRefs', refs.value)
)
FROM localized_refs refs
WHERE refs.node_id = l.node_id AND refs.locale = l.locale;

UPDATE nodes SET properties_json = properties_json
  - ARRAY['disciplines','data','access','gallery','priority','sourceRefs','pseudoCountry']
WHERE kind = 'organization';

UPDATE node_localizations l SET details_json = l.details_json - ARRAY['data','access','gallery','metrics']
FROM nodes n WHERE n.id = l.node_id AND n.kind = 'organization';

CREATE OR REPLACE FUNCTION valid_organization_partial_date(value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE text_value text;
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  text_value := value #>> '{}';
  IF text_value ~ '^\d{4}$' THEN RETURN text_value <> '0000'; END IF;
  IF text_value ~ '^\d{4}-\d{2}$' THEN
    RETURN left(text_value, 4) <> '0000' AND substring(text_value, 6, 2)::integer BETWEEN 1 AND 12;
  END IF;
  IF text_value ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN left(text_value, 4) <> '0000' AND to_char(text_value::date, 'YYYY-MM-DD') = text_value;
  END IF;
  RETURN false;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION valid_organization_record_object(value jsonb, section text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item jsonb; child jsonb; ids text[] := '{}'; refs text[]; gaps record;
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF section = 'properties' THEN
    IF value - ARRAY['established','metrics','offices'] <> '{}'::jsonb THEN RETURN false; END IF;
    IF value ? 'established' AND value->'established' <> 'null'::jsonb THEN
      item := value->'established';
      IF jsonb_typeof(item) IS DISTINCT FROM 'object'
        OR NOT item ?& ARRAY['date','source']
        OR item - ARRAY['date','source'] <> '{}'::jsonb
        OR NOT valid_organization_partial_date(item->'date')
        OR jsonb_typeof(item->'source') IS DISTINCT FROM 'string'
        OR item->>'source' !~ '^[a-z0-9][a-z0-9._:-]*$' THEN RETURN false; END IF;
    END IF;
    IF value ? 'metrics' THEN
      IF jsonb_typeof(value->'metrics') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      ids := '{}';
      FOR item IN SELECT * FROM jsonb_array_elements(value->'metrics') LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
          OR NOT item ?& ARRAY['id','key','value','observedAt','source']
          OR item - ARRAY['id','key','value','observedAt','source'] <> '{}'::jsonb
          OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
          OR item->>'id' !~ '^[a-z0-9][a-z0-9._:-]*$' OR item->>'id' = ANY(ids)
          OR jsonb_typeof(item->'key') IS DISTINCT FROM 'string'
          OR item->>'key' NOT IN ('staff_count','member_organization_count','member_country_count')
          OR jsonb_typeof(item->'value') IS DISTINCT FROM 'number'
          OR (item->>'value')::numeric < 0 OR (item->>'value')::numeric > 9007199254740991
          OR (item->'observedAt' <> 'null'::jsonb AND NOT valid_organization_partial_date(item->'observedAt'))
          OR jsonb_typeof(item->'source') IS DISTINCT FROM 'string'
          OR item->>'source' !~ '^[a-z0-9][a-z0-9._:-]*$' THEN RETURN false; END IF;
        ids := array_append(ids, item->>'id');
      END LOOP;
    END IF;
    IF value ? 'offices' THEN
      IF jsonb_typeof(value->'offices') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      ids := '{}';
      FOR item IN SELECT * FROM jsonb_array_elements(value->'offices') LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
          OR NOT item ?& ARRAY['id','kind','source']
          OR item - ARRAY['id','kind','source'] <> '{}'::jsonb
          OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
          OR item->>'id' !~ '^[a-z0-9][a-z0-9._:-]*$' OR item->>'id' = ANY(ids)
          OR jsonb_typeof(item->'kind') IS DISTINCT FROM 'string'
          OR item->>'kind' NOT IN ('headquarters','office')
          OR jsonb_typeof(item->'source') IS DISTINCT FROM 'string'
          OR item->>'source' !~ '^[a-z0-9][a-z0-9._:-]*$' THEN RETURN false; END IF;
        ids := array_append(ids, item->>'id');
      END LOOP;
    END IF;
  ELSIF section = 'details' THEN
    IF value - ARRAY['aliases','profile','offices','researchGaps'] <> '{}'::jsonb THEN RETURN false; END IF;
    IF value ? 'aliases' THEN
      IF jsonb_typeof(value->'aliases') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      ids := '{}';
      FOR child IN SELECT * FROM jsonb_array_elements(value->'aliases') LOOP
        IF jsonb_typeof(child) IS DISTINCT FROM 'string' OR btrim(child #>> '{}') = ''
          OR child #>> '{}' = ANY(ids) THEN RETURN false; END IF;
        ids := array_append(ids, child #>> '{}');
      END LOOP;
    END IF;
    IF value ? 'profile' THEN
      item := value->'profile';
      IF jsonb_typeof(item) IS DISTINCT FROM 'object'
        OR NOT item ? 'sourceRefs'
        OR item - ARRAY['mission','sourceRefs'] <> '{}'::jsonb
        OR jsonb_typeof(item->'sourceRefs') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      IF item ? 'mission' AND (jsonb_typeof(item->'mission') IS DISTINCT FROM 'string' OR btrim(item->>'mission') = '') THEN RETURN false; END IF;
      refs := '{}';
      FOR child IN SELECT * FROM jsonb_array_elements(item->'sourceRefs') LOOP
        IF jsonb_typeof(child) IS DISTINCT FROM 'string' OR child #>> '{}' !~ '^[a-z0-9][a-z0-9._:-]*$'
          OR child #>> '{}' = ANY(refs) THEN RETURN false; END IF;
        refs := array_append(refs, child #>> '{}');
      END LOOP;
    END IF;
    IF value ? 'offices' THEN
      IF jsonb_typeof(value->'offices') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      ids := '{}';
      FOR item IN SELECT * FROM jsonb_array_elements(value->'offices') LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
          OR NOT item ?& ARRAY['id','location']
          OR item - ARRAY['id','location'] <> '{}'::jsonb
          OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
          OR item->>'id' !~ '^[a-z0-9][a-z0-9._:-]*$' OR item->>'id' = ANY(ids)
          OR jsonb_typeof(item->'location') IS DISTINCT FROM 'string'
          OR btrim(item->>'location') = '' THEN RETURN false; END IF;
        ids := array_append(ids, item->>'id');
      END LOOP;
    END IF;
    IF value ? 'researchGaps' THEN
      IF jsonb_typeof(value->'researchGaps') IS DISTINCT FROM 'object'
        OR (value->'researchGaps') - ARRAY['established','scale','officeLocations'] <> '{}'::jsonb THEN RETURN false; END IF;
      FOR gaps IN SELECT * FROM jsonb_each(value->'researchGaps') LOOP
        IF jsonb_typeof(gaps.value) IS DISTINCT FROM 'string' OR btrim(gaps.value #>> '{}') = '' THEN RETURN false; END IF;
      END LOOP;
    END IF;
  ELSE RETURN false;
  END IF;
  RETURN true;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION check_organization_record_shape()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id text; owner record; loc record;
BEGIN
  IF TG_TABLE_NAME = 'nodes' THEN owner_id := NEW.id; ELSE owner_id := NEW.node_id; END IF;
  SELECT * INTO owner FROM nodes WHERE id = owner_id;
  IF owner.kind = 'organization' THEN
    IF NOT valid_organization_record_object(owner.properties_json, 'properties') THEN
      RAISE EXCEPTION 'organization % properties do not match the canonical record shape', owner_id USING ERRCODE = '23514';
    END IF;
    FOR loc IN SELECT locale, details_json FROM node_localizations WHERE node_id = owner_id LOOP
      IF NOT valid_organization_record_object(loc.details_json, 'details') THEN
        RAISE EXCEPTION 'organization %/% details do not match the canonical record shape', owner_id, loc.locale USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_nodes_organization_record_shape ON nodes;
CREATE CONSTRAINT TRIGGER trg_nodes_organization_record_shape AFTER INSERT OR UPDATE ON nodes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_organization_record_shape();
DROP TRIGGER IF EXISTS trg_localizations_organization_record_shape ON node_localizations;
CREATE CONSTRAINT TRIGGER trg_localizations_organization_record_shape AFTER INSERT OR UPDATE ON node_localizations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_organization_record_shape();

DO $$
DECLARE invalid text;
BEGIN
  SELECT string_agg(id, ', ' ORDER BY id) INTO invalid FROM (
    SELECT n.id FROM nodes n WHERE n.kind = 'organization' AND (
      NOT valid_organization_record_object(n.properties_json, 'properties') OR EXISTS (
        SELECT 1 FROM node_localizations l WHERE l.node_id = n.id
          AND NOT valid_organization_record_object(l.details_json, 'details')
      )
    )
  ) records;
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'repair organization record shapes before migration 016: %', invalid; END IF;
END;
$$;

COMMIT;
