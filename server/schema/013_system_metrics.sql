BEGIN;

LOCK TABLE nodes, node_localizations IN SHARE ROW EXCLUSIVE MODE;

-- One-time conversion of the pre-013 fields. New records use properties.metrics.
-- Unapproved measurements remain sourced profile prose, never invented metric keys.
CREATE TEMP TABLE _ryu_metric_conversion ON COMMIT DROP AS
WITH legacy AS (
  SELECT n.id AS node_id, m.item, m.position
  FROM nodes n CROSS JOIN LATERAL jsonb_array_elements(
    jsonb_build_array(n.properties_json #> '{data,recordCount}', n.properties_json #> '{data,storageSize}')
    || coalesce(n.properties_json->'usage', '[]'::jsonb)
  ) WITH ORDINALITY m(item, position)
  WHERE m.item <> 'null'::jsonb
), mapped AS (
  SELECT *, CASE
    WHEN item->>'key' = 'record_count' AND item->>'unit' IN ('species', 'species records') THEN 'species_count'
    WHEN item->>'key' = 'contributor_count' AND item->>'unit' = 'collaborators' THEN 'contributor_count'
    WHEN item->>'unit' = CASE item->>'key'
      WHEN 'record_count' THEN 'records' WHEN 'occurrence_count' THEN 'occurrences'
      WHEN 'sample_count' THEN 'samples' WHEN 'sequence_count' THEN 'sequences'
      WHEN 'species_count' THEN 'species' WHEN 'storage_size_bytes' THEN 'bytes'
      WHEN 'session_count' THEN 'sessions' WHEN 'download_count' THEN 'downloads'
      WHEN 'contributor_count' THEN 'contributors' WHEN 'citation_count' THEN 'citations'
    END THEN item->>'key'
    -- view_count is deliberately not mapped: visits are not sessions, and the
    -- SeaLifeBase monthly-session interpretation needs source verification.
  END AS new_key FROM legacy
)
SELECT *, CASE WHEN new_key IS NOT NULL THEN
  (item - 'unit') || jsonb_build_object('key', new_key, 'observedAt', item->'observedAt')
END AS new_item FROM mapped;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _ryu_metric_conversion c JOIN nodes n ON n.id = c.node_id
    WHERE jsonb_typeof(c.item) IS DISTINCT FROM 'object'
      OR jsonb_typeof(c.item->'id') IS DISTINCT FROM 'string'
      OR nullif(btrim(c.item->>'id'), '') IS NULL
      OR jsonb_typeof(c.item->'key') IS DISTINCT FROM 'string'
      OR jsonb_typeof(c.item->'unit') IS DISTINCT FROM 'string'
      OR jsonb_typeof(c.item->'value') IS DISTINCT FROM 'number'
      OR jsonb_typeof(c.item->'source') IS DISTINCT FROM 'string'
      OR NOT n.sources ? (c.item->>'source')
      OR c.item - ARRAY['id','key','value','unit','observedAt','source'] <> '{}'::jsonb
  ) THEN RAISE EXCEPTION 'metric migration requires valid legacy observations and owner-local sources'; END IF;
  IF EXISTS (SELECT 1 FROM _ryu_metric_conversion
    WHERE (item->>'value')::numeric < 0 OR (item->>'value')::numeric > 9007199254740991
  ) THEN RAISE EXCEPTION 'metric migration value outside safe numeric range'; END IF;
  IF EXISTS (
    SELECT node_id FROM (
      SELECT node_id, item->>'id' AS id FROM _ryu_metric_conversion
      UNION ALL
      SELECT n.id, m->>'id' FROM nodes n, LATERAL jsonb_array_elements(coalesce(n.properties_json->'metrics', '[]'::jsonb)) m
    ) ids GROUP BY node_id HAVING count(*) <> count(DISTINCT id)
  ) THEN RAISE EXCEPTION 'metric migration would produce duplicate metric IDs'; END IF;
  IF EXISTS (SELECT 1 FROM _ryu_metric_conversion c WHERE NOT EXISTS (
    SELECT 1 FROM node_localizations l WHERE l.node_id = c.node_id
  )) THEN RAISE EXCEPTION 'metric migration requires localizations to preserve descriptions'; END IF;
END;
$$;

-- Preserve descriptions and numeric claims in every existing localization.
-- A conversion does not certify the research or change review history/depth.
DO $$
DECLARE l record; c record; old_items jsonb; translated jsonb; details jsonb;
  metrics jsonb; prose text; refs jsonb; gaps jsonb; data_gap text;
