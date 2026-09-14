import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import type { SourceCollection } from "../../shared/domain";
import { supportedLocales } from "../../shared/localization";
import { PostgresGraphRepository } from "./postgresGraphRepository";
import { buildRecordUpdatedAt, readRecordPatchInput, readRecordSearchQuery } from "./recordContracts";

const schema = fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../schema/011_owned_sources.sql", import.meta.url), "utf8");
const sources = (url = "https://example.org/docs"): SourceCollection => ({
  docs: { id: "docs", url, title: Object.fromEntries(supportedLocales.map(locale => [locale, `Documentation ${locale}`])), accessedAt: "2026-09-09" },
});

function repository(db: PGlite) {
  const query = async (sql: string, values?: unknown[]) => {
    const result = await db.query(sql, values);
    return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
  };
  return new PostgresGraphRepository({ query, connect: async () => ({ query, release() {} }) } as unknown as Pool);
}

test("API and database enforce the closed source shape at every record depth", async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    const valid = sources();
    const described = structuredClone(valid);
    described.docs.description = Object.fromEntries(supportedLocales.map(locale => [locale, `Context ${locale}`]));
    const bad = [null, [], { docs: null }, { docs: { ...valid.docs, id: "other" } },
      { docs: { ...valid.docs, note: "extra" } }, { docs: { ...valid.docs, url: "relative/path" } },
      { docs: { ...valid.docs, url: "https://" } }, { docs: { ...valid.docs, title: {} } },
      { docs: { ...valid.docs, title: { en: " " } } }, { docs: { ...valid.docs, title: { xx: "Title" } } },
      { docs: { ...valid.docs, title: { en: null } } }, { docs: { ...valid.docs, accessedAt: "2026-02-30" } },
      { docs: { ...valid.docs, accessedAt: "2026-09" } }, { docs: { ...valid.docs, accessedAt: null } },
      { docs: { ...valid.docs, description: {} } }, { docs: { ...valid.docs, description: { en: " " } } },
      { docs: { ...valid.docs, description: { xx: "Context" } } }, { docs: { ...valid.docs, description: null } },
      { docs: { id: "docs", url: valid.docs.url, title: valid.docs.title } }];
    for (const collection of bad) {
      assert.throws(() => readRecordPatchInput("a", { record: { sourcesReplace: collection } }), Error, JSON.stringify(collection));
      await assert.rejects(db.query("INSERT INTO nodes(id,kind,sources) VALUES ('invalid','system',$1)", [JSON.stringify(collection)]));
    }
    readRecordPatchInput("a", { record: { sourcesReplace: valid } });
    readRecordPatchInput("a", { record: { sourcesReplace: described } });
    await db.query("INSERT INTO nodes(id,kind,sources) VALUES ('described','organization',$1)", [JSON.stringify(described)]);
    await db.query("INSERT INTO nodes(id,kind,sources,properties_json) VALUES ('a','system',$1,$2)", [JSON.stringify(valid), JSON.stringify({
      data: { descriptors: [{ id: "taxonomy", category: "type", label: "taxonomic_records", source: "docs" }] },
    })]);
    for (const properties of [{ source: { id: "docs", url: valid.docs.url } }, { source: "missing" }, { sourceRefs: [null] }, { sources: valid }]) {
      await assert.rejects(db.query("UPDATE nodes SET properties_json=$1 WHERE id='a'", [JSON.stringify(properties)]));
    }
  } finally { await db.close(); }
});

