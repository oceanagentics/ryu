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
  kind text NOT NULL CHECK (kind IN ('governs', 'operates', 'funds', 'member_of', 'publishes_to', 'syncs_to')),
  note text,
  properties_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (valid_owned_sources(sources)),
  CONSTRAINT edges_source_refs_check CHECK (valid_owned_source_refs(properties_json, sources)),
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
    WHEN 'member_of' THEN (source_kind IN ('country','organization') AND target_kind = 'organization')
      OR (source_kind = 'system' AND target_kind = 'system')
    WHEN 'publishes_to' THEN source_kind = 'organization' AND target_kind = 'system'
    WHEN 'syncs_to' THEN source_kind = 'system' AND target_kind = 'system'
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

COMMIT;
