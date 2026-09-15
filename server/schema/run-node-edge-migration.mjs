import assert from 'node:assert/strict';
import fs from 'node:fs';
import pg from 'pg';

const migrationId = '2026-09-14-node-edge-contracts';
const migrations = [
  '015_country_record_shape.sql',
  '016_organization_record_shape.sql',
  '017_node_kind_contracts.sql',
  '018_edge_revision.sql',
];
const apply = process.argv.includes('--apply');
const backupId = process.env.BACKUP_ID;
if (apply && !backupId) throw new Error('BACKUP_ID is required with --apply');

const db = new pg.Client();
await db.connect();

const audit = async () => (await db.query(`SELECT
  (SELECT count(*)::int FROM nodes) AS nodes,
  (SELECT count(*)::int FROM node_localizations) AS localizations,
  (SELECT count(*)::int FROM edges) AS edges,
  (SELECT count(*)::int FROM ryu_routes) AS routes,
  (SELECT count(*)::int FROM saved_views) AS views,
  (SELECT md5(string_agg(id || kind || coalesce(CASE WHEN kind = 'country' THEN country_code ELSE url END, '') || sources::text, '' ORDER BY id)) FROM nodes) AS node_identity_sources,
  (SELECT md5(string_agg(node_id || locale || title, '' ORDER BY node_id, locale)) FROM node_localizations) AS localization_identity,
  (SELECT md5(string_agg(id || source_node_id || target_node_id || sources::text, '' ORDER BY id)) FROM edges) AS edge_identity_sources,
  (SELECT md5(string_agg(row_to_json(r)::text, '' ORDER BY id)) FROM ryu_routes r) AS route_content,
  (SELECT md5(string_agg(row_to_json(s)::text, '' ORDER BY id)) FROM saved_views s) AS view_content
`)).rows[0];

try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout = '30s'; SET LOCAL statement_timeout = '10min'");
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  if ((await db.query('SELECT 1 FROM schema_migrations WHERE id = $1', [migrationId])).rowCount) {
    throw new Error(`${migrationId} is already applied`);
  }

  const before = await audit();
  for (const file of migrations) {
    const sql = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
      .replace(/^BEGIN;\s*/, '')
      .replace(/\s*COMMIT;\s*$/, '');
    await db.query(sql);
  }

  assert.deepEqual(await audit(), before);
  const validation = (await db.query(`SELECT
    (SELECT count(*)::int FROM nodes n WHERE
      NOT valid_node_kind_fields(n.kind, to_jsonb(n), 'record')
      OR NOT CASE n.kind
        WHEN 'country' THEN valid_country_record_object(n.properties_json, 'properties')
        WHEN 'organization' THEN valid_organization_record_object(n.properties_json, 'properties')
        WHEN 'system' THEN valid_system_record_object(n.properties_json, 'properties')
        ELSE false END) AS invalid_nodes,
    (SELECT count(*)::int FROM node_localizations l JOIN nodes n ON n.id = l.node_id WHERE
      NOT valid_node_kind_fields(n.kind, to_jsonb(l), 'localization')
      OR NOT CASE n.kind
        WHEN 'country' THEN valid_country_record_object(l.details_json, 'details')
        WHEN 'organization' THEN valid_organization_record_object(l.details_json, 'details')
        WHEN 'system' THEN valid_system_record_object(l.details_json, 'details')
        ELSE false END) AS invalid_localizations,
    (SELECT count(*)::int FROM ryu_routes r JOIN nodes n ON n.id = r.node_id WHERE n.kind <> 'system') AS invalid_routes,
    (SELECT count(*)::int FROM edges e JOIN nodes s ON s.id = e.source_node_id JOIN nodes t ON t.id = e.target_node_id
      WHERE e.kind NOT IN ('governs','operates','funds','member','contributes','transfers')
        OR NOT valid_edge_endpoints(e.kind, s.kind, t.kind)
        OR nullif(btrim(e.description), '') IS NULL
        OR e.sources = '{}'::jsonb OR NOT valid_owned_sources(e.sources)) AS invalid_edges,
    (SELECT count(*)::int FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'edges' AND column_name IN ('note','properties_json')) AS retired_edge_columns
  `)).rows[0];
  assert.deepEqual(validation, {
    invalid_nodes: 0,
    invalid_localizations: 0,
    invalid_routes: 0,
    invalid_edges: 0,
    retired_edge_columns: 0,
  });

  if (apply) await db.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migrationId]);
  await db.query(apply ? 'COMMIT' : 'ROLLBACK');
  console.log(JSON.stringify({
    mode: apply ? 'applied' : 'rehearsed_rollback',
    migrationId,
    backupId: backupId ?? null,
    preserved: before,
    validation,
  }));
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
