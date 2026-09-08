BEGIN;

ALTER TABLE sources_localizations
  DROP COLUMN IF EXISTS review_state,
  DROP COLUMN IF EXISTS reviewer_note,
  DROP COLUMN IF EXISTS reviewer,
  DROP COLUMN IF EXISTS last_reviewed;

COMMIT;
