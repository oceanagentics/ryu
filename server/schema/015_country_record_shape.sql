BEGIN;

LOCK TABLE nodes, node_localizations IN ACCESS EXCLUSIVE MODE;

-- The launch countries carried empty system sections. Remove only those known
-- placeholders, and stop before discarding any substantive or unknown content.
DO $$
DECLARE invalid text;
BEGIN
  SELECT string_agg(id, ', ' ORDER BY id) INTO invalid FROM nodes
  WHERE kind = 'country' AND (
    properties_json - ARRAY['treatyParticipation','disciplines','data','access','gallery','metrics','pseudoCountry'] <> '{}'::jsonb
    OR (properties_json ? 'disciplines' AND properties_json->'disciplines' <> '[]'::jsonb)
    OR (properties_json ? 'data' AND properties_json->'data' <> '{"descriptors":[]}'::jsonb)
    OR (properties_json ? 'access' AND properties_json->'access' <> '[]'::jsonb)
    OR (properties_json ? 'gallery' AND properties_json->'gallery' <> '[]'::jsonb)
    OR (properties_json ? 'metrics' AND properties_json->'metrics' <> '[]'::jsonb)
    OR (properties_json ? 'pseudoCountry' AND properties_json->'pseudoCountry' <> 'false'::jsonb)
  );
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'review country properties before migration 015: %', invalid; END IF;

  SELECT string_agg(l.node_id || '/' || l.locale, ', ' ORDER BY l.node_id, l.locale) INTO invalid
  FROM node_localizations l JOIN nodes n ON n.id = l.node_id
  WHERE n.kind = 'country' AND (
    l.details_json - ARRAY['aliases','profile','treatyParticipation','researchGaps','data','access','gallery','metrics'] <> '{}'::jsonb
    OR (l.details_json ? 'researchGaps' AND l.details_json->'researchGaps' <> '{}'::jsonb)
    OR (l.details_json ? 'data' AND l.details_json->'data' <> '{"descriptors":[]}'::jsonb)
    OR (l.details_json ? 'access' AND l.details_json->'access' <> '[]'::jsonb)
    OR (l.details_json ? 'gallery' AND l.details_json->'gallery' <> '[]'::jsonb)
    OR (l.details_json ? 'metrics' AND l.details_json->'metrics' <> '[]'::jsonb)
  );
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'review country localization details before migration 015: %', invalid; END IF;
END;
$$;

UPDATE node_localizations SET review_json = jsonb_build_object('history', coalesce(review_json->'history', '[]'::jsonb) || jsonb_build_array(
  jsonb_build_object('state', 'needs_revision', 'reviewer', NULL, 'date', clock_timestamp(),
    'note', 'Country richness now requires researched treaty participation and official context.')
)) WHERE node_id IN (
  SELECT id FROM nodes WHERE kind = 'country' AND record_depth = 'rich'
    AND (jsonb_typeof(properties_json->'treatyParticipation') IS DISTINCT FROM 'array'
      OR jsonb_array_length(properties_json->'treatyParticipation') = 0)
) AND review_json #>> '{history,-1,state}' IS DISTINCT FROM 'needs_revision';

UPDATE nodes SET record_depth = 'thin' WHERE kind = 'country' AND record_depth = 'rich'
  AND (jsonb_typeof(properties_json->'treatyParticipation') IS DISTINCT FROM 'array'
    OR jsonb_array_length(properties_json->'treatyParticipation') = 0);

UPDATE nodes SET properties_json = CASE WHEN properties_json ? 'treatyParticipation'
  THEN jsonb_build_object('treatyParticipation', properties_json->'treatyParticipation') ELSE '{}'::jsonb END
WHERE kind = 'country';

-- Preserve existing prose in the single introduction before deliberate rewriting.
UPDATE node_localizations l SET summary = concat_ws(E'\n\n', nullif(l.summary, ''),
  CASE WHEN l.description IS DISTINCT FROM l.summary THEN nullif(l.description, '') END), description = NULL
