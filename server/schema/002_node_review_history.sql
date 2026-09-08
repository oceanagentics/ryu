BEGIN;

-- Prevent review writes between the baseline snapshot and trigger installation.
LOCK TABLE node_localizations IN SHARE ROW EXCLUSIVE MODE;

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'explorer_read') THEN
    GRANT SELECT ON node_review_history TO explorer_read;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'explorer_write') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON node_review_history TO explorer_write;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'explorer_schema_admin') THEN
    GRANT ALL PRIVILEGES ON node_review_history TO explorer_schema_admin;
  END IF;
END $$;

COMMIT;