test("sources stay with their owner through localization writes, search, edge reads, and review changes", async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    const repo = repository(db);
    for (const id of ["a", "b"]) {
      await db.query("INSERT INTO nodes(id,kind,sources) VALUES ($1,'organization',$2)", [id, JSON.stringify(sources(`https://${id}.example.org`))]);
      for (const locale of ["en", "fr"]) await db.query(
        "INSERT INTO node_localizations(node_id,locale,title,details_json) VALUES ($1,$2,$1,'{\"profile\":{\"mission\":\"Example mission\",\"sourceRefs\":[\"docs\"]}}')", [id, locale]);
    }
    const read = (id = "a") => repo.getRecord(id, readRecordSearchQuery({}));
    const version = async (id = "a") => buildRecordUpdatedAt(await read(id));
    const beforeMigration = await read();
    await db.exec(migration);
    assert.deepEqual(await read(), beforeMigration, "rerunning on the current schema must preserve timestamps and content");
    const before = (await read()).node.sources;
    const localized = await repo.patchRecord("a", { localizations: { fr: { mode: "patch", summary: "Résumé" } } }, { recordUpdatedAt: await version() });
    assert.ok("node" in localized);
    assert.deepEqual(localized.node.sources, before);
    const stale = await version();
    for (const id of ["a", "b"]) await repo.updateNodeLocalizationReview(id, "en", { reviewState: "human_reviewed" }, "reviewer@example.org", { recordUpdatedAt: await version(id) });
    const changed = structuredClone(before);
    changed.docs.title.fr = "MarqueurFrançais";
    changed.docs.description = { fr: "ContexteInstitutionnelFrançais" };
    await assert.rejects(repo.patchRecord("a", { record: { sourcesReplace: changed } }, { recordUpdatedAt: stale }), /stale/);
    const otherVersion = await version("b");
    const applied = await repo.patchRecord("a", { record: { sourcesReplace: changed } }, { recordUpdatedAt: await version() });
    assert.ok("node" in applied, JSON.stringify(applied));
    assert.equal(applied.node.localizations.en!.review.state, "needs_revision");
    assert.equal((await read("b")).node.localizations.en!.review.state, "human_reviewed");
    assert.equal(await version("b"), otherVersion);
    assert.equal((await read("b")).node.sources.docs.url, "https://b.example.org");
    assert.equal((await repo.listRecords(readRecordSearchQuery({ q: "MarqueurFrançais", locale: "fr" }))).records[0].node.id, "a");
    assert.equal((await repo.listRecords(readRecordSearchQuery({ q: "MarqueurFrançais", locale: "en", localeMode: "locale_only" }))).records.length, 0);
    assert.equal((await repo.listRecords(readRecordSearchQuery({ q: "MarqueurFrançais", locale: "en", localeMode: "all_locales" }))).records.length, 1);
    assert.equal((await repo.listRecords(readRecordSearchQuery({ q: "ContexteInstitutionnelFrançais", locale: "fr" }))).records[0].node.id, "a");
    const missing = structuredClone(changed); delete missing.docs.title.fr;
    const rejected = await repo.patchRecord("a", { record: { sourcesReplace: missing } }, { recordUpdatedAt: await version(), validateOnly: true });
    assert.ok("valid" in rejected && !rejected.valid);
    await assert.rejects(db.query("UPDATE nodes SET sources=$1 WHERE id='a'", [JSON.stringify(missing)]), /missing title/);
    await assert.rejects(db.query("UPDATE nodes SET sources='{}' WHERE id='a'"), /missing source/);
    await assert.rejects(db.query("UPDATE node_localizations SET details_json='{\"profile\":{\"sourceRefs\":[\"missing\"]}}' WHERE node_id='a' AND locale='en'"), /missing source/);
    await db.query("INSERT INTO nodes(id,kind) VALUES ('route-system','system')");
    await assert.rejects(db.query("INSERT INTO ryu_routes(id,node_id,status,mode,properties_json) VALUES ('bad','route-system','planned','api','{\"sourceRefs\":[\"missing\"]}')"), /missing source/);
    await db.query("INSERT INTO edges(id,source_node_id,target_node_id,kind,sources,properties_json) VALUES ('ab','a','b','member_of',$1,'{\"sourceRefs\":[\"docs\"]}')", [JSON.stringify(sources("https://edge.example.org"))]);
    for (const id of ["a", "b"]) assert.equal((await read(id)).edges[0].sources.docs.url, "https://edge.example.org");
    const edgeSources = sources("https://updated-edge.example.org");
    await repo.updateNodeLocalizationReview("a", "en", { reviewState: "human_reviewed" }, "reviewer@example.org", { recordUpdatedAt: await version() });
    const edgeWrite = await repo.patchRecord("a", { edges: { upsert: [{ id: "ab", kind: "member_of", sourceNodeId: "a", targetNodeId: "b", sources: edgeSources, properties: { sourceRefs: ["docs"] } }] } }, { recordUpdatedAt: await version() });
    assert.ok("node" in edgeWrite, JSON.stringify(edgeWrite));
    for (const id of ["a", "b"]) assert.equal((await read(id)).node.localizations.en!.review.state, "needs_revision");
    assert.deepEqual((await repo.getBootstrap()).nodes.find(n => n.id === "a")!.sources, changed);
    assert.equal("sources" in await repo.getBootstrap(), false);
  } finally { await db.close(); }
});

