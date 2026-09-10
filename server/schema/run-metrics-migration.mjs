import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
const db=new pg.Client();
await db.connect();
const audit=async()=> (await db.query(`SELECT
 (SELECT count(*)::int FROM nodes) AS nodes,
 (SELECT count(*)::int FROM node_localizations) AS localizations,
 (SELECT md5(string_agg(row_to_json(e)::text,'' ORDER BY id)) FROM edges e) AS edges,
 (SELECT md5(string_agg(row_to_json(r)::text,'' ORDER BY id)) FROM ryu_routes r) AS routes,
 (SELECT md5(string_agg(id || sources::text || record_depth,'' ORDER BY id)) FROM nodes) AS sources_depth,
 (SELECT md5(string_agg(node_id || locale || review_json::text,'' ORDER BY node_id,locale)) FROM node_localizations) AS reviews,
 (SELECT md5(string_agg(row_to_json(s)::text,'' ORDER BY id)) FROM saved_views s) AS views`)).rows[0];
const legacy=async()=> (await db.query(`SELECT
 (SELECT count(*)::int FROM nodes WHERE properties_json ? 'usage' OR (properties_json->'data') ?| ARRAY['recordCount','storageSize']) AS nodes,
 (SELECT count(*)::int FROM node_localizations WHERE details_json ? 'usage' OR (details_json->'data') ?| ARRAY['recordCount','storageSize']) AS localizations`)).rows[0];
try {
 await db.query('BEGIN');
 const before=await audit(), legacyBefore=await legacy();
 const sql=fs.readFileSync(new URL('./013_system_metrics.sql',import.meta.url),'utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
 await db.query(sql);
 assert.deepEqual(await audit(),before);
 assert.deepEqual(await legacy(),{nodes:0,localizations:0});
 const apply=process.argv.includes('--apply');
 await db.query(apply?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({mode:apply?'applied':'rehearsed_rollback',legacyBefore,legacyAfter:await legacy(),preserved:before}));
} catch(e) { await db.query('ROLLBACK'); throw e; }
finally { await db.end(); }
