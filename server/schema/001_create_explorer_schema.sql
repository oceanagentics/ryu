BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS supported_locales (
  locale text PRIMARY KEY
    CHECK (locale IN ('ar', 'zh', 'en', 'fr', 'ru', 'es')),
  language_name text NOT NULL CHECK (btrim(language_name) <> ''),
  direction text NOT NULL CHECK (direction IN ('ltr', 'rtl')),
  sort_order integer NOT NULL UNIQUE CHECK (sort_order > 0)
);

INSERT INTO supported_locales (locale, language_name, direction, sort_order)
VALUES
  ('ar', 'Arabic', 'rtl', 1),
  ('zh', 'Chinese', 'ltr', 2),
  ('en', 'English', 'ltr', 3),
  ('fr', 'French', 'ltr', 4),
  ('ru', 'Russian', 'ltr', 5),
  ('es', 'Spanish', 'ltr', 6)
ON CONFLICT (locale) DO UPDATE
SET language_name = EXCLUDED.language_name,
    direction = EXCLUDED.direction,
    sort_order = EXCLUDED.sort_order;

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

CREATE TABLE IF NOT EXISTS nodes (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('country', 'organization', 'system')),
  country_code text CHECK (country_code IS NULL OR length(country_code) = 3),
  CONSTRAINT nodes_country_identity_check CHECK (kind = 'country' OR country_code IS NULL),
  url text,
  record_depth text NOT NULL DEFAULT 'stub' CHECK (record_depth IN ('stub', 'thin', 'rich')),
  properties_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (valid_owned_sources(sources)),
  CONSTRAINT nodes_source_refs_check CHECK (valid_owned_source_refs(properties_json, sources)),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
CREATE INDEX IF NOT EXISTS idx_nodes_country_kind ON nodes(country_code, kind);
CREATE INDEX IF NOT EXISTS idx_nodes_record_depth ON nodes(record_depth);