test("adding a locale and its source titles is atomic, including incident edge titles", async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    const english = { docs: { ...sources().docs, title: { en: "Documentation" } } };
    for (const id of ["a", "b"]) await db.query("INSERT INTO nodes(id,kind,sources) VALUES ($1,'organization',$2)", [id, JSON.stringify(english)]);
    await db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id,sources) VALUES ('ab','member_of','a','b',$1)", [JSON.stringify(english)]);
    await assert.rejects(db.query("INSERT INTO node_localizations(node_id,locale,title) VALUES ('a','fr','A')"), /missing title/);
    await db.exec("BEGIN");
    await db.query("INSERT INTO node_localizations(node_id,locale,title) VALUES ('a','fr','A')");
    await db.query("UPDATE nodes SET sources=$1 WHERE id='a'", [JSON.stringify(sources())]);
    await assert.rejects(db.exec("COMMIT"), /endpoint localization/);
    await db.exec("ROLLBACK");
    await db.exec("BEGIN");
    await db.query("INSERT INTO node_localizations(node_id,locale,title) VALUES ('a','fr','A')");
    await db.query("UPDATE nodes SET sources=$1 WHERE id='a'", [JSON.stringify(sources())]);
    await db.query("UPDATE edges SET sources=$1 WHERE id='ab'", [JSON.stringify(sources())]);
    await db.exec("COMMIT");
  } finally { await db.close(); }
});

const legacySchema = `
CREATE TABLE sources(id text PRIMARY KEY,url text,accessed_at text);
CREATE TABLE sources_localizations(source_id text,locale text,title text);
CREATE TABLE nodes(id text PRIMARY KEY,kind text,properties_json jsonb DEFAULT '{}');
CREATE TABLE edges(id text PRIMARY KEY,source_node_id text,target_node_id text,properties_json jsonb DEFAULT '{}');
CREATE TABLE node_localizations(node_id text,locale text,details_json jsonb DEFAULT '{}');
CREATE TABLE ryu_routes(id text,node_id text,properties_json jsonb DEFAULT '{}');
INSERT INTO sources VALUES ('docs','https://example.org/docs','2026-09-09');
INSERT INTO sources_localizations VALUES ('docs','en','Documentation'),('docs','fr','Documentation française');
INSERT INTO nodes VALUES ('a','system','{"source":{"id":"docs","url":"https://example.org/docs"}}'),('b','system','{}');
INSERT INTO edges VALUES ('ab','a','b','{"sourceRefs":["docs"]}');
INSERT INTO node_localizations VALUES ('a','en','{"profile":{"sourceRefs":["docs"]}}'),('b','fr','{}');
INSERT INTO ryu_routes VALUES ('route','a','{"source":{"id":"docs","url":"https://example.org/docs"}}');`;

test("migration retains four source fields and references on each owner, drops global tables, and reruns safely", async () => {
  const db = new PGlite();
  try {
    await db.exec(legacySchema);
    await db.exec(migration);
    const nodes = (await db.query<any>("SELECT * FROM nodes ORDER BY id")).rows;
    assert.deepEqual(nodes[0].sources.docs, { id: "docs", url: "https://example.org/docs", accessedAt: "2026-09-09", title: { en: "Documentation", fr: "Documentation française" } });
    assert.deepEqual(nodes[0].properties_json, { source: "docs" });
    assert.deepEqual(nodes[1].sources, {});
    const edges = (await db.query<any>("SELECT * FROM edges")).rows;
    assert.deepEqual(edges[0].sources, nodes[0].sources);
    assert.equal((await db.query<any>("SELECT properties_json FROM ryu_routes")).rows[0].properties_json.source, "docs");
    assert.equal((await db.query<any>("SELECT to_regclass('sources') AS name")).rows[0].name, null);
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT * FROM nodes ORDER BY id")).rows, nodes);
    assert.deepEqual((await db.query("SELECT * FROM edges")).rows, edges);
  } finally { await db.close(); }
});

test("migration rolls back missing translations, missing sources, and conflicting URLs", async () => {
  for (const change of ["DELETE FROM sources_localizations WHERE locale='fr'", "DELETE FROM sources", "UPDATE sources SET url='https://different.example.org'"]) {
    const db = new PGlite();
    try {
      await db.exec(legacySchema); await db.exec(change);
      await assert.rejects(db.exec(migration));
      await db.exec("ROLLBACK");
      assert.equal((await db.query<any>("SELECT to_regclass('sources') AS name")).rows[0].name, "sources");
      assert.equal((await db.query<any>("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='nodes' AND column_name='sources'")).rows[0].n, 0);
    } finally { await db.close(); }
  }
});
