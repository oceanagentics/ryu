import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { edgeKinds, validEdgeEndpoints } from "../../shared/domain";
import { PostgresGraphRepository } from "./postgresGraphRepository";
import { buildRecordUpdatedAt, readRecordPatchInput, readRecordSearchQuery, validateRecordQuality } from "./recordContracts";

test("the API and database enforce all six edge types, endpoints, uniqueness, and node-kind edits", async () => {
  const db = new PGlite();
  const client = { query: async (sql: string, params: unknown[] = []) => {
    const r = await db.query(sql, params);
    return { rows: r.rows, rowCount: r.rows.length || r.affectedRows || 0 };
  }, release() {} };
  const repository = new PostgresGraphRepository({ ...client, connect: async () => client } as unknown as Pool);
  try {
    await db.exec(fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8"));
    assert.deepEqual(edgeKinds, ["governs", "operates", "funds", "member", "contributes", "transfers"]);
    const sources = { docs: { id: "docs", url: "https://example.org/relationship", title: { en: "Relationship evidence" }, accessedAt: "2026-09-14" } };
    const kinds = ["country", "organization", "system"] as const;
    for (const kind of kinds) for (const suffix of ["a", "b"]) {
      await db.query("INSERT INTO nodes(id,kind) VALUES ($1,$2)", [`${kind}-${suffix}`, kind]);
    }
    for (const kind of edgeKinds) for (const source of kinds) for (const target of kinds) {
      const sourceNodeId = `${source}-a`, targetNodeId = `${target}-b`;
      const allowed = validEdgeEndpoints(kind, source, target);
      const edge = { id: "checked-edge", kind, sourceNodeId, targetNodeId, description: "The cited source documents this relationship.", sources };
      const input = readRecordPatchInput(sourceNodeId, { edges: { upsert: [edge] } });
      const dry = await repository.patchRecord(sourceNodeId, input, { validateOnly: true, recordUpdatedAt: buildRecordUpdatedAt(await repository.getRecord(sourceNodeId, readRecordSearchQuery({}))) });
      assert.ok("valid" in dry);
      assert.equal(dry.valid, allowed, `${kind}: ${source}/${target}`);
      const insert = () => db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id,description,sources) VALUES ($1,$2,$3,$4,$5,$6)", [edge.id, kind, sourceNodeId, targetNodeId, edge.description, JSON.stringify(sources)]);
      if (allowed) {
        await insert();
        await db.query("DELETE FROM edges WHERE id = $1", [edge.id]);
      } else await assert.rejects(insert, /edge endpoints/);
    }
    for (const kind of ["member_of", "publishes_to", "syncs_to", "part_of", "manages", "located_in", "advises", "unknown"]) {
      assert.throws(() => readRecordPatchInput("system-a", { edges: { upsert: [{ id: "invalid", kind, sourceNodeId: "organization-a", targetNodeId: "system-a" }] } }), /kind/);
      await assert.rejects(db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id) VALUES ('invalid',$1,'organization-a','system-a')", [kind]));
    }
    for (const retiredField of ["note", "properties", "scope", "status"]) {
      assert.throws(() => readRecordPatchInput("organization-a", { edges: { upsert: [{
        id: "invalid-shape", kind: "operates", sourceNodeId: "organization-a", targetNodeId: "system-a",
        description: "The organization operates the system.", sources, [retiredField]: "retired",
      }] } }), /unsupported .* fields/);
    }
    await db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id,description,sources) VALUES ('operator','operates','organization-a','system-a','The organization operates the system.',$1)", [JSON.stringify(sources)]);
    await assert.rejects(db.query("UPDATE nodes SET kind='country' WHERE id='organization-a'"), /invalidate existing relationships/);
    const version = buildRecordUpdatedAt(await repository.getRecord("organization-a", readRecordSearchQuery({})));
    const invalidKind = await repository.patchRecord("organization-a", { record: { kind: "country" } }, { recordUpdatedAt: version });
    assert.ok("valid" in invalidKind && !invalidKind.valid);
    assert.equal((await db.query<{ kind: string }>("SELECT kind FROM nodes WHERE id='organization-a'")).rows[0].kind, "organization");
    await assert.rejects(db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id,description,sources) VALUES ('duplicate','operates','organization-a','system-a','Duplicate relationship.',$1)", [JSON.stringify(sources)]), /duplicate key/);
    const duplicate = await repository.patchRecord("organization-a", { edges: { upsert: [{ id: "duplicate", kind: "operates", sourceNodeId: "organization-a", targetNodeId: "system-a", description: "Duplicate relationship.", sources }] } }, { validateOnly: true, recordUpdatedAt: buildRecordUpdatedAt(await repository.getRecord("organization-a", readRecordSearchQuery({}))) });
    assert.ok("valid" in duplicate && !duplicate.valid && duplicate.issues.some(i => i.message.includes("duplicate relationship")));
    await assert.rejects(db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id,description,sources) VALUES ('self','member','organization-a','organization-a','Self relationship.',$1)", [JSON.stringify(sources)]), /check constraint/);
    const self = await repository.patchRecord("organization-a", { edges: { upsert: [{ id: "self", kind: "member", sourceNodeId: "organization-a", targetNodeId: "organization-a", description: "Self relationship.", sources }] } }, { validateOnly: true, recordUpdatedAt: buildRecordUpdatedAt(await repository.getRecord("organization-a", readRecordSearchQuery({}))) });
    assert.ok("valid" in self && !self.valid);
    for (const kind of ["organization", "system"] as const) {
      await assert.rejects(db.query("UPDATE nodes SET country_code='USA' WHERE id=$1", [`${kind}-a`]), /nodes_country_identity_check/);
      for (const recordDepth of ["stub", "thin", "rich"] as const) {
        const invalid = validateRecordQuality("example", { record: { kind, recordDepth, countryCode: "USA" } });
        assert.ok(!invalid.valid && invalid.issues.some(i => i.path === "record.countryCode"));
      }
    }
    await db.query("UPDATE nodes SET country_code='USA' WHERE id='country-a'");
  } finally { await db.close(); }
});