DROP TRIGGER IF EXISTS trg_nodes_updated_at ON nodes;
CREATE TRIGGER trg_nodes_updated_at
BEFORE UPDATE ON nodes
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION valid_localization_review(value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  snapshot jsonb;
  field text;
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' OR value - 'history' <> '{}'::jsonb THEN
    RETURN FALSE;
  END IF;
  IF jsonb_typeof(value->'history') IS DISTINCT FROM 'array' THEN RETURN FALSE; END IF;
  IF jsonb_array_length(value->'history') = 0 THEN RETURN FALSE; END IF;
  FOR snapshot IN SELECT * FROM jsonb_array_elements(value->'history') LOOP
    IF jsonb_typeof(snapshot) IS DISTINCT FROM 'object' THEN RETURN FALSE; END IF;
    IF NOT snapshot ?& ARRAY['state', 'reviewer', 'date', 'note']
      OR snapshot - ARRAY['state', 'reviewer', 'date', 'note'] <> '{}'::jsonb
      OR jsonb_typeof(snapshot->'state') IS DISTINCT FROM 'string'
      OR snapshot->>'state' NOT IN ('agent_researched', 'human_reviewed', 'needs_revision') THEN
      RETURN FALSE;
    END IF;
    FOREACH field IN ARRAY ARRAY['reviewer', 'date', 'note'] LOOP
      IF jsonb_typeof(snapshot->field) NOT IN ('string', 'null') THEN RETURN FALSE; END IF;
    END LOOP;
    IF snapshot->>'date' IS NOT NULL THEN
      IF snapshot->>'date' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
        OR NOT isfinite((snapshot->>'date')::timestamptz) THEN RETURN FALSE; END IF;
    END IF;
  END LOOP;
  RETURN TRUE;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  RETURN FALSE;
END;
$$;

CREATE TABLE IF NOT EXISTS node_localizations (
  node_id text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES supported_locales(locale),
  title text NOT NULL CHECK (btrim(title) <> ''),
  summary text,
  description text,
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  translated_from_locale text REFERENCES supported_locales(locale)
    CHECK (translated_from_locale IS NULL OR translated_from_locale <> locale),
  content_updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  review_json jsonb NOT NULL DEFAULT jsonb_build_object('history', jsonb_build_array(jsonb_build_object(
    'state', 'agent_researched', 'reviewer', NULL, 'date', CURRENT_TIMESTAMP, 'note', NULL)))
    CONSTRAINT node_localizations_review_json_check CHECK (valid_localization_review(review_json)),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (node_id, locale)
);

ALTER TABLE node_localizations
  DROP COLUMN IF EXISTS source_excerpt;

CREATE INDEX IF NOT EXISTS idx_node_localizations_locale
  ON node_localizations(locale);
CREATE INDEX IF NOT EXISTS idx_node_localizations_review_state
  ON node_localizations((review_json #>> '{history,-1,state}'));
CREATE INDEX IF NOT EXISTS idx_node_localizations_locale_review_state
  ON node_localizations(locale, (review_json #>> '{history,-1,state}'));

CREATE OR REPLACE FUNCTION set_node_localization_content_updated_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
    OR NEW.summary IS DISTINCT FROM OLD.summary
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.details_json IS DISTINCT FROM OLD.details_json
    OR NEW.translated_from_locale IS DISTINCT FROM OLD.translated_from_locale THEN
    NEW.content_updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_node_localizations_content_updated_at ON node_localizations;
CREATE TRIGGER trg_node_localizations_content_updated_at
BEFORE UPDATE ON node_localizations
FOR EACH ROW
EXECUTE FUNCTION set_node_localization_content_updated_at();

DROP TRIGGER IF EXISTS trg_node_localizations_updated_at ON node_localizations;
CREATE TRIGGER trg_node_localizations_updated_at
BEFORE UPDATE ON node_localizations
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION guard_localization_review_history()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT valid_localization_review(NEW.review_json) THEN
    RAISE EXCEPTION 'invalid localization review' USING ERRCODE = '23514';
  END IF;
  IF jsonb_array_length(NEW.review_json->'history') <> jsonb_array_length(OLD.review_json->'history') + 1
    OR (NEW.review_json->'history') - (jsonb_array_length(NEW.review_json->'history') - 1) <> OLD.review_json->'history'
    OR NEW.review_json #>> '{history,-1,date}' IS NULL THEN
    RAISE EXCEPTION 'review history must append one dated snapshot without changing earlier snapshots' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_node_localizations_review_history ON node_localizations;
CREATE TRIGGER trg_node_localizations_review_history
BEFORE UPDATE OF review_json ON node_localizations
FOR EACH ROW WHEN (NEW.review_json IS DISTINCT FROM OLD.review_json)
EXECUTE FUNCTION guard_localization_review_history();

CREATE TABLE IF NOT EXISTS edges (
  id text PRIMARY KEY,
  source_node_id text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  kind text NOT NULL CONSTRAINT edges_kind_check CHECK (kind IN ('governs', 'operates', 'funds', 'member', 'contributes', 'transfers')),
  description text NOT NULL CONSTRAINT edges_description_check CHECK (btrim(description) <> ''),
  sources jsonb NOT NULL CONSTRAINT edges_sources_check CHECK (sources <> '{}'::jsonb AND valid_owned_sources(sources)),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (source_node_id <> target_node_id)
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);

DROP TRIGGER IF EXISTS trg_edges_updated_at ON edges;
CREATE TRIGGER trg_edges_updated_at
BEFORE UPDATE ON edges
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE UNIQUE INDEX IF NOT EXISTS idx_edges_relationship ON edges(kind, source_node_id, target_node_id);

CREATE OR REPLACE FUNCTION valid_edge_endpoints(edge_kind text, source_kind text, target_kind text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(CASE edge_kind
    WHEN 'governs' THEN source_kind IN ('country','organization') AND target_kind IN ('organization','system')
    WHEN 'operates' THEN source_kind = 'organization' AND target_kind = 'system'
    WHEN 'funds' THEN source_kind IN ('country','organization') AND target_kind IN ('organization','system')
    WHEN 'member' THEN (source_kind IN ('country','organization') AND target_kind = 'organization')
      OR (source_kind = 'system' AND target_kind = 'system')
    WHEN 'contributes' THEN source_kind = 'organization' AND target_kind = 'system'
    WHEN 'transfers' THEN source_kind = 'system' AND target_kind = 'system'
    ELSE false END, false);
$$;

CREATE OR REPLACE FUNCTION enforce_edge_endpoints()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_kind text; target_kind text;
BEGIN
  -- Serialize against node-kind edits as well as node deletion.
  PERFORM id FROM nodes WHERE id IN (NEW.source_node_id, NEW.target_node_id) ORDER BY id FOR SHARE;
  SELECT kind INTO source_kind FROM nodes WHERE id = NEW.source_node_id;
  SELECT kind INTO target_kind FROM nodes WHERE id = NEW.target_node_id;
  IF NOT valid_edge_endpoints(NEW.kind, source_kind, target_kind) THEN
    RAISE EXCEPTION 'edge endpoints must exist and match the relationship kind' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_node_relationship_kinds()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM edges e JOIN nodes s ON s.id = e.source_node_id JOIN nodes t ON t.id = e.target_node_id
    WHERE (e.source_node_id = NEW.id OR e.target_node_id = NEW.id)
      AND NOT valid_edge_endpoints(e.kind,
        CASE WHEN s.id = NEW.id THEN NEW.kind ELSE s.kind END,
        CASE WHEN t.id = NEW.id THEN NEW.kind ELSE t.kind END)
  ) THEN
    RAISE EXCEPTION 'node kind would invalidate existing relationships' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_edges_endpoint_kinds ON edges;
CREATE TRIGGER trg_edges_endpoint_kinds BEFORE INSERT OR UPDATE OF kind, source_node_id, target_node_id ON edges
FOR EACH ROW EXECUTE FUNCTION enforce_edge_endpoints();
DROP TRIGGER IF EXISTS trg_nodes_relationship_kinds ON nodes;
CREATE TRIGGER trg_nodes_relationship_kinds BEFORE UPDATE OF kind ON nodes
FOR EACH ROW WHEN (NEW.kind IS DISTINCT FROM OLD.kind) EXECUTE FUNCTION enforce_node_relationship_kinds();

CREATE TABLE IF NOT EXISTS ryu_routes (
  id text PRIMARY KEY,
  node_id text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  status text NOT NULL,
  mode text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  capabilities_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  target text,
  upstream text,
  format text,
  contract_ref text,
  caveat text,
  properties_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ryu_routes_node ON ryu_routes(node_id, priority);
CREATE INDEX IF NOT EXISTS idx_ryu_routes_status ON ryu_routes(status);
CREATE INDEX IF NOT EXISTS idx_ryu_routes_mode ON ryu_routes(mode);

DROP TRIGGER IF EXISTS trg_ryu_routes_updated_at ON ryu_routes;
CREATE TRIGGER trg_ryu_routes_updated_at
BEFORE UPDATE ON ryu_routes
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
EXECUTE FUNCTION set_updated_at_timestamp();

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

CREATE TABLE IF NOT EXISTS saved_views (
  id text PRIMARY KEY,
  name text NOT NULL,
  scope text NOT NULL,
  filter_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  style_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_saved_views_updated_at ON saved_views;
CREATE TRIGGER trg_saved_views_updated_at
BEFORE UPDATE ON saved_views
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
EXECUTE FUNCTION set_updated_at_timestamp();

DO $$
BEGIN
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'explorer_read') THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cloudsqlsuperuser') THEN
      REVOKE cloudsqlsuperuser FROM explorer_read;
    END IF;

    ALTER ROLE explorer_read NOCREATEDB NOCREATEROLE;

    GRANT CONNECT ON DATABASE explorer TO explorer_read;
    REVOKE CREATE ON DATABASE explorer FROM explorer_read;
    REVOKE CREATE ON SCHEMA public FROM explorer_read;
    GRANT USAGE ON SCHEMA public TO explorer_read;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO explorer_read;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO explorer_read;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'explorer_write') THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cloudsqlsuperuser') THEN
      REVOKE cloudsqlsuperuser FROM explorer_write;
    END IF;

    ALTER ROLE explorer_write NOCREATEDB NOCREATEROLE;

    GRANT CONNECT ON DATABASE explorer TO explorer_write;
    REVOKE CREATE ON DATABASE explorer FROM explorer_write;
    REVOKE CREATE ON SCHEMA public FROM explorer_write;
    GRANT USAGE ON SCHEMA public TO explorer_write;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO explorer_write;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO explorer_write;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO explorer_write;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO explorer_write;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'explorer_schema_admin') THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cloudsqlsuperuser') THEN
      REVOKE cloudsqlsuperuser FROM explorer_schema_admin;
    END IF;

    ALTER ROLE explorer_schema_admin NOCREATEDB NOCREATEROLE;

    GRANT CONNECT ON DATABASE explorer TO explorer_schema_admin;
    GRANT USAGE, CREATE ON SCHEMA public TO explorer_schema_admin;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO explorer_schema_admin;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO explorer_schema_admin;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO explorer_schema_admin;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO explorer_schema_admin;
  END IF;
END $$;

-- Canonical system record shape (migration 014).

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

CREATE OR REPLACE FUNCTION valid_country_record_object(value jsonb, section text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item jsonb; child jsonb; field text; ids text[] := '{}'; refs text[];
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF section IN ('record', 'localization') THEN
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


-- Complete the kind-specific contracts without changing the shared tables.
CREATE OR REPLACE FUNCTION valid_node_kind_fields(kind text, value jsonb, section text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE fields text[];
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF section = 'record' THEN
    fields := ARRAY['id','kind','record_depth','properties_json','sources','created_at','updated_at'];
    CASE kind
      WHEN 'country' THEN fields := fields || ARRAY['country_code'];
      WHEN 'organization', 'system' THEN fields := fields || ARRAY['url'];
      ELSE RETURN false;
    END CASE;
  ELSIF section = 'localization' AND kind IN ('country','organization','system') THEN
    fields := ARRAY['node_id','locale','title','summary','details_json','translated_from_locale','content_updated_at','review_json','created_at','updated_at'];
    IF kind IN ('organization','system') THEN fields := fields || ARRAY['description']; END IF;
  ELSE RETURN false;
  END IF;
  -- Nulls in shared physical columns do not become fields in a typed record.
  RETURN NOT EXISTS (SELECT 1 FROM jsonb_each(value) entry
    WHERE entry.value <> 'null'::jsonb AND NOT entry.key = ANY(fields));
END;
$$;

CREATE OR REPLACE FUNCTION check_node_kind_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id text; owner record; loc record;
BEGIN
  IF TG_TABLE_NAME = 'nodes' THEN owner_id := NEW.id; ELSE owner_id := NEW.node_id; END IF;
  SELECT * INTO owner FROM nodes WHERE id = owner_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT valid_node_kind_fields(owner.kind, to_jsonb(owner), 'record') THEN
    RAISE EXCEPTION '% % does not match the canonical record fields', owner.kind, owner_id USING ERRCODE = '23514';
  END IF;
  FOR loc IN SELECT * FROM node_localizations WHERE node_id = owner_id LOOP
    IF NOT valid_node_kind_fields(owner.kind, to_jsonb(loc), 'localization') THEN
      RAISE EXCEPTION '% %/% does not match the canonical localization fields', owner.kind, owner_id, loc.locale USING ERRCODE = '23514';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM ryu_routes WHERE node_id = owner_id) AND owner.kind <> 'system' THEN
    RAISE EXCEPTION '% % does not have a routes section', owner.kind, owner_id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_nodes_kind_fields ON nodes;
CREATE CONSTRAINT TRIGGER trg_nodes_kind_fields AFTER INSERT OR UPDATE ON nodes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_node_kind_fields();
DROP TRIGGER IF EXISTS trg_localizations_kind_fields ON node_localizations;
CREATE CONSTRAINT TRIGGER trg_localizations_kind_fields AFTER INSERT OR UPDATE ON node_localizations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_node_kind_fields();
DROP TRIGGER IF EXISTS trg_routes_kind_fields ON ryu_routes;
CREATE CONSTRAINT TRIGGER trg_routes_kind_fields AFTER INSERT OR UPDATE ON ryu_routes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_node_kind_fields();

COMMIT;
