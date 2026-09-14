BEGIN;

LOCK TABLE nodes, node_localizations, ryu_routes IN ACCESS EXCLUSIVE MODE;

-- Complete the kind-specific contracts without changing the shared tables.
CREATE OR REPLACE FUNCTION valid_node_kind_fields(kind text, value jsonb, section text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE fields text[];
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF section = 'record' THEN
    fields := ARRAY['id','kind','record_depth','properties_json','sources','created_at','updated_at'];
    CASE kind
      WHEN 'country' THEN fields := fields || ARRAY['country_code'];
      WHEN 'organization', 'system' THEN fields := fields || ARRAY['url'];
      ELSE RETURN false;
    END CASE;
  ELSIF section = 'localization' AND kind IN ('country','organization','system') THEN
    fields := ARRAY['node_id','locale','title','summary','details_json','translated_from_locale','content_updated_at','review_json','created_at','updated_at'];
    IF kind IN ('organization','system') THEN fields := fields || ARRAY['description']; END IF;
  ELSE RETURN false;
  END IF;
  -- Nulls in shared physical columns do not become fields in a typed record.
  RETURN NOT EXISTS (SELECT 1 FROM jsonb_each(value) entry
    WHERE entry.value <> 'null'::jsonb AND NOT entry.key = ANY(fields));
END;
$$;

-- Audit before installing guards. Incompatible content requires an explicit
-- reviewed repair; this migration never drops fields, locales, sources or routes.
DO $$
DECLARE invalid text;
BEGIN
  SELECT string_agg(id, ', ' ORDER BY id) INTO invalid FROM nodes n
  WHERE NOT valid_node_kind_fields(kind, to_jsonb(n), 'record')
    OR NOT CASE kind
      WHEN 'country' THEN valid_country_record_object(properties_json, 'properties')
      WHEN 'organization' THEN valid_organization_record_object(properties_json, 'properties')
      WHEN 'system' THEN valid_system_record_object(properties_json, 'properties')
      ELSE false END
    OR (kind <> 'system' AND EXISTS (SELECT 1 FROM ryu_routes r WHERE r.node_id = n.id));
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'review node contracts before migration 017: %', invalid; END IF;
  SELECT string_agg(l.node_id || '/' || l.locale, ', ' ORDER BY l.node_id, l.locale) INTO invalid
  FROM node_localizations l JOIN nodes n ON n.id = l.node_id
  WHERE NOT valid_node_kind_fields(n.kind, to_jsonb(l), 'localization')
    OR NOT CASE n.kind
      WHEN 'country' THEN valid_country_record_object(l.details_json, 'details')
      WHEN 'organization' THEN valid_organization_record_object(l.details_json, 'details')
      WHEN 'system' THEN valid_system_record_object(l.details_json, 'details')
      ELSE false END;
  IF invalid IS NOT NULL THEN RAISE EXCEPTION 'review localization contracts before migration 017: %', invalid; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_node_kind_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id text; owner record; loc record;
BEGIN
  IF TG_TABLE_NAME = 'nodes' THEN owner_id := NEW.id; ELSE owner_id := NEW.node_id; END IF;
  SELECT * INTO owner FROM nodes WHERE id = owner_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT valid_node_kind_fields(owner.kind, to_jsonb(owner), 'record') THEN
    RAISE EXCEPTION '% % does not match the canonical record fields', owner.kind, owner_id USING ERRCODE = '23514';
  END IF;
  FOR loc IN SELECT * FROM node_localizations WHERE node_id = owner_id LOOP
    IF NOT valid_node_kind_fields(owner.kind, to_jsonb(loc), 'localization') THEN
      RAISE EXCEPTION '% %/% does not match the canonical localization fields', owner.kind, owner_id, loc.locale USING ERRCODE = '23514';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM ryu_routes WHERE node_id = owner_id) AND owner.kind <> 'system' THEN
    RAISE EXCEPTION '% % does not have a routes section', owner.kind, owner_id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_nodes_kind_fields ON nodes;
CREATE CONSTRAINT TRIGGER trg_nodes_kind_fields AFTER INSERT OR UPDATE ON nodes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_node_kind_fields();
DROP TRIGGER IF EXISTS trg_localizations_kind_fields ON node_localizations;
CREATE CONSTRAINT TRIGGER trg_localizations_kind_fields AFTER INSERT OR UPDATE ON node_localizations
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_node_kind_fields();
DROP TRIGGER IF EXISTS trg_routes_kind_fields ON ryu_routes;
CREATE CONSTRAINT TRIGGER trg_routes_kind_fields AFTER INSERT OR UPDATE ON ryu_routes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_node_kind_fields();

COMMIT;
