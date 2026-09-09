BEGIN;

LOCK TABLE nodes, edges, node_localizations IN ACCESS EXCLUSIVE MODE;

-- Review and remove legacy composition edges through the record API first.
-- Membership is a researched assertion, never an automatic part_of rename.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM edges WHERE kind = 'part_of') THEN
    RAISE EXCEPTION 'Review and remove legacy part_of edges before applying 009_relationship_contract.sql';
  END IF;
END $$;

UPDATE node_localizations SET review_json = jsonb_build_object('history', review_json->'history' || jsonb_build_array(
  jsonb_build_object('state', 'needs_revision', 'reviewer', NULL, 'date', clock_timestamp(),
    'note', 'Country affiliation fields retired; relationship review is required.')
)) WHERE node_id IN (
  SELECT id FROM nodes WHERE (kind <> 'country' AND country_code IS NOT NULL) OR record_depth = 'rich'
) AND review_json #>> '{history,-1,state}' <> 'needs_revision';

UPDATE nodes SET country_code = NULL WHERE kind <> 'country' AND country_code IS NOT NULL;
-- Existing rich records must pass the new aggregate criteria before promotion.
UPDATE nodes SET record_depth = 'thin' WHERE record_depth = 'rich' AND EXISTS (
  SELECT 1 FROM unnest(ARRAY['ar','zh','en','fr','ru','es']) AS required(locale)
  WHERE NOT EXISTS (
    SELECT 1 FROM node_localizations l WHERE l.node_id = nodes.id AND l.locale = required.locale
      AND l.details_json->'relationshipReview'->'findings' ?& ARRAY['governs','operates','funds','member_of','publishes_to','syncs_to']
  )
);

ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_country_identity_check;
ALTER TABLE nodes ADD CONSTRAINT nodes_country_identity_check CHECK (kind = 'country' OR country_code IS NULL);
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_kind_check;
ALTER TABLE edges ADD CONSTRAINT edges_kind_check CHECK (kind IN ('governs', 'operates', 'funds', 'member_of', 'publishes_to', 'syncs_to'));
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

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM edges e JOIN nodes s ON s.id = e.source_node_id JOIN nodes t ON t.id = e.target_node_id
    WHERE NOT valid_edge_endpoints(e.kind, s.kind, t.kind)) THEN
    RAISE EXCEPTION 'existing relationships violate the six-type endpoint contract';
  END IF;
END $$;

COMMIT;
