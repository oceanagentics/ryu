BEGIN;

LOCK TABLE nodes, edges IN ACCESS EXCLUSIVE MODE;

ALTER TABLE edges ADD COLUMN IF NOT EXISTS description text;

-- The production graph used note plus a small, closed set of prose properties.
-- Preserve each distinct value in the description before removing that shape.
DO $$
DECLARE
  unsupported text;
  malformed text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'edges' AND column_name = 'properties_json'
  ) THEN
    EXECUTE $audit$
      SELECT string_agg(DISTINCT property.key, ', ' ORDER BY property.key)
      FROM edges e
      CROSS JOIN LATERAL jsonb_each(e.properties_json) AS property
      WHERE property.key NOT IN (
        'sourceRefs', 'scope', 'status', 'transferMethod', 'period', 'updateFrequency',
        'intermediary', 'artifact', 'format', 'via', 'membershipStatus',
        'latestPublishedAt', 'sourceIndexReportedAt', 'award', 'cadence', 'latestSyncedAt'
      )
    $audit$ INTO unsupported;
    IF unsupported IS NOT NULL THEN
      RAISE EXCEPTION 'review unsupported edge properties before migration 018: %', unsupported;
    END IF;

    EXECUTE $audit$
      SELECT string_agg(DISTINCT property.key, ', ' ORDER BY property.key)
      FROM edges e
      CROSS JOIN LATERAL jsonb_each(e.properties_json - 'sourceRefs') AS property
      WHERE jsonb_typeof(property.value) IS DISTINCT FROM 'string'
        OR btrim(property.value #>> '{}') = ''
    $audit$ INTO malformed;
    IF malformed IS NOT NULL THEN
      RAISE EXCEPTION 'review malformed edge properties before migration 018: %', malformed;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'edges' AND column_name = 'note'
    ) THEN
      EXECUTE $update$
        WITH prose AS (
          SELECT e.id, string_agg(
            CASE property.key
              WHEN 'scope' THEN 'The documented scope is ' || (property.value #>> '{}')
              WHEN 'status' THEN 'The documented status is ' || (property.value #>> '{}')
              WHEN 'transferMethod' THEN 'The documented transfer method is ' || (property.value #>> '{}')
              WHEN 'period' THEN 'The documented period is ' || (property.value #>> '{}')
              WHEN 'updateFrequency' THEN 'The documented update frequency is ' || (property.value #>> '{}')
              WHEN 'intermediary' THEN 'The relationship is mediated by ' || (property.value #>> '{}')
              WHEN 'artifact' THEN 'The documented artifact is ' || (property.value #>> '{}')
              WHEN 'format' THEN 'The documented format is ' || (property.value #>> '{}')
              WHEN 'via' THEN 'The relationship passes through ' || (property.value #>> '{}')
              WHEN 'membershipStatus' THEN 'The documented membership status is ' || (property.value #>> '{}')
              WHEN 'latestPublishedAt' THEN 'The latest documented publication date is ' || (property.value #>> '{}')
              WHEN 'sourceIndexReportedAt' THEN 'The source index reported the relationship at ' || (property.value #>> '{}')
              WHEN 'award' THEN 'The documented award is ' || (property.value #>> '{}')
              WHEN 'cadence' THEN 'The documented cadence is ' || (property.value #>> '{}')
              WHEN 'latestSyncedAt' THEN 'The latest documented transfer date is ' || (property.value #>> '{}')
            END || CASE WHEN right((property.value #>> '{}'), 1) ~ '[.!?]' THEN '' ELSE '.' END,
            ' ' ORDER BY CASE property.key
              WHEN 'scope' THEN 1 WHEN 'status' THEN 2 WHEN 'period' THEN 3
              WHEN 'transferMethod' THEN 4 WHEN 'updateFrequency' THEN 5 WHEN 'cadence' THEN 6
              WHEN 'intermediary' THEN 7 WHEN 'via' THEN 8 WHEN 'format' THEN 9
              WHEN 'artifact' THEN 10 WHEN 'award' THEN 11 WHEN 'membershipStatus' THEN 12
              WHEN 'latestPublishedAt' THEN 13 WHEN 'latestSyncedAt' THEN 14
              WHEN 'sourceIndexReportedAt' THEN 15 END
          ) FILTER (WHERE position(lower((property.value #>> '{}')) IN lower(coalesce(e.note, ''))) = 0) AS details
          FROM edges e
          CROSS JOIN LATERAL jsonb_each(e.properties_json - 'sourceRefs') AS property
          GROUP BY e.id
        )
        UPDATE edges e SET description = concat_ws(' ', nullif(btrim(e.note), ''), prose.details)
        FROM prose WHERE prose.id = e.id AND nullif(btrim(e.description), '') IS NULL
      $update$;
      EXECUTE $update$
        UPDATE edges SET description = btrim(note)
        WHERE nullif(btrim(description), '') IS NULL AND nullif(btrim(note), '') IS NOT NULL
      $update$;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM edges WHERE nullif(btrim(description), '') IS NULL) THEN
    RAISE EXCEPTION 'every edge needs a nonempty description before migration 018';
  END IF;
  IF EXISTS (SELECT 1 FROM edges WHERE sources = '{}'::jsonb OR NOT valid_owned_sources(sources)) THEN
    RAISE EXCEPTION 'every edge needs valid evidence sources before migration 018';
  END IF;
END $$;

SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_kind_check;
DROP TRIGGER IF EXISTS trg_edges_endpoint_kinds ON edges;
DROP TRIGGER IF EXISTS trg_nodes_relationship_kinds ON nodes;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM edges WHERE kind NOT IN (
    'governs', 'operates', 'funds', 'member_of', 'member',
    'publishes_to', 'contributes', 'syncs_to', 'transfers'
  )) THEN
    RAISE EXCEPTION 'review unsupported edge kinds before migration 018';
  END IF;
  IF EXISTS (
    SELECT 1 FROM edges
    GROUP BY CASE kind
      WHEN 'member_of' THEN 'member'
      WHEN 'publishes_to' THEN 'contributes'
      WHEN 'syncs_to' THEN 'transfers'
      ELSE kind END, source_node_id, target_node_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'edge kind rename would create duplicate relationships in migration 018';
  END IF;
END $$;

UPDATE edges SET kind = CASE kind
  WHEN 'member_of' THEN 'member'
  WHEN 'publishes_to' THEN 'contributes'
  WHEN 'syncs_to' THEN 'transfers'
  ELSE kind END;

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

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM edges e
    JOIN nodes s ON s.id = e.source_node_id
    JOIN nodes t ON t.id = e.target_node_id
    WHERE NOT valid_edge_endpoints(e.kind, s.kind, t.kind)
  ) THEN
    RAISE EXCEPTION 'existing relationships violate the revised endpoint contract';
  END IF;
END $$;

ALTER TABLE edges
  DROP CONSTRAINT IF EXISTS edges_description_check,
  DROP CONSTRAINT IF EXISTS edges_sources_check,
  DROP CONSTRAINT IF EXISTS edges_source_refs_check;
ALTER TABLE edges
  ALTER COLUMN description SET NOT NULL,
  ADD CONSTRAINT edges_kind_check CHECK (kind IN ('governs', 'operates', 'funds', 'member', 'contributes', 'transfers')),
  ADD CONSTRAINT edges_description_check CHECK (btrim(description) <> ''),
  ADD CONSTRAINT edges_sources_check CHECK (sources <> '{}'::jsonb AND valid_owned_sources(sources));

ALTER TABLE edges DROP COLUMN IF EXISTS note;
ALTER TABLE edges DROP COLUMN IF EXISTS properties_json;

CREATE OR REPLACE FUNCTION enforce_edge_endpoints()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_kind text; target_kind text;
BEGIN
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

CREATE TRIGGER trg_edges_endpoint_kinds BEFORE INSERT OR UPDATE OF kind, source_node_id, target_node_id ON edges
FOR EACH ROW EXECUTE FUNCTION enforce_edge_endpoints();
CREATE TRIGGER trg_nodes_relationship_kinds BEFORE UPDATE OF kind ON nodes
FOR EACH ROW WHEN (NEW.kind IS DISTINCT FROM OLD.kind) EXECUTE FUNCTION enforce_node_relationship_kinds();

COMMIT;
