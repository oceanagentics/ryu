BEGIN;

-- Apply after every Explorer service runs code that no longer queries this table.
DROP TABLE IF EXISTS saved_views;

COMMIT;
