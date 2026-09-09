BEGIN;

LOCK TABLE nodes, node_localizations IN SHARE ROW EXCLUSIVE MODE;

-- Convert documented equivalents. Broad or ambiguous labels do not establish
-- a type. Keep a single existing descriptor and its source/localizations per
-- approved type; prefer already-canonical and sourced descriptors.
CREATE TEMP TABLE _ryu_type_conversion ON COMMIT DROP AS
WITH aliases(old_label, new_type) AS (
  VALUES
    ('Taxonomy / nomenclature', 'taxonomic_records'),
    ('Taxonomy and nomenclature', 'taxonomic_records'),
    ('Taxonomy', 'taxonomic_records'),
    ('Sample / biosample', 'sample_records'),
    ('Model / forecast / reanalysis', 'model_outputs'),
    ('Images / media', 'media'),
    ('Images and media', 'media'),
    ('Literature / reference', 'bibliographic_records'),
    ('References and provenance', 'bibliographic_records'),
    ('Life history and population dynamics', 'biological_traits'),
    ('Species biology profiles', 'biological_traits'),
    ('Traits / ecology', 'biological_traits'),
    ('Ecology and trophic data', 'biological_interactions'),
    ('Software artifact', 'software'),
    ('Port-level pounds and value tables', 'fisheries_statistics'),
    ('Fishery use and value grids and polygons', 'geographic_reference_data'),
    ('Cetacean biologically important area polygons', 'geographic_reference_data'),
    ('Marine mammal distribution and concentration polygons', 'geographic_reference_data'),
    ('OpenStreetMap-derived reference map', 'geographic_reference_data'),
    ('OpenStreetMap-derived basemap', 'geographic_reference_data'),
    ('Coastal zone and shoreline boundaries', 'geographic_reference_data'),
    ('Rocky habitat and renewable energy planning areas', 'geographic_reference_data')
), mapped AS (
  SELECT n.id AS node_id, d.item, d.ordinality AS position,
    CASE
      WHEN d.item->>'label' = ANY(ARRAY['taxonomic_records', 'occurrence_records', 'survey_records', 'biological_traits', 'biological_interactions', 'sample_records', 'sequence_data', 'environmental_measurements', 'model_outputs', 'fisheries_statistics', 'geographic_reference_data', 'bathymetry', 'platform_records', 'media', 'bibliographic_records', 'catalogue_records', 'documents', 'software']) THEN d.item->>'label'
      WHEN d.item->>'label' IN ('Physical oceanography', 'Chemical / biogeochemical', 'Atmospheric time series')
        THEN CASE WHEN n.id = 'bio-oracle' THEN 'model_outputs' ELSE 'environmental_measurements' END
      WHEN d.item->>'label' = 'Environmental layers'
        THEN CASE n.id WHEN 'bio-oracle' THEN 'model_outputs' WHEN 'seadatanet' THEN 'environmental_measurements' END
      WHEN d.item->>'label' = 'Occurrence / observation'
        THEN CASE WHEN n.id IN ('algaebase', 'bismal', 'emodnet-biology', 'eurobis', 'gbif', 'molluscabase', 'platform-obis', 'worms', 'bold') THEN 'occurrence_records' END
      WHEN d.item->>'label' IN ('Distribution and occurrence reports', 'Distribution and map-linked records')
        AND n.id IN ('fishbase', 'sealifebase') THEN 'occurrence_records'
      WHEN d.item->>'label' = 'Genomic / sequence'
        THEN CASE WHEN n.id = 'ggbn' THEN 'sample_records'
          WHEN n.id IN ('bold', 'ddbj', 'ena', 'genbank', 'geome', 'insdc', 'mgnify') THEN 'sequence_data' END
      WHEN d.item->>'label' = 'Geographic / spatial'
        AND n.id = 'marine-regions' THEN 'geographic_reference_data'
      WHEN d.item->>'label' = 'Metadata catalogue / registry'
        THEN CASE WHEN n.id = 'ggbn' THEN 'sample_records'
          WHEN n.id IN ('ddbj', 'ena', 'genbank') THEN 'sequence_data'
          WHEN n.id = 'oceanops' THEN 'platform_records'
          WHEN n.id <> 'platform-bbnj-chm' THEN 'catalogue_records' END
      WHEN d.item->>'label' = 'Platform / instrument status'
        AND n.id <> 'oceaninfohub' THEN 'platform_records'
      WHEN d.item->>'label' = 'Fisheries catch / effort'
        THEN CASE WHEN n.id = 'datras' THEN 'survey_records'
          WHEN n.id <> 'noaa-ncei-marine' THEN 'fisheries_statistics' END
      WHEN d.item->>'label' = 'Aquaculture / production statistics'
        AND n.id = 'fao-fishstat' THEN 'fisheries_statistics'
      WHEN d.item->>'label' = 'Bathymetry / geology / imagery'
        AND n.id = 'noaa-ncei-marine' THEN 'bathymetry'
      WHEN d.item->>'label' = 'Research artifact / publication'
        AND n.id = 'zenodo' THEN 'documents'
      ELSE aliases.new_type
    END AS new_type
  FROM nodes n
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(n.properties_json #> '{data,descriptors}') = 'array'
      THEN n.properties_json #> '{data,descriptors}' ELSE '[]'::jsonb END
  ) WITH ORDINALITY d(item, ordinality)
  LEFT JOIN aliases ON aliases.old_label = d.item->>'label'
  WHERE d.item->>'category' = 'type'
)
SELECT *, row_number() OVER (PARTITION BY node_id, new_type ORDER BY
  (item->>'label' = new_type) DESC, (item #>> '{source,id}' IS NOT NULL) DESC, position) AS preference
FROM mapped;

UPDATE node_localizations l SET details_json = jsonb_set(l.details_json, '{data,descriptors}', (
  SELECT coalesce(jsonb_agg(
    CASE WHEN c.new_type IS NOT NULL THEN d.item - 'label' ELSE d.item END ORDER BY d.ordinality), '[]'::jsonb)
  FROM jsonb_array_elements(l.details_json #> '{data,descriptors}') WITH ORDINALITY d(item, ordinality)
  LEFT JOIN _ryu_type_conversion c ON c.node_id = l.node_id AND c.item->>'id' = d.item->>'id'
  WHERE c.node_id IS NULL OR (c.new_type IS NOT NULL AND c.preference = 1)
))
WHERE jsonb_typeof(l.details_json #> '{data,descriptors}') = 'array'
  AND EXISTS (SELECT 1 FROM _ryu_type_conversion c WHERE c.node_id = l.node_id
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(l.details_json #> '{data,descriptors}') d
      WHERE d->>'id' = c.item->>'id' AND (d ? 'label' OR c.new_type IS NULL OR c.preference > 1)));

UPDATE nodes n SET properties_json = jsonb_set(n.properties_json, '{data,descriptors}', (
  SELECT coalesce(jsonb_agg(
    CASE WHEN c.new_type IS NOT NULL THEN jsonb_set(d.item, '{label}', to_jsonb(c.new_type)) ELSE d.item END
    ORDER BY d.ordinality), '[]'::jsonb)
  FROM jsonb_array_elements(n.properties_json #> '{data,descriptors}') WITH ORDINALITY d(item, ordinality)
  LEFT JOIN _ryu_type_conversion c ON c.node_id = n.id AND c.position = d.ordinality
  WHERE c.node_id IS NULL OR (c.new_type IS NOT NULL AND c.preference = 1)
))
WHERE EXISTS (SELECT 1 FROM _ryu_type_conversion c WHERE c.node_id = n.id
  AND (c.new_type IS DISTINCT FROM c.item->>'label' OR c.preference > 1));

COMMIT;
