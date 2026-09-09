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
    assert.deepEqual(edgeKinds, ["governs", "operates", "funds", "member_of", "publishes_to", "syncs_to"]);
    const kinds = ["country", "organization", "system"] as const;
    for (const kind of kinds) for (const suffix of ["a", "b"]) {
      await db.query("INSERT INTO nodes(id,kind) VALUES ($1,$2)", [`${kind}-${suffix}`, kind]);
    }
    for (const kind of edgeKinds) for (const source of kinds) for (const target of kinds) {
      const sourceNodeId = `${source}-a`, targetNodeId = `${target}-b`;
      const allowed = validEdgeEndpoints(kind, source, target);
      const edge = { id: "checked-edge", kind, sourceNodeId, targetNodeId };
      const input = readRecordPatchInput(sourceNodeId, { edges: { upsert: [edge] } });
      const dry = await repository.patchRecord(sourceNodeId, input, { validateOnly: true, recordUpdatedAt: buildRecordUpdatedAt(await repository.getRecord(sourceNodeId, readRecordSearchQuery({}))) });
      assert.ok("valid" in dry);
      assert.equal(dry.valid, allowed, `${kind}: ${source}/${target}`);
      const insert = () => db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id) VALUES ($1,$2,$3,$4)", [edge.id, kind, sourceNodeId, targetNodeId]);
      if (allowed) {
        await insert();
        await db.query("DELETE FROM edges WHERE id = $1", [edge.id]);
      } else await assert.rejects(insert, /edge endpoints/);
    }
    for (const kind of ["part_of", "manages", "located_in", "advises", "unknown"]) {
      assert.throws(() => readRecordPatchInput("system-a", { edges: { upsert: [{ id: "invalid", kind, sourceNodeId: "organization-a", targetNodeId: "system-a" }] } }), /kind/);
      await assert.rejects(db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id) VALUES ('invalid',$1,'organization-a','system-a')", [kind]));
    }
    await db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id) VALUES ('operator','operates','organization-a','system-a')");
    await assert.rejects(db.query("UPDATE nodes SET kind='country' WHERE id='organization-a'"), /invalidate existing relationships/);
    const version = buildRecordUpdatedAt(await repository.getRecord("organization-a", readRecordSearchQuery({})));
    const invalidKind = await repository.patchRecord("organization-a", { record: { kind: "country" } }, { recordUpdatedAt: version });
    assert.ok("valid" in invalidKind && !invalidKind.valid);
    assert.equal((await db.query<{ kind: string }>("SELECT kind FROM nodes WHERE id='organization-a'")).rows[0].kind, "organization");
    await assert.rejects(db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id) VALUES ('duplicate','operates','organization-a','system-a')"), /duplicate key/);
    const duplicate = await repository.patchRecord("organization-a", { edges: { upsert: [{ id: "duplicate", kind: "operates", sourceNodeId: "organization-a", targetNodeId: "system-a" }] } }, { validateOnly: true, recordUpdatedAt: buildRecordUpdatedAt(await repository.getRecord("organization-a", readRecordSearchQuery({}))) });
    assert.ok("valid" in duplicate && !duplicate.valid && duplicate.issues.some(i => i.message.includes("duplicate relationship")));
    await assert.rejects(db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id) VALUES ('self','member_of','organization-a','organization-a')"), /check constraint/);
    const self = await repository.patchRecord("organization-a", { edges: { upsert: [{ id: "self", kind: "member_of", sourceNodeId: "organization-a", targetNodeId: "organization-a" }] } }, { validateOnly: true, recordUpdatedAt: buildRecordUpdatedAt(await repository.getRecord("organization-a", readRecordSearchQuery({}))) });
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
      ALTER TABLE nodes DROP CONSTRAINT nodes_country_identity_check;
      ALTER TABLE edges DROP CONSTRAINT edges_kind_check;
      DROP TRIGGER trg_edges_endpoint_kinds ON edges;
      INSERT INTO nodes(id,kind,country_code,record_depth) VALUES ('archive','system','INT','rich'),('network','system','INT','thin');
      INSERT INTO node_localizations(node_id,locale,title,review_json) VALUES ('archive','en','Archive',
        '{"history":[{"state":"human_reviewed","reviewer":"reviewer","date":"2026-09-09T00:00:00Z","note":"Prior review"}]}');
      INSERT INTO edges(id,kind,source_node_id,target_node_id) VALUES ('legacy','part_of','archive','network');
    `);
    const migration = fs.readFileSync(new URL("../schema/009_relationship_contract.sql", import.meta.url), "utf8");
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
    await db.query("INSERT INTO edges(id,kind,source_node_id,target_node_id) VALUES ('membership','member_of','archive','network')");
  } finally { await db.close(); }
});