BEGIN
  FOR l IN SELECT loc.* FROM node_localizations loc
    WHERE loc.details_json ? 'usage' OR (loc.details_json->'data') ?| ARRAY['recordCount','storageSize']
      OR EXISTS (SELECT 1 FROM _ryu_metric_conversion conv WHERE conv.node_id = loc.node_id)
  LOOP
    details := l.details_json;
    old_items := jsonb_build_array(details #> '{data,recordCount}', details #> '{data,storageSize}')
      || coalesce(details->'usage', '[]'::jsonb);
    IF (SELECT count(*) <> count(DISTINCT m->>'id') FROM jsonb_array_elements(old_items) m WHERE m <> 'null'::jsonb)
    THEN RAISE EXCEPTION 'duplicate localized metric IDs on %/%', l.node_id, l.locale; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(old_items) m WHERE m <> 'null'::jsonb
      AND NOT EXISTS (SELECT 1 FROM _ryu_metric_conversion conv WHERE conv.node_id = l.node_id AND conv.item->>'id' = m->>'id'))
    THEN RAISE EXCEPTION 'orphaned localized metric on %/%', l.node_id, l.locale; END IF;
    metrics := coalesce(details->'metrics', '[]'::jsonb);
    prose := l.description;
    refs := coalesce(details #> '{profile,sourceRefs}', '[]'::jsonb);
    FOR c IN SELECT * FROM _ryu_metric_conversion WHERE node_id = l.node_id ORDER BY position LOOP
      SELECT m INTO translated FROM jsonb_array_elements(old_items) m WHERE m->>'id' = c.item->>'id';
      IF c.new_item IS NOT NULL THEN
        metrics := metrics || jsonb_build_array(jsonb_build_object(
          'id', c.item->'id', 'description', nullif(concat_ws(' ',
            nullif(translated->>'label', ''), nullif(translated->>'unit', ''), translated->>'description'), '')));
      ELSE
        prose := concat_ws(E'\n\n', nullif(prose, ''), concat_ws(' ',
          nullif(translated->>'label', ''), c.item->>'value',
          coalesce(translated->>'unit', c.item->>'unit', c.item->>'key'),
          CASE WHEN c.item->>'observedAt' IS NOT NULL THEN '(' || (c.item->>'observedAt') || ').' END,
          translated->>'description'));
        refs := refs || jsonb_build_array(c.item->'source');
      END IF;
    END LOOP;
    details := (details - 'usage') #- '{data,recordCount}' #- '{data,storageSize}';
    details := jsonb_set(details, '{metrics}', metrics);
    IF prose IS DISTINCT FROM l.description THEN
      details := jsonb_set(details, '{profile}', coalesce(nullif(details->'profile', 'null'::jsonb), '{}'::jsonb)
        || jsonb_build_object('sourceRefs', (SELECT jsonb_agg(DISTINCT ref) FROM jsonb_array_elements(refs) ref)));
    END IF;
    gaps := details->'researchGaps';
    IF gaps ?| ARRAY['recordCount','storageSize'] THEN
      data_gap := concat_ws(' ', nullif(gaps->>'data', ''), nullif(gaps->>'recordCount', ''), nullif(gaps->>'storageSize', ''));
      gaps := gaps - ARRAY['recordCount','storageSize'];
      IF data_gap <> '' THEN gaps := gaps || jsonb_build_object('data', data_gap); END IF;
      details := jsonb_set(details, '{researchGaps}', gaps);
    END IF;
    UPDATE node_localizations SET details_json = details, description = prose
      WHERE node_id = l.node_id AND locale = l.locale;
  END LOOP;
END;
$$;

UPDATE nodes n SET properties_json = jsonb_set(
  (n.properties_json - 'usage') #- '{data,recordCount}' #- '{data,storageSize}',
  '{metrics}', coalesce(n.properties_json->'metrics', '[]'::jsonb) || coalesce((
    SELECT jsonb_agg(c.new_item ORDER BY c.position) FROM _ryu_metric_conversion c
    WHERE c.node_id = n.id AND c.new_item IS NOT NULL
  ), '[]'::jsonb))
WHERE n.properties_json ? 'usage' OR (n.properties_json->'data') ?| ARRAY['recordCount','storageSize'];

COMMIT;
