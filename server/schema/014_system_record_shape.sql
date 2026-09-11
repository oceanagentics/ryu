BEGIN;

-- Structural guard for SQL/imports. Vocabulary, evidence, localization joins and
-- rich completeness remain aggregate checks in recordContracts.ts.
CREATE OR REPLACE FUNCTION valid_system_record_object(value jsonb, section text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE fields jsonb; required text[]; entry record; child jsonb; rule text; ids text[];
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  fields := CASE section
    WHEN 'properties' THEN '{"disciplines":"strings","data":"data","access":"access[]","gallery":"gallery[]","metrics":"metric[]"}'
    WHEN 'details' THEN '{"aliases":"strings","profile":"profile","researchGaps":"gaps","data":"localized_data","access":"localized_access[]","gallery":"localized_gallery[]","metrics":"localized_metric[]"}'
    WHEN 'data' THEN '{"descriptors":"descriptor[]"}'
    WHEN 'localized_data' THEN '{"descriptors":"localized_metric[]"}'
    WHEN 'profile' THEN '{"sourceRefs":"strings"}'
    WHEN 'gaps' THEN '{"data":"text","usage":"text","standards":"text","access":"text"}'
    WHEN 'descriptor' THEN '{"id":"id","category":"text","label":"text","source":"nullable_id"}'
    WHEN 'access' THEN '{"id":"id","type":"text","methods":"strings","url":"text","requirements":"nullable_strings","cost":"text","sourceRefs":"strings"}'
    WHEN 'gallery' THEN '{"id":"id","type":"text","url":"text","thumbnailUrl":"nullable_text","source":"id","sortOrder":"integer"}'
    WHEN 'metric' THEN '{"id":"id","key":"text","value":"number","observedAt":"nullable_text","period":"nullable_text","source":"id"}'
    WHEN 'localized_access' THEN '{"id":"id","label":"text","description":"text"}'
    WHEN 'localized_gallery' THEN '{"id":"id","title":"nullable_prose","caption":"nullable_prose","altText":"nullable_prose"}'
    WHEN 'localized_metric' THEN '{"id":"id","description":"nullable_prose"}'
  END;
  IF fields IS NULL THEN RETURN false; END IF;
  SELECT coalesce(array_agg(key), '{}') INTO required FROM jsonb_object_keys(fields) key
    WHERE section NOT IN ('properties','details','gaps')
      AND NOT (section = 'metric' AND key = 'period')
      AND NOT (section = 'localized_gallery' AND key = 'altText');
  IF NOT value ?& required OR EXISTS (SELECT 1 FROM jsonb_object_keys(value) key WHERE NOT fields ? key) THEN RETURN false; END IF;
  FOR entry IN SELECT * FROM jsonb_each(value) LOOP
    rule := fields->>entry.key;
    IF rule LIKE 'nullable_%' THEN
      IF entry.value = 'null'::jsonb THEN CONTINUE; END IF;
      rule := substr(rule,10);
    END IF;
    IF rule IN ('text','prose','id') THEN
      IF jsonb_typeof(entry.value) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
      IF rule <> 'prose' AND btrim(entry.value #>> '{}') = '' THEN RETURN false; END IF;
      IF rule = 'id' AND entry.value #>> '{}' !~ '^[a-z0-9][a-z0-9._:-]*$' THEN RETURN false; END IF;
    ELSIF rule IN ('number','integer') THEN
      IF jsonb_typeof(entry.value) IS DISTINCT FROM 'number' THEN RETURN false; END IF;
      IF (entry.value::text)::numeric < 0 OR (entry.value::text)::numeric > 9007199254740991 THEN RETURN false; END IF;
      IF rule = 'integer' AND trunc((entry.value::text)::numeric) <> (entry.value::text)::numeric THEN RETURN false; END IF;
    ELSIF rule = 'strings' OR rule LIKE '%[]' THEN
      IF jsonb_typeof(entry.value) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      ids := '{}';
      FOR child IN SELECT * FROM jsonb_array_elements(entry.value) LOOP
        IF rule = 'strings' THEN
          IF jsonb_typeof(child) IS DISTINCT FROM 'string' OR btrim(child #>> '{}') = '' OR child #>> '{}' = ANY(ids) THEN RETURN false; END IF;
          ids := array_append(ids, child #>> '{}');
        ELSE
          IF NOT valid_system_record_object(child, left(rule,-2)) OR child->>'id' = ANY(ids) THEN RETURN false; END IF;
          ids := array_append(ids, child->>'id');
        END IF;
      END LOOP;
    ELSIF NOT valid_system_record_object(entry.value, rule) THEN RETURN false;
    END IF;
  END LOOP;
  IF section = 'descriptor' AND value->>'category' NOT IN ('type','format','standard') THEN RETURN false; END IF;
  IF section = 'access' AND (value->>'type' NOT IN ('read','write') OR jsonb_array_length(value->'methods') = 0 OR jsonb_array_length(value->'sourceRefs') = 0) THEN RETURN false; END IF;
  IF section = 'gallery' AND value->>'type' NOT IN ('image','embed') THEN RETURN false; END IF;
  RETURN true;
END;
$$;

-- Deferred so a kind change and its localization replacements can be atomic.
CREATE OR REPLACE FUNCTION check_system_record_shape()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id text; owner record; loc record;
BEGIN
  IF TG_TABLE_NAME = 'nodes' THEN owner_id := NEW.id; ELSE owner_id := NEW.node_id; END IF;
  SELECT * INTO owner FROM nodes WHERE id = owner_id;
  IF owner.kind = 'system' THEN
    IF NOT valid_system_record_object(owner.properties_json, 'properties') THEN
      RAISE EXCEPTION 'system % properties do not match the canonical record shape',owner_id USING ERRCODE = '23514';
    END IF;
    FOR loc IN SELECT locale, details_json FROM node_localizations WHERE node_id = owner_id LOOP
      IF NOT valid_system_record_object(loc.details_json, 'details') THEN
        RAISE EXCEPTION 'system %/% details do not match the canonical record shape',owner_id,loc.locale USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_nodes_record_shape ON nodes;
CREATE CONSTRAINT TRIGGER trg_nodes_record_shape AFTER INSERT OR UPDATE ON nodes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_system_record_shape();
DROP TRIGGER IF EXISTS trg_localizations_record_shape ON node_localizations;
CREATE CONSTRAINT TRIGGER trg_localizations_record_shape AFTER INSERT OR UPDATE ON node_localizations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_system_record_shape();

-- Refuse to install over incompatible records. Never discard unknown content.
DO $$
DECLARE invalid text;
BEGIN
  SELECT string_agg(id, ', ' ORDER BY id) INTO invalid FROM (
    SELECT n.id FROM nodes n WHERE n.kind = 'system' AND (
      NOT valid_system_record_object(n.properties_json, 'properties') OR EXISTS (
        SELECT 1 FROM node_localizations l WHERE l.node_id = n.id
          AND NOT valid_system_record_object(l.details_json, 'details')
      )
    )
  ) records;
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'repair system record shapes before migration 014: %',invalid; END IF;
END;
$$;

COMMIT;
