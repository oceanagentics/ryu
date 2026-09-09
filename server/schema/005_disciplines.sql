BEGIN;

LOCK TABLE nodes, node_localizations IN SHARE ROW EXCLUSIVE MODE;

-- Preserve explicit new tags and direct equivalents of old classifications.
-- Broad labels (biodiversity, aquatic_biodiversity, cross-domain) and unknown
-- values do not establish a discipline. Leave those for researched authoring.
WITH converted AS (
  SELECT id, (properties_json - 'role' - 'disciplineFamily') ||
    jsonb_build_object('disciplines', coalesce(properties_json->'disciplines',
      CASE properties_json->>'disciplineFamily'
        WHEN 'oceanography' THEN '["oceanography"]'::jsonb
        WHEN 'genetics' THEN '["genetics"]'::jsonb
        WHEN 'fisheries' THEN '["fisheries_science"]'::jsonb
        WHEN 'cartography' THEN '["geography"]'::jsonb
        WHEN 'coastal_planning' THEN '["spatial_planning"]'::jsonb
        WHEN 'fish_biodiversity' THEN '["zoology"]'::jsonb
        WHEN 'reference' THEN CASE WHEN id IN ('algaebase', 'molluscabase', 'worms')
          THEN '["taxonomy"]'::jsonb ELSE '[]'::jsonb END
        ELSE '[]'::jsonb
      END)) AS properties
  FROM nodes
  WHERE properties_json ?| ARRAY['role', 'disciplineFamily']
)
UPDATE nodes SET properties_json = converted.properties
FROM converted WHERE nodes.id = converted.id
  AND nodes.properties_json IS DISTINCT FROM converted.properties;

-- Retired metadata must not survive in localized details either.
UPDATE node_localizations SET details_json = details_json - 'role' - 'disciplineFamily'
WHERE details_json ?| ARRAY['role', 'disciplineFamily'];

COMMIT;
