BEGIN;

LOCK TABLE nodes, node_localizations IN SHARE ROW EXCLUSIVE MODE;

UPDATE nodes SET properties_json = properties_json - 'geographicScope'
WHERE properties_json ? 'geographicScope';

UPDATE node_localizations SET details_json = details_json - 'geographicScope'
WHERE details_json ? 'geographicScope';

COMMIT;