FROM nodes n WHERE n.id = l.node_id AND n.kind = 'country' AND l.description IS NOT NULL;
UPDATE nodes SET url = NULL WHERE kind = 'country' AND url IS NOT NULL;

UPDATE node_localizations l SET details_json = l.details_json
  - 'researchGaps' - 'data' - 'access' - 'gallery' - 'metrics'
FROM nodes n WHERE n.id = l.node_id AND n.kind = 'country';

CREATE OR REPLACE FUNCTION valid_country_record_object(value jsonb, section text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item jsonb; child jsonb; field text; ids text[] := '{}'; refs text[];
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF section IN ('record', 'localization') THEN
    -- Shared SQL columns become fields only when populated; nested null facts remain intact.
    SELECT coalesce(jsonb_object_agg(key, entry), '{}'::jsonb) INTO value
    FROM jsonb_each(value) AS fields(key, entry) WHERE entry <> 'null'::jsonb;
    IF section = 'record' THEN
      RETURN value - ARRAY['id','kind','country_code','record_depth','properties_json','sources','created_at','updated_at'] = '{}'::jsonb;
    END IF;
    RETURN value - ARRAY['node_id','locale','title','summary','details_json','translated_from_locale','content_updated_at','review_json','created_at','updated_at'] = '{}'::jsonb;
  ELSIF section = 'properties' THEN
    IF value - 'treatyParticipation' <> '{}'::jsonb THEN RETURN false; END IF;
  ELSIF section = 'details' THEN
    IF value - ARRAY['aliases','profile','treatyParticipation'] <> '{}'::jsonb THEN RETURN false; END IF;
    IF value ? 'aliases' THEN
      IF jsonb_typeof(value->'aliases') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      FOR child IN SELECT * FROM jsonb_array_elements(value->'aliases') LOOP
        IF jsonb_typeof(child) IS DISTINCT FROM 'string' OR btrim(child #>> '{}') = '' OR child #>> '{}' = ANY(ids) THEN RETURN false; END IF;
        ids := array_append(ids, child #>> '{}');
      END LOOP;
    END IF;
    IF value ? 'profile' AND NOT valid_system_record_object(value->'profile', 'profile') THEN RETURN false; END IF;
  ELSE RETURN false;
  END IF;

  IF value ? 'treatyParticipation' THEN
    IF jsonb_typeof(value->'treatyParticipation') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    ids := '{}';
    FOR item IN SELECT * FROM jsonb_array_elements(value->'treatyParticipation') LOOP
      IF section = 'properties' THEN
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
          OR NOT item ?& ARRAY['id','status','signatureDate','consentMethod','depositDate','effectiveDate','focalPointUrl','sourceRefs']
          OR item - ARRAY['id','status','signatureDate','consentMethod','depositDate','effectiveDate','focalPointUrl','sourceRefs'] <> '{}'::jsonb
          OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string' OR item->>'id' !~ '^[a-z0-9][a-z0-9._:-]*$'
          OR item->>'id' = ANY(ids)
          OR jsonb_typeof(item->'status') IS DISTINCT FROM 'string'
          OR item->>'status' NOT IN ('party','signatory_not_party','not_party','withdrawn')
          OR (item->'consentMethod' <> 'null'::jsonb AND (jsonb_typeof(item->'consentMethod') IS DISTINCT FROM 'string'
            OR item->>'consentMethod' NOT IN ('ratification','acceptance','approval','accession','definitive_signature')))
          OR (item->'focalPointUrl' <> 'null'::jsonb AND (jsonb_typeof(item->'focalPointUrl') IS DISTINCT FROM 'string'
            OR item->>'focalPointUrl' !~ '^https?://[^[:space:]/?#]+[^[:space:]]*$'))
          OR jsonb_typeof(item->'sourceRefs') IS DISTINCT FROM 'array' OR jsonb_array_length(item->'sourceRefs') = 0
        THEN RETURN false; END IF;
        FOR field IN SELECT unnest(ARRAY['signatureDate','depositDate','effectiveDate']) LOOP
          child := item->field;
          IF child <> 'null'::jsonb AND (jsonb_typeof(child) IS DISTINCT FROM 'string'
            OR child #>> '{}' !~ '^\d{4}-\d{2}-\d{2}$' OR left(child #>> '{}', 4) = '0000'
            OR to_char((child #>> '{}')::date, 'YYYY-MM-DD') <> child #>> '{}') THEN RETURN false; END IF;
        END LOOP;
        refs := '{}';
        FOR child IN SELECT * FROM jsonb_array_elements(item->'sourceRefs') LOOP
          IF jsonb_typeof(child) IS DISTINCT FROM 'string' OR child #>> '{}' !~ '^[a-z0-9][a-z0-9._:-]*$'
            OR child #>> '{}' = ANY(refs) THEN RETURN false; END IF;
          refs := array_append(refs, child #>> '{}');
        END LOOP;
      ELSE
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
          OR NOT item ?& ARRAY['id','title','description','focalPoint']
          OR item - ARRAY['id','title','description','focalPoint'] <> '{}'::jsonb
          OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string' OR item->>'id' !~ '^[a-z0-9][a-z0-9._:-]*$'
          OR item->>'id' = ANY(ids)
          OR jsonb_typeof(item->'title') IS DISTINCT FROM 'string' OR btrim(item->>'title') = ''
          OR jsonb_typeof(item->'description') NOT IN ('string','null')
          OR (jsonb_typeof(item->'description') = 'string' AND btrim(item->>'description') = '')
          OR jsonb_typeof(item->'focalPoint') NOT IN ('string','null')
          OR (jsonb_typeof(item->'focalPoint') = 'string' AND btrim(item->>'focalPoint') = '')
        THEN RETURN false; END IF;
      END IF;
      ids := array_append(ids, item->>'id');
    END LOOP;
  END IF;
  RETURN true;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION check_country_record_shape()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id text; owner record; loc record;
BEGIN
  IF TG_TABLE_NAME = 'nodes' THEN owner_id := NEW.id; ELSE owner_id := NEW.node_id; END IF;
  SELECT * INTO owner FROM nodes WHERE id = owner_id;
  IF owner.kind = 'country' THEN
    IF NOT valid_country_record_object(to_jsonb(owner), 'record')
      OR NOT valid_country_record_object(owner.properties_json, 'properties') THEN
      RAISE EXCEPTION 'country % properties do not match the canonical record shape', owner_id USING ERRCODE = '23514';
    END IF;
    FOR loc IN SELECT * FROM node_localizations WHERE node_id = owner_id LOOP
      IF NOT valid_country_record_object(to_jsonb(loc), 'localization')
        OR NOT valid_country_record_object(loc.details_json, 'details') THEN
        RAISE EXCEPTION 'country %/% details do not match the canonical record shape', owner_id, loc.locale USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_nodes_country_record_shape ON nodes;
CREATE CONSTRAINT TRIGGER trg_nodes_country_record_shape AFTER INSERT OR UPDATE ON nodes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_country_record_shape();
DROP TRIGGER IF EXISTS trg_localizations_country_record_shape ON node_localizations;
CREATE CONSTRAINT TRIGGER trg_localizations_country_record_shape AFTER INSERT OR UPDATE ON node_localizations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_country_record_shape();

DO $$
DECLARE invalid text;
BEGIN
  SELECT string_agg(id, ', ' ORDER BY id) INTO invalid FROM (
    SELECT n.id FROM nodes n WHERE n.kind = 'country' AND (
      NOT valid_country_record_object(to_jsonb(n), 'record')
      OR NOT valid_country_record_object(n.properties_json, 'properties') OR EXISTS (
        SELECT 1 FROM node_localizations l WHERE l.node_id = n.id
          AND (NOT valid_country_record_object(to_jsonb(l), 'localization')
            OR NOT valid_country_record_object(l.details_json, 'details'))
      )
    )
  ) records;
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'repair country record shapes before migration 015: %', invalid; END IF;
END;
$$;

COMMIT;
