-- Deploy the application without subtype reads/writes before applying this migration.
BEGIN;

ALTER TABLE nodes DROP COLUMN IF EXISTS subtype;

COMMIT;
