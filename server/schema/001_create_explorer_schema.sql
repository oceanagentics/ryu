BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS sources (
  id text PRIMARY KEY,
  source_type text NOT NULL,
  url text,
  local_path text,
  publisher text,
  published_at text,
  accessed_at text
);

CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);

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

CREATE TABLE IF NOT EXISTS sources_localizations (
  source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES supported_locales(locale),
  title text NOT NULL CHECK (btrim(title) <> ''),
  note text,
  translated_from_locale text REFERENCES supported_locales(locale)
    CHECK (translated_from_locale IS NULL OR translated_from_locale <> locale),
  content_updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_sources_localizations_locale
  ON sources_localizations(locale);

CREATE OR REPLACE FUNCTION set_sources_localization_content_updated_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
    OR NEW.note IS DISTINCT FROM OLD.note
    OR NEW.translated_from_locale IS DISTINCT FROM OLD.translated_from_locale THEN
    NEW.content_updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sources_localizations_content_updated_at ON sources_localizations;
CREATE TRIGGER trg_sources_localizations_content_updated_at
BEFORE UPDATE ON sources_localizations
FOR EACH ROW
EXECUTE FUNCTION set_sources_localization_content_updated_at();

DROP TRIGGER IF EXISTS trg_sources_localizations_updated_at ON sources_localizations;
CREATE TRIGGER trg_sources_localizations_updated_at
BEFORE UPDATE ON sources_localizations
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS nodes (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('country', 'organization', 'system')),
  country_code text CHECK (country_code IS NULL OR length(country_code) = 3),
  subtype text,
  url text,
  record_depth text NOT NULL DEFAULT 'stub' CHECK (record_depth IN ('stub', 'thin', 'rich')),
  properties_json jsonb NOT NULL DEFAULT '{}'::jsonb,
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
  review_state text NOT NULL DEFAULT 'agent_researched'
    CHECK (review_state IN ('agent_researched', 'human_reviewed', 'needs_revision')),
  reviewer_note text,
  reviewer text,
  last_reviewed timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (node_id, locale)
);

ALTER TABLE node_localizations
  DROP COLUMN IF EXISTS source_excerpt;

CREATE INDEX IF NOT EXISTS idx_node_localizations_locale
  ON node_localizations(locale);
CREATE INDEX IF NOT EXISTS idx_node_localizations_review_state
  ON node_localizations(review_state);
CREATE INDEX IF NOT EXISTS idx_node_localizations_locale_review_state
  ON node_localizations(locale, review_state);

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

CREATE TABLE IF NOT EXISTS node_review_history (
  node_id text PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
  history_json jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(history_json) = 'array')
);

-- Preserve only the latest known review metadata; earlier transitions are unknown.
INSERT INTO node_review_history (node_id, history_json)
SELECT n.id, coalesce(
  jsonb_agg(jsonb_build_object(
    'locale', l.locale,
    'kind', 'baseline',
    'from', NULL,
    'to', l.review_state,
    'actor', l.reviewer,
    'at', l.last_reviewed,
    'note', l.reviewer_note,
    'contentUpdatedAt', NULL
  ) ORDER BY l.last_reviewed NULLS FIRST, l.locale)
    FILTER (WHERE l.locale IS NOT NULL),
  '[]'::jsonb
)
FROM nodes n
LEFT JOIN node_localizations l ON l.node_id = n.id
GROUP BY n.id
ON CONFLICT (node_id) DO NOTHING;

CREATE OR REPLACE FUNCTION append_node_review_history()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND
    ROW(NEW.review_state, NEW.reviewer_note, NEW.reviewer, NEW.last_reviewed)
    IS NOT DISTINCT FROM
    ROW(OLD.review_state, OLD.reviewer_note, OLD.reviewer, OLD.last_reviewed) THEN
    RETURN NEW;
  END IF;

  INSERT INTO node_review_history (node_id, history_json)
  VALUES (NEW.node_id, jsonb_build_array(jsonb_build_object(
    'locale', NEW.locale,
    'kind', CASE WHEN TG_OP = 'INSERT' THEN 'initial' ELSE 'review' END,
    'from', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.review_state END,
    'to', NEW.review_state,
    'actor', CASE WHEN TG_OP = 'INSERT' OR
      ROW(NEW.reviewer, NEW.last_reviewed) IS DISTINCT FROM ROW(OLD.reviewer, OLD.last_reviewed)
      THEN NEW.reviewer ELSE NULL END,
    'at', CASE WHEN TG_OP = 'INSERT' THEN NEW.created_at ELSE clock_timestamp() END,
    'note', CASE WHEN TG_OP = 'INSERT' OR
      ROW(NEW.reviewer_note, NEW.reviewer, NEW.last_reviewed)
      IS DISTINCT FROM ROW(OLD.reviewer_note, OLD.reviewer, OLD.last_reviewed)
      THEN NEW.reviewer_note ELSE NULL END,
    'contentUpdatedAt', NEW.content_updated_at
  )))
  ON CONFLICT (node_id) DO UPDATE
  SET history_json = node_review_history.history_json || EXCLUDED.history_json;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_node_localizations_review_history ON node_localizations;
CREATE TRIGGER trg_node_localizations_review_history
AFTER INSERT OR UPDATE OF review_state, reviewer_note, reviewer, last_reviewed
ON node_localizations
FOR EACH ROW
EXECUTE FUNCTION append_node_review_history();

CREATE TABLE IF NOT EXISTS edges (
  id text PRIMARY KEY,
  source_node_id text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('governs', 'operates', 'part_of', 'publishes_to', 'syncs_to')),
  note text,
  properties_json jsonb NOT NULL DEFAULT '{}'::jsonb,
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