test("relationship migration refuses blind renaming, preserves review history, and can be rerun", async () => {
  const db = new PGlite();
  try {
    await db.exec(fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8"));
    await db.exec(`
      DROP TRIGGER trg_nodes_kind_fields ON nodes;
      DROP TRIGGER trg_localizations_kind_fields ON node_localizations;
      ALTER TABLE nodes DROP CONSTRAINT nodes_country_identity_check;
      ALTER TABLE edges DROP CONSTRAINT edges_kind_check;
      DROP TRIGGER trg_edges_endpoint_kinds ON edges;
      INSERT INTO nodes(id,kind,country_code,record_depth) VALUES ('archive','system','INT','rich'),('network','system','INT','thin');
      INSERT INTO node_localizations(node_id,locale,title,review_json) VALUES ('archive','en','Archive',
        '{"history":[{"state":"human_reviewed","reviewer":"reviewer","date":"2026-09-09T00:00:00Z","note":"Prior review"}]}');
      INSERT INTO edges(id,kind,source_node_id,target_node_id,description,sources) VALUES (
        'legacy','part_of','archive','network','Legacy relationship.',
        '{"docs":{"id":"docs","url":"https://example.org/relationship","title":{"en":"Evidence"},"accessedAt":"2026-09-14"}}');
    `);
    const migration = fs.readFileSync(new URL("../schema/009_relationship_contract.sql", import.meta.url), "utf8").replace("BEGIN;", "BEGIN; SET CONSTRAINTS ALL IMMEDIATE;");
    await assert.rejects(db.exec(migration), /Review and remove legacy part_of/);
    await db.exec("ROLLBACK");
    assert.equal((await db.query("SELECT * FROM edges WHERE id='legacy'")).rows.length, 1);
    await db.query("DELETE FROM edges WHERE id='legacy'");
    await db.exec(migration);
    await db.exec(migration);
    const record = (await db.query<{ country_code: null; record_depth: string }>("SELECT country_code,record_depth FROM nodes WHERE id='archive'")).rows[0];
    assert.deepEqual(record, { country_code: null, record_depth: "thin" });
    const review = (await db.query<{ review_json: { history: { state: string; note: string }[] } }>("SELECT review_json FROM node_localizations WHERE node_id='archive'")).rows[0].review_json.history;
    assert.equal(review.length, 2);
    assert.equal(review[0].note, "Prior review");
    assert.equal(review[1].state, "needs_revision");
    await db.query(`INSERT INTO edges(id,kind,source_node_id,target_node_id,description,sources) VALUES (
      'membership','member','archive','network','Archive participates in the network.',
      '{"docs":{"id":"docs","url":"https://example.org/relationship","title":{"en":"Evidence"},"accessedAt":"2026-09-14"}}')`);
  } finally { await db.close(); }
});

test("edge revision migration preserves legacy prose, renames kinds, removes properties, and can be rerun", async () => {
  const db = new PGlite();
  try {
    await db.exec(fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8"));
    await db.exec(`
      INSERT INTO nodes(id,kind) VALUES ('source','system'),('target','system');
      ALTER TABLE edges DROP CONSTRAINT edges_description_check;
      ALTER TABLE edges ALTER COLUMN description DROP NOT NULL;
      ALTER TABLE edges DROP CONSTRAINT edges_kind_check;
      DROP TRIGGER trg_edges_endpoint_kinds ON edges;
      ALTER TABLE edges ADD COLUMN note text;
      ALTER TABLE edges ADD COLUMN properties_json jsonb NOT NULL DEFAULT '{}';
      ALTER TABLE edges ADD CONSTRAINT edges_source_refs_check CHECK (valid_owned_source_refs(properties_json,sources));
      INSERT INTO edges(id,kind,source_node_id,target_node_id,note,properties_json,sources) VALUES (
        'transfer','syncs_to','source','target','Source sends records to Target.',
        '{"scope":"Preservation copies","status":"active","transferMethod":"Scheduled archive exchange","sourceRefs":["docs"]}',
        '{"docs":{"id":"docs","url":"https://example.org/relationship","title":{"en":"Evidence"},"accessedAt":"2026-09-14"}}');
    `);
    const migration = fs.readFileSync(new URL("../schema/018_edge_revision.sql", import.meta.url), "utf8");
    await db.query("UPDATE edges SET properties_json = properties_json || '{\"unexpected\":\"review me\"}' WHERE id='transfer'");
    await assert.rejects(db.exec(migration), /unsupported edge properties.*unexpected/);
    await db.exec("ROLLBACK");
    assert.deepEqual((await db.query<{ kind: string; description: null }>("SELECT kind,description FROM edges WHERE id='transfer'")).rows[0], { kind: "syncs_to", description: null });
    await db.query("UPDATE edges SET properties_json = properties_json - 'unexpected' WHERE id='transfer'");
    await db.exec(migration);
    const edge = (await db.query<{ kind: string; description: string; sources: object }>("SELECT kind,description,sources FROM edges WHERE id='transfer'")).rows[0];
    assert.equal(edge.kind, "transfers");
    assert.match(edge.description, /^Source sends records to Target\./);
    assert.match(edge.description, /The documented scope is Preservation copies\./);
    assert.match(edge.description, /The documented status is active\./);
    assert.match(edge.description, /The documented transfer method is Scheduled archive exchange\./);
    assert.deepEqual(Object.keys(edge.sources), ["docs"]);
    assert.equal((await db.query<{ count: number }>("SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name='edges' AND column_name IN ('note','properties_json')")).rows[0].count, 0);
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT kind,description,sources FROM edges WHERE id='transfer'")).rows[0], edge);
  } finally { await db.close(); }
});
