BEGIN;

-- Source records have one owner and one closed shape.
CREATE OR REPLACE FUNCTION valid_owned_sources(value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE entry record; translation record; source jsonb; accessed text;
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  FOR entry IN SELECT * FROM jsonb_each(value) LOOP
    source := entry.value;
    IF jsonb_typeof(source) IS DISTINCT FROM 'object'
      OR NOT source ?& ARRAY['id','url','title','accessedAt']
      OR source - ARRAY['id','url','title','accessedAt'] <> '{}'::jsonb
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
  END LOOP;
  RETURN true;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION source_reference_ids(value jsonb)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE entry record; child jsonb; refs text[] := '{}'; ref text;
BEGIN
  IF jsonb_typeof(value) = 'array' THEN
    FOR child IN SELECT * FROM jsonb_array_elements(value) LOOP
      refs := refs || source_reference_ids(child);
    END LOOP;
  ELSIF jsonb_typeof(value) = 'object' THEN
    FOR entry IN SELECT * FROM jsonb_each(value) LOOP
      IF entry.key = 'sources' THEN
        RAISE EXCEPTION 'sources belong in the dedicated owner column' USING ERRCODE = '23514';
      ELSIF entry.key = 'source' AND entry.value <> 'null'::jsonb THEN
        IF jsonb_typeof(entry.value) IS DISTINCT FROM 'string' OR entry.value #>> '{}' !~ '^[a-z0-9][a-z0-9._:-]*$' THEN
          RAISE EXCEPTION 'source must be a source ID' USING ERRCODE = '23514';
        END IF;
        refs := array_append(refs, entry.value #>> '{}');
      ELSIF entry.key = 'sourceRefs' THEN
        IF jsonb_typeof(entry.value) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'sourceRefs must be an array of IDs' USING ERRCODE = '23514'; END IF;
        FOR child IN SELECT * FROM jsonb_array_elements(entry.value) LOOP
          ref := child #>> '{}';
          IF jsonb_typeof(child) IS DISTINCT FROM 'string' OR ref !~ '^[a-z0-9][a-z0-9._:-]*$' THEN
            RAISE EXCEPTION 'sourceRefs must contain source IDs' USING ERRCODE = '23514';
          END IF;
          refs := array_append(refs, ref);
        END LOOP;
      ELSE refs := refs || source_reference_ids(entry.value);
      END IF;
    END LOOP;
  END IF;
  RETURN refs;
END;
$$;

CREATE OR REPLACE FUNCTION valid_owned_source_refs(content jsonb, sources jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT sources ?& source_reference_ids(content);
$$;

-- Run during a coordinated application cutover with legacy writers stopped.
LOCK TABLE nodes, edges, node_localizations, ryu_routes IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE edges ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION pg_temp.rewrite_source_refs(value jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE entry record; child jsonb; result jsonb; canonical_url text;
BEGIN
  IF jsonb_typeof(value) = 'array' THEN
    result := '[]';
    FOR child IN SELECT * FROM jsonb_array_elements(value) LOOP result := result || jsonb_build_array(pg_temp.rewrite_source_refs(child)); END LOOP;
  ELSIF jsonb_typeof(value) = 'object' THEN
    result := '{}';
    FOR entry IN SELECT * FROM jsonb_each(value) LOOP
      IF entry.key = 'source' AND jsonb_typeof(entry.value) = 'object' THEN
        SELECT url INTO canonical_url FROM sources WHERE id = entry.value->>'id';
        IF entry.value->>'url' IS NOT NULL AND canonical_url IS DISTINCT FROM entry.value->>'url' THEN
          RAISE EXCEPTION 'source % has conflicting embedded and stored URLs', entry.value->>'id';
        END IF;
        result := result || jsonb_build_object(entry.key, entry.value->'id');
      ELSE result := result || jsonb_build_object(entry.key, pg_temp.rewrite_source_refs(entry.value)); END IF;
    END LOOP;
  ELSE RETURN value;
  END IF;
  RETURN result;
END;
$$;

DO $$
DECLARE owner record; refs text[]; collection jsonb;
BEGIN
  IF to_regclass('public.sources') IS NULL THEN RETURN; END IF;
  LOCK TABLE sources, sources_localizations IN SHARE ROW EXCLUSIVE MODE;
  UPDATE nodes SET properties_json = pg_temp.rewrite_source_refs(properties_json);
  UPDATE node_localizations SET details_json = pg_temp.rewrite_source_refs(details_json);
  UPDATE edges SET properties_json = pg_temp.rewrite_source_refs(properties_json);
  UPDATE ryu_routes SET properties_json = pg_temp.rewrite_source_refs(properties_json);
  FOR owner IN SELECT id, properties_json FROM nodes LOOP
    refs := source_reference_ids(owner.properties_json);
    SELECT refs || coalesce(array_agg(ref), '{}') INTO refs FROM (
      SELECT unnest(source_reference_ids(details_json)) AS ref FROM node_localizations WHERE node_id = owner.id
      UNION SELECT unnest(source_reference_ids(properties_json)) FROM ryu_routes WHERE node_id = owner.id
    ) used;
    IF EXISTS (SELECT 1 FROM unnest(refs) ref WHERE NOT EXISTS (SELECT 1 FROM sources s WHERE s.id = ref)) THEN
      RAISE EXCEPTION 'node % references a missing legacy source', owner.id;
    END IF;
    SELECT coalesce(jsonb_object_agg(s.id, jsonb_build_object('id',s.id,'url',s.url,'accessedAt',s.accessed_at,
      'title',coalesce((SELECT jsonb_object_agg(l.locale,l.title) FROM sources_localizations l WHERE l.source_id=s.id),'{}'))),'{}')
      INTO collection FROM sources s WHERE s.id = ANY(refs);
    UPDATE nodes SET sources = collection WHERE id = owner.id;
  END LOOP;
  FOR owner IN SELECT id, properties_json FROM edges LOOP
    refs := source_reference_ids(owner.properties_json);
    IF EXISTS (SELECT 1 FROM unnest(refs) ref WHERE NOT EXISTS (SELECT 1 FROM sources s WHERE s.id = ref)) THEN
      RAISE EXCEPTION 'edge % references a missing legacy source', owner.id;
    END IF;
    SELECT coalesce(jsonb_object_agg(s.id, jsonb_build_object('id',s.id,'url',s.url,'accessedAt',s.accessed_at,
      'title',coalesce((SELECT jsonb_object_agg(l.locale,l.title) FROM sources_localizations l WHERE l.source_id=s.id),'{}'))),'{}')
      INTO collection FROM sources s WHERE s.id = ANY(refs);
    UPDATE edges SET sources = collection WHERE id = owner.id;
  END LOOP;
END;
$$;

ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_sources_check;
ALTER TABLE nodes ADD CONSTRAINT nodes_sources_check CHECK (valid_owned_sources(sources));
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_source_refs_check;
ALTER TABLE nodes ADD CONSTRAINT nodes_source_refs_check CHECK (valid_owned_source_refs(properties_json,sources));
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_sources_check;
ALTER TABLE edges ADD CONSTRAINT edges_sources_check CHECK (valid_owned_sources(sources));
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_source_refs_check;
ALTER TABLE edges ADD CONSTRAINT edges_source_refs_check CHECK (valid_owned_source_refs(properties_json,sources));

-- Child writes serialize with owner edits before deferred checks read the final state.
CREATE OR REPLACE FUNCTION lock_source_owners()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ids text[];
BEGIN
  IF TG_TABLE_NAME = 'edges' THEN
    ids := ARRAY[NEW.source_node_id,NEW.target_node_id,OLD.source_node_id,OLD.target_node_id];
  ELSE ids := ARRAY[NEW.node_id,OLD.node_id]; END IF;
  PERFORM id FROM nodes WHERE id = ANY(ids) ORDER BY id FOR UPDATE;
  RETURN coalesce(NEW,OLD);
END;
$$;

CREATE OR REPLACE FUNCTION assert_owned_source_links(ids text[])
RETURNS void LANGUAGE plpgsql AS $$
DECLARE owner record; loc record; edge record; source record;
BEGIN
  FOR owner IN SELECT * FROM nodes WHERE id = ANY(ids) LOOP
    FOR loc IN SELECT * FROM node_localizations WHERE node_id = owner.id LOOP
      IF NOT valid_owned_source_refs(loc.details_json, owner.sources) THEN
        RAISE EXCEPTION 'localization %/% references a missing source',owner.id,loc.locale USING ERRCODE = '23514';
      END IF;
      FOR source IN SELECT * FROM jsonb_each(owner.sources) LOOP
        IF NOT (source.value->'title') ? loc.locale THEN
          RAISE EXCEPTION 'node % source % is missing title %',owner.id,source.key,loc.locale USING ERRCODE = '23514';
        END IF;
      END LOOP;
    END LOOP;
    IF EXISTS (SELECT 1 FROM ryu_routes r WHERE r.node_id = owner.id AND NOT valid_owned_source_refs(r.properties_json, owner.sources)) THEN
      RAISE EXCEPTION 'route on node % references a missing source',owner.id USING ERRCODE = '23514';
    END IF;
    FOR edge IN SELECT * FROM edges WHERE source_node_id = owner.id OR target_node_id = owner.id LOOP
      FOR source IN SELECT * FROM jsonb_each(edge.sources) LOOP
        IF EXISTS (SELECT 1 FROM node_localizations l WHERE l.node_id IN (edge.source_node_id,edge.target_node_id)
          AND NOT (source.value->'title') ? l.locale) THEN
          RAISE EXCEPTION 'edge % source % is missing a title for an endpoint localization',edge.id,source.key USING ERRCODE = '23514';
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION check_owned_source_links()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ids text[];
BEGIN
  IF TG_TABLE_NAME = 'nodes' THEN ids := ARRAY[NEW.id,OLD.id];
  ELSIF TG_TABLE_NAME = 'edges' THEN ids := ARRAY[NEW.source_node_id,NEW.target_node_id,OLD.source_node_id,OLD.target_node_id];
  ELSE ids := ARRAY[NEW.node_id,OLD.node_id]; END IF;
  PERFORM assert_owned_source_links(ids);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_localizations_source_lock ON node_localizations;
CREATE TRIGGER trg_localizations_source_lock BEFORE INSERT OR UPDATE OR DELETE ON node_localizations
FOR EACH ROW EXECUTE FUNCTION lock_source_owners();
DROP TRIGGER IF EXISTS trg_routes_source_lock ON ryu_routes;
CREATE TRIGGER trg_routes_source_lock BEFORE INSERT OR UPDATE OR DELETE ON ryu_routes
FOR EACH ROW EXECUTE FUNCTION lock_source_owners();
DROP TRIGGER IF EXISTS trg_edges_source_lock ON edges;
CREATE TRIGGER trg_edges_source_lock BEFORE INSERT OR UPDATE OR DELETE ON edges
FOR EACH ROW EXECUTE FUNCTION lock_source_owners();

DROP TRIGGER IF EXISTS trg_nodes_source_links ON nodes;
CREATE CONSTRAINT TRIGGER trg_nodes_source_links AFTER INSERT OR UPDATE OR DELETE ON nodes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_owned_source_links();
DROP TRIGGER IF EXISTS trg_localizations_source_links ON node_localizations;
CREATE CONSTRAINT TRIGGER trg_localizations_source_links AFTER INSERT OR UPDATE OR DELETE ON node_localizations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_owned_source_links();
DROP TRIGGER IF EXISTS trg_edges_source_links ON edges;
CREATE CONSTRAINT TRIGGER trg_edges_source_links AFTER INSERT OR UPDATE OR DELETE ON edges
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_owned_source_links();
DROP TRIGGER IF EXISTS trg_routes_source_links ON ryu_routes;
CREATE CONSTRAINT TRIGGER trg_routes_source_links AFTER INSERT OR UPDATE OR DELETE ON ryu_routes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_owned_source_links();

-- Validate all migrated rows without changing timestamps on a rerun.
SELECT assert_owned_source_links(array_agg(id)) FROM nodes;
SET CONSTRAINTS ALL IMMEDIATE;
DROP TABLE IF EXISTS sources_localizations;
DROP TABLE IF EXISTS sources;
DROP FUNCTION IF EXISTS set_sources_localization_content_updated_at();
COMMIT;
