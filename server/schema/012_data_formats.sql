BEGIN;

LOCK TABLE nodes, node_localizations IN SHARE ROW EXCLUSIVE MODE;

-- Normalize explicit encodings, not interfaces, layouts, or vague standard names.
-- A retained legacy claim is not newly verified evidence. Keep its source and
-- descriptions; unresolved claims need source-backed authoring after this release.
CREATE TEMP TABLE _ryu_format_conversion ON COMMIT DROP AS
WITH aliases(old_label, new_formats) AS (
  VALUES
    ('CSV and parquet snapshots', ARRAY['csv','parquet']),
    ('Parquet table snapshots', ARRAY['parquet']),
    ('Species-level XML downloads', ARRAY['xml']),
    ('Web pages / species summaries', ARRAY['html']),
    ('Darwin Core Archive', ARRAY['darwin_core_archive']),
    ('GenBank flat file', ARRAY['genbank_flatfile']),
    ('Esri file geodatabase download', ARRAY['esri_file_geodatabase'])
), mapped AS (
  SELECT n.id AS node_id, d.item, d.ordinality AS position,
    CASE
      WHEN lower(d.item->>'label') = ANY(ARRAY['csv','tsv','parquet','json','xml','html','pdf','netcdf','zarr','bufr','geojson','shapefile','geopackage','kml','esri_file_geodatabase','pmtiles','pbf','png','darwin_core_archive','fasta','fastq','genbank_flatfile','embl_flatfile'])
        THEN ARRAY[lower(d.item->>'label')]
      WHEN d.item->>'label' = 'Shapefile / GIS layers' AND n.id = 'marine-regions' THEN ARRAY['shapefile']
      -- The existing DLCD descriptor explicitly documents all three query formats.
      WHEN d.item->>'label' = 'GeoJSON and PBF query output' AND n.id = 'oregon-dlcd-coastal-gis' THEN ARRAY['geojson','pbf','json']
      -- The documented OSM endpoint is a PNG tile URL; XYZ remains an access method.
      WHEN d.item->>'label' = 'XYZ tile map images' AND n.id = 'openstreetmap-standard-raster-tiles' THEN ARRAY['png']
      ELSE aliases.new_formats
    END AS new_formats
  FROM nodes n
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(n.properties_json #> '{data,descriptors}') = 'array'
      THEN n.properties_json #> '{data,descriptors}' ELSE '[]'::jsonb END
  ) WITH ORDINALITY d(item, ordinality)
  LEFT JOIN aliases ON aliases.old_label = d.item->>'label'
  WHERE d.item->>'category' = 'format'
), expanded AS (
  SELECT m.*, f.new_format, f.ordinality AS expansion_position,
    CASE
      WHEN f.new_format IS NOT NULL THEN m.item || jsonb_build_object(
        'label', f.new_format,
        'id', CASE WHEN f.ordinality = 1 THEN m.item->>'id' ELSE (m.item->>'id') || '--format-' || f.new_format END)
      WHEN m.item->>'label' IN ('Darwin Core','Ecological Metadata Language','Extended MeasurementOrFact','re3data metadata schema')
        THEN m.item || '{"category":"standard"}'::jsonb
    END AS new_item
  FROM mapped m LEFT JOIN LATERAL unnest(m.new_formats) WITH ORDINALITY f(new_format, ordinality) ON true
)
SELECT *, row_number() OVER (PARTITION BY node_id, new_format ORDER BY
  (item->'source' IS NOT NULL AND item->'source' <> 'null'::jsonb) DESC,
  (item->>'label' = new_format) DESC, position, expansion_position) AS preference
FROM expanded;

CREATE TEMP TABLE _ryu_format_nodes ON COMMIT DROP AS
SELECT n.id, jsonb_agg(coalesce(c.new_item, d.item) ORDER BY d.ordinality, c.expansion_position)
  FILTER (WHERE c.node_id IS NULL OR (c.new_item IS NOT NULL AND (c.new_format IS NULL OR c.preference = 1))) AS descriptors
