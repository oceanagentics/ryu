BEGIN;

LOCK TABLE node_localizations IN ACCESS EXCLUSIVE MODE;
DROP TRIGGER IF EXISTS trg_node_localizations_review_history ON node_localizations;
DROP TABLE IF EXISTS node_review_history;
DROP FUNCTION IF EXISTS append_node_review_history();

ALTER TABLE node_localizations ADD COLUMN IF NOT EXISTS review_json jsonb;
-- Seed only the real current state. Earlier history is deliberately discarded.
UPDATE node_localizations AS l
SET review_json = jsonb_build_object('history', jsonb_build_array(jsonb_build_object(
  'state', coalesce(to_jsonb(l)->'review_state', '"agent_researched"'::jsonb),
  'reviewer', coalesce(to_jsonb(l)->'reviewer', 'null'::jsonb),
  'date', coalesce(to_jsonb(l)->'review_date', to_jsonb(l)->'last_reviewed', 'null'::jsonb),
  'note', coalesce(to_jsonb(l)->'reviewer_note', 'null'::jsonb)
)))
WHERE review_json IS NULL;

ALTER TABLE node_localizations
  DROP COLUMN IF EXISTS review_state,
  DROP COLUMN IF EXISTS reviewer_note,
  DROP COLUMN IF EXISTS reviewer,
  DROP COLUMN IF EXISTS review_date,
  DROP COLUMN IF EXISTS last_reviewed;

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

ALTER TABLE node_localizations
  ALTER COLUMN review_json SET NOT NULL,
  ALTER COLUMN review_json SET DEFAULT jsonb_build_object('history', jsonb_build_array(jsonb_build_object(
    'state', 'agent_researched', 'reviewer', NULL, 'date', CURRENT_TIMESTAMP, 'note', NULL))),
  DROP CONSTRAINT IF EXISTS node_localizations_review_json_check,
  ADD CONSTRAINT node_localizations_review_json_check CHECK (valid_localization_review(review_json));

CREATE INDEX IF NOT EXISTS idx_node_localizations_review_state
  ON node_localizations((review_json #>> '{history,-1,state}'));
CREATE INDEX IF NOT EXISTS idx_node_localizations_locale_review_state
  ON node_localizations(locale, (review_json #>> '{history,-1,state}'));

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

COMMIT;
