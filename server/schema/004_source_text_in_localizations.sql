BEGIN;

LOCK TABLE sources, sources_localizations, nodes, node_localizations, edges, ryu_routes
  IN SHARE ROW EXCLUSIVE MODE;

-- Keep existing translations. Legacy source text used English as the default;
-- prefer an existing matching locale when the text is already localized.
DO $$
DECLARE
  source_row record;
  target_locale text;
  target_note text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'sources' AND column_name = 'title') THEN
    FOR source_row IN SELECT id, title, note FROM sources ORDER BY id LOOP
      SELECT locale, note INTO target_locale, target_note
      FROM sources_localizations
      WHERE source_id = source_row.id AND title = source_row.title
      ORDER BY (locale = 'en') DESC, (translated_from_locale IS NULL) DESC, locale
      LIMIT 1;

      IF target_locale IS NULL THEN
        IF EXISTS (SELECT 1 FROM sources_localizations WHERE source_id = source_row.id AND locale = 'en') THEN
          RAISE EXCEPTION 'Source % has conflicting title text; preserve it in the appropriate localization before rerunning', source_row.id;
        END IF;
        INSERT INTO sources_localizations (source_id, locale, title, note)
        VALUES (source_row.id, 'en', source_row.title, source_row.note);
      ELSIF source_row.note IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM sources_localizations WHERE source_id = source_row.id AND note = source_row.note
      ) THEN
        IF target_note IS NOT NULL THEN
          RAISE EXCEPTION 'Source % has conflicting note text; preserve it in the appropriate localization before rerunning', source_row.id;
        END IF;
        UPDATE sources_localizations SET note = source_row.note
        WHERE source_id = source_row.id AND locale = target_locale;
      END IF;
    END LOOP;

    ALTER TABLE sources DROP COLUMN title, DROP COLUMN note;
  END IF;
END $$;

-- Embedded citation labels now resolve from sources_localizations.
CREATE OR REPLACE FUNCTION pg_temp.strip_source_text(value jsonb, source_ref boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  result jsonb;
BEGIN
  IF jsonb_typeof(value) = 'array' THEN
    SELECT coalesce(jsonb_agg(pg_temp.strip_source_text(item) ORDER BY position), '[]'::jsonb)
      INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS items(item, position);
    RETURN result;
  ELSIF jsonb_typeof(value) = 'object' THEN
    IF source_ref OR value->>'id' LIKE 'src-%' THEN
      value := value - 'title' - 'note';
    END IF;
    SELECT coalesce(jsonb_object_agg(key, pg_temp.strip_source_text(item, key = 'source')), '{}'::jsonb)
      INTO result FROM jsonb_each(value) AS items(key, item);
    RETURN result;
  END IF;
  RETURN value;
END $$;

UPDATE nodes SET properties_json = pg_temp.strip_source_text(properties_json)
WHERE properties_json IS DISTINCT FROM pg_temp.strip_source_text(properties_json);
UPDATE node_localizations SET details_json = pg_temp.strip_source_text(details_json)
WHERE details_json IS DISTINCT FROM pg_temp.strip_source_text(details_json);
UPDATE edges SET properties_json = pg_temp.strip_source_text(properties_json)
WHERE properties_json IS DISTINCT FROM pg_temp.strip_source_text(properties_json);
UPDATE ryu_routes SET properties_json = pg_temp.strip_source_text(properties_json)
WHERE properties_json IS DISTINCT FROM pg_temp.strip_source_text(properties_json);

COMMIT;