FROM nodes n
CROSS JOIN LATERAL jsonb_array_elements(n.properties_json #> '{data,descriptors}') WITH ORDINALITY d(item, ordinality)
LEFT JOIN _ryu_format_conversion c ON c.node_id = n.id AND c.position = d.ordinality
WHERE EXISTS (SELECT 1 FROM _ryu_format_conversion c WHERE c.node_id = n.id)
GROUP BY n.id;

-- Splitting must never overwrite an unrelated descriptor that happens to use
-- the generated ID. Resolve such a collision deliberately before retrying.
DO $$
BEGIN
  IF EXISTS (
    SELECT n.id FROM _ryu_format_nodes n, LATERAL jsonb_array_elements(n.descriptors) d
    GROUP BY n.id HAVING count(*) <> count(DISTINCT d->>'id')
  ) THEN RAISE EXCEPTION 'format migration would produce duplicate descriptor IDs'; END IF;
END;
$$;

-- Retain sourced prose from removed interface/backend claims in the profile,
-- with its citation. Do not silently turn those claims into Standards or formats.
WITH moved AS (
  SELECT l.node_id, l.locale, string_agg(d.item->>'description', E'\n\n' ORDER BY d.ordinality) AS description,
    jsonb_agg(DISTINCT CASE WHEN jsonb_typeof(c.item->'source') = 'string'
      THEN c.item->'source' ELSE c.item #> '{source,id}' END) AS refs
  FROM node_localizations l
  CROSS JOIN LATERAL jsonb_array_elements(l.details_json #> '{data,descriptors}') WITH ORDINALITY d(item, ordinality)
  JOIN _ryu_format_conversion c ON c.node_id = l.node_id AND c.item->>'id' = d.item->>'id'
  WHERE c.new_item IS NULL AND c.item->'source' IS NOT NULL AND c.item->'source' <> 'null'::jsonb
    AND nullif(btrim(d.item->>'description'), '') IS NOT NULL
  GROUP BY l.node_id, l.locale
)
UPDATE node_localizations l SET
  description = concat_ws(E'\n\n', nullif(l.description, ''), m.description),
  details_json = jsonb_set(l.details_json, '{profile}', coalesce(nullif(l.details_json->'profile', 'null'::jsonb), '{}'::jsonb) ||
    jsonb_build_object('sourceRefs', (SELECT jsonb_agg(DISTINCT ref) FROM jsonb_array_elements(
      coalesce(nullif(l.details_json #> '{profile,sourceRefs}', 'null'::jsonb), '[]'::jsonb) || m.refs) ref)))
FROM moved m WHERE m.node_id = l.node_id AND m.locale = l.locale;

WITH localized AS (
  SELECT l.node_id, l.locale, coalesce(jsonb_agg(
    CASE WHEN c.new_format IS NOT NULL THEN (d.item - 'label') || jsonb_build_object('id', c.new_item->'id') ELSE d.item END
    ORDER BY d.ordinality, c.expansion_position)
    FILTER (WHERE c.node_id IS NULL OR (c.new_item IS NOT NULL AND (c.new_format IS NULL OR c.preference = 1))), '[]'::jsonb) AS descriptors
  FROM node_localizations l
  CROSS JOIN LATERAL jsonb_array_elements(l.details_json #> '{data,descriptors}') WITH ORDINALITY d(item, ordinality)
  LEFT JOIN _ryu_format_conversion c ON c.node_id = l.node_id AND c.item->>'id' = d.item->>'id'
  WHERE EXISTS (SELECT 1 FROM _ryu_format_conversion c WHERE c.node_id = l.node_id)
  GROUP BY l.node_id, l.locale
)
UPDATE node_localizations l SET details_json = jsonb_set(l.details_json, '{data,descriptors}', c.descriptors)
FROM localized c WHERE c.node_id = l.node_id AND c.locale = l.locale
  AND l.details_json #> '{data,descriptors}' IS DISTINCT FROM c.descriptors;

UPDATE nodes n SET properties_json = jsonb_set(n.properties_json, '{data,descriptors}', coalesce(c.descriptors, '[]'::jsonb))
FROM _ryu_format_nodes c WHERE n.id = c.id
  AND n.properties_json #> '{data,descriptors}' IS DISTINCT FROM coalesce(c.descriptors, '[]'::jsonb);

COMMIT;
