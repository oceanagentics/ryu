import type { GraphNode, ResolvedNodeLocalization } from "../../shared/domain";
import type { RecordAggregateContentInput, RecordPatchInput, RecordDetailDto } from "../../shared/recordApi";
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { PostgresGraphRepository } from "./postgresGraphRepository";
import { buildRecordUpdatedAt, readRecordAggregateContentInput, readRecordPatchInput, readRecordSearchQuery, validateRecordQuality } from "./recordContracts";

const fixture = () => JSON.parse(fs.readFileSync(new URL("./fixtures/rich-record.json", import.meta.url), "utf8"));
const schema = fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../schema/014_system_record_shape.sql", import.meta.url), "utf8");

// Exercise the same malformed payloads against the API and the SQL shape guard.
const invalid: [string, (r: ReturnType<typeof fixture>) => void][] = [
  ["record.properties.extra", r => { r.record.properties.extra = null; }],
  ["record.properties.parentId", r => { r.record.properties.parentId = "hidden-parent"; }],
  ["record.properties.identifiers", r => { r.record.properties.identifiers = []; }],
  ["record.properties.operator", r => { r.record.properties.operator = "hidden-operator"; }],
  ["record.properties.data", r => { r.record.properties.data = []; }],
  ["record.properties.data.extra", r => { r.record.properties.data.extra = "unmodelled"; }],
  ["record.properties.data.descriptors", r => { r.record.properties.data.descriptors = "not an array"; }],
  ["record.properties.data.descriptors[0]", r => { r.record.properties.data.descriptors[0] = null; }],
  ["record.properties.data.descriptors[0].id", r => { r.record.properties.data.descriptors[0].id = "bad ID"; }],
  ["record.properties.data.descriptors[0].source", r => { delete r.record.properties.data.descriptors[0].source; }],
  ["record.properties.data.descriptors[0].category", r => { r.record.properties.data.descriptors[0].category = "other"; }],
  ["record.properties.data.descriptors[0].category", r => { r.record.properties.data.descriptors[0].category = ["format"]; }],
  ["record.properties.data.descriptors[0].extra", r => { r.record.properties.data.descriptors[0].extra = true; }],
  ["record.properties.gallery", r => { r.record.properties.gallery = null; }],
  ["record.properties.gallery[0].type", r => { r.record.properties.gallery[0].type = ["image"]; }],
  ["record.properties.gallery[0].sortOrder", r => { r.record.properties.gallery[0].sortOrder = "first"; }],
  ["record.properties.gallery[0].sortOrder", r => { r.record.properties.gallery[0].sortOrder = -1; }],
  ["record.properties.gallery[0].extra", r => { r.record.properties.gallery[0].extra = true; }],
  ["localizations.en.details.aliases", r => { r.localizations.en.details.aliases = 42; }],
  ["localizations.en.details.aliases", r => { r.localizations.en.details.aliases = ["alias", "alias"]; }],
  ["localizations.en.details.review", r => { r.localizations.en.details.review = { state: "human_reviewed" }; }],
  ["localizations.en.details.data.extra", r => { r.localizations.en.details.data.extra = "hidden"; }],
  ["localizations.en.details.data.descriptors[0].label", r => { r.localizations.en.details.data.descriptors[0].label = null; }],
  ["localizations.en.details.data.descriptors[0].description", r => { r.localizations.en.details.data.descriptors[0].description = {}; }],
  ["localizations.en.details.profile.extra", r => { r.localizations.en.details.profile.extra = true; }],
  ["localizations.en.details.profile.sourceRefs", r => { r.localizations.en.details.profile.sourceRefs = ["src-fishbase-home", "src-fishbase-home"]; }],
  ["localizations.en.details.researchGaps", r => { r.localizations.en.details.researchGaps = []; }],
  ["localizations.en.details.researchGaps.usage", r => { r.localizations.en.details.researchGaps.usage = 42; }],
  ["localizations.en.details.researchGaps.usage", r => { r.localizations.en.details.researchGaps.usage = ""; }],
  ["localizations.en.details.gallery[0].altText", r => { r.localizations.en.details.gallery[0].altText = {}; }],
  ["localizations.en.details.gallery[0].caption", r => { delete r.localizations.en.details.gallery[0].caption; }],
];

test("canonical system objects reject unknown fields and malformed structures at every depth, in API and SQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    // The reference schema and upgrade must carry identical structural guards.
    assert.ok(schema.includes(migration.slice("BEGIN;\n".length, -"COMMIT;\n".length)));
    const valid = fixture();
    assert.equal(validateRecordQuality(valid.id, valid).valid, true);
    for (const [path, mutate] of invalid) {
      for (const depth of ["stub", "thin", "rich"]) {
        const r = fixture();
        r.record.recordDepth = depth;
        mutate(r);
        const result = validateRecordQuality(r.id, readRecordAggregateContentInput(r.id, r));
        assert.ok(!result.valid && result.issues.some(issue => issue.path === path), `${depth}/${path}: ${JSON.stringify(result.issues)}`);
      }
      const r = fixture();
      mutate(r);
      const localized = path.startsWith("localizations.");
      const checked = await db.query<{ valid: boolean }>("SELECT valid_system_record_object($1, $2) AS valid", [
        JSON.stringify(localized ? r.localizations.en.details : r.record.properties), localized ? "details" : "properties",
      ]);
      assert.equal(checked.rows[0].valid, false, path);
    }
    for (const [value, section] of [[valid.record.properties, "properties"], [valid.localizations.en.details, "details"], [{}, "properties"], [{}, "details"]]) {
      assert.equal((await db.query<{ valid: boolean }>("SELECT valid_system_record_object($1, $2) AS valid", [JSON.stringify(value), section])).rows[0].valid, true);
    }
    for (const depth of ["stub", "thin"]) {
      const sparse = { record: { kind: "system", recordDepth: depth }, localizations: { en: { title: "Research in progress" } } };
      assert.equal(validateRecordQuality("sparse", readRecordAggregateContentInput("sparse", sparse)).valid, true);
      assert.equal(validateRecordQuality("sparse", readRecordAggregateContentInput("sparse", { ...sparse, record: { ...sparse.record, recordDepth: "rich" } })).valid, false);
    }
    for (const section of ["data", "gallery"]) {
      const r = fixture();
      r.record.recordDepth = "thin";
      if (section === "data") r.localizations.en.details.data.descriptors[0].id = "orphan";
      else r.localizations.en.details.gallery[0].id = "orphan";
      assert.equal(validateRecordQuality(r.id, r).valid, false, "thin records must not have orphaned IDs");
    }
    const incomplete = fixture();
    incomplete.record.recordDepth = "thin";
    for (const l of Object.values(incomplete.localizations) as any[]) {
      l.details.gallery = [];
      l.details.data.descriptors = l.details.data.descriptors.filter((row: any) => incomplete.record.properties.data.descriptors.some((d: any) => d.category === "standard" && d.id === row.id));
    }
    assert.equal(validateRecordQuality(incomplete.id, incomplete).valid, true, "incomplete descriptor/gallery translations remain thin");
    incomplete.record.recordDepth = "rich";
    assert.equal(validateRecordQuality(incomplete.id, incomplete).valid, false);
  } finally { await db.close(); }
});

test("PUT, PATCH and SQL cannot persist malformed systems; dry runs match apply and preserve content", async () => {
  const db = new PGlite();
  const client = { query: async (sql: string, params: unknown[] = []) => {
    const r = await db.query(sql, params);
    return { rows: r.rows, rowCount: r.rows.length || r.affectedRows || 0 };
  }, release() {} };
  const repo = new PostgresGraphRepository({ ...client, connect: async () => client } as unknown as Pool);
  const read = () => repo.getRecord("fishbase", readRecordSearchQuery({}));
  try {
    await db.exec(schema);
    const input = fixture();
    for (const edge of input.edges) {
      const id = edge.sourceNodeId === input.id ? edge.targetNodeId : edge.sourceNodeId;
      await db.query("INSERT INTO nodes(id,kind) VALUES($1,$2) ON CONFLICT DO NOTHING", [id, edge.sourceNodeId === input.id ? "system" : "organization"]);
    }
    await repo.upsertRecord(input.id, readRecordAggregateContentInput(input.id, input), { createOnly: true });
    const before = await read();
    const recordUpdatedAt = buildRecordUpdatedAt(before);
    for (const [path, mutate] of invalid) {
      const r = fixture(); mutate(r);
      const put = readRecordAggregateContentInput(r.id, r);
      const patch = readRecordPatchInput(r.id, { record: { propertiesReplace: r.record.properties }, localizations: { en: { mode: "patch", detailsReplace: r.localizations.en.details } } });
      for (const method of ["put", "patch"]) {
        const run = (validateOnly: boolean) => method === "put"
          ? repo.upsertRecord(r.id, put, { recordUpdatedAt, validateOnly })
          : repo.patchRecord(r.id, patch, { recordUpdatedAt, validateOnly });
        const dry = await run(true);
        assert.ok("valid" in dry && !dry.valid, path);
        assert.deepEqual(await run(false), dry, path);
      }
      const localized = path.startsWith("localizations.");
      await assert.rejects(db.query(localized
        ? "UPDATE node_localizations SET details_json=$1 WHERE node_id='fishbase' AND locale='en'"
        : "UPDATE nodes SET properties_json=$1 WHERE id='fishbase'",
      [JSON.stringify(localized ? r.localizations.en.details : r.record.properties)]), /canonical record shape/, path);
    }
    assert.deepEqual(await read(), before);
    // Changing kind must not bypass the localization guard.
    await db.exec("DROP TRIGGER trg_nodes_organization_record_shape ON nodes; DROP TRIGGER trg_localizations_organization_record_shape ON node_localizations;");
    await db.query("INSERT INTO nodes(id,kind) VALUES ('legacy-organization','organization')");
    await db.query("INSERT INTO node_localizations(node_id,locale,title,details_json) VALUES ('legacy-organization','en','Legacy','{\"extra\":true}')");
    await assert.rejects(db.query("UPDATE nodes SET kind='system' WHERE id='legacy-organization'"), /canonical record shape/);
    // Reconstruct a pre-migration record to test audit and unnormalized PATCH validation.
    await db.exec("DROP TRIGGER trg_nodes_record_shape ON nodes; DROP TRIGGER trg_localizations_record_shape ON node_localizations;");
    await db.query("UPDATE node_localizations SET details_json=jsonb_set(details_json,'{data,extra}','true') WHERE node_id='fishbase' AND locale='en'");
    await assert.rejects(read(), /invalid stored system fishbase/);
    const version = (await db.query<{ value: string }>(`
      SELECT max(updated_at) AS value FROM (
        SELECT updated_at FROM nodes WHERE id='fishbase'
        UNION ALL SELECT updated_at FROM node_localizations WHERE node_id='fishbase'
        UNION ALL SELECT updated_at FROM edges WHERE source_node_id='fishbase' OR target_node_id='fishbase'
        UNION ALL SELECT updated_at FROM ryu_routes WHERE node_id='fishbase'
      ) versions
    `)).rows[0].value;
    const result = await repo.patchRecord("fishbase", { localizations: { en: { mode: "patch", summary: "New summary" } } },
      { recordUpdatedAt: new Date(version).toISOString(), validateOnly: true });
    assert.ok("valid" in result && result.issues.some(issue => issue.path === "localizations.en.details.data.extra"));
    await assert.rejects(db.exec(migration), /repair system record shapes before migration 014: fishbase/);
    await db.exec("ROLLBACK");
    assert.equal((await db.query<{ value: boolean }>("SELECT details_json#>'{data,extra}' AS value FROM node_localizations WHERE node_id='fishbase' AND locale='en'")).rows[0].value, true);
    await db.query("UPDATE node_localizations SET details_json=details_json #- '{data,extra}' WHERE node_id='fishbase'");
    await db.exec(migration);
    await db.exec(migration);
  } finally { await db.close(); }
});

test("kind contract migration audits without deleting content and is safe to rerun", async () => {
  const db = new PGlite();
  const migration = fs.readFileSync(new URL("../schema/017_node_kind_contracts.sql", import.meta.url), "utf8");
  try {
    await db.exec(schema);
    await db.exec(`
      INSERT INTO nodes(id,kind) VALUES ('country','country'),('organization','organization'),('system','system');
      INSERT INTO node_localizations(node_id,locale,title) VALUES ('organization','en','Organization');
    `);
    await db.exec("DROP TRIGGER trg_routes_kind_fields ON ryu_routes");
    await db.query("INSERT INTO ryu_routes(id,node_id,status,mode) VALUES ('misplaced','organization','planned','api')");
    const snapshot = async () => Promise.all(["nodes", "node_localizations", "ryu_routes"].map(table => db.query(`SELECT * FROM ${table}`)));
    const before = await snapshot();
    await assert.rejects(db.exec(migration), /review node contracts before migration 017: organization/);
    await db.exec("ROLLBACK");
    assert.deepEqual(await snapshot(), before);
    await db.query("DELETE FROM ryu_routes WHERE id='misplaced'");
    await db.exec(`
      DROP TRIGGER trg_localizations_organization_record_shape ON node_localizations;
      UPDATE node_localizations SET details_json='{"data":{"descriptors":[]}}' WHERE node_id='organization';
    `);
    const invalidLocalization = await snapshot();
    await assert.rejects(db.exec(migration), /review localization contracts before migration 017: organization\/en/);
    await db.exec("ROLLBACK");
    assert.deepEqual(await snapshot(), invalidLocalization);
    await db.query("UPDATE node_localizations SET details_json='{}' WHERE node_id='organization'");
    const valid = await snapshot();
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(await snapshot(), valid);
    for (const kind of ["country", "organization"]) {
      await assert.rejects(db.query("INSERT INTO ryu_routes(id,node_id,status,mode) VALUES ('misplaced',$1,'planned','api')", [kind]), /does not have a routes section/);
    }
    await db.query("INSERT INTO ryu_routes(id,node_id,status,mode) VALUES ('system-route','system','planned','api')");
    await assert.rejects(db.query("UPDATE nodes SET kind='organization' WHERE id='system'"), /does not have a routes section/);
    for (const kind of ["country", "organization", "system"]) {
      const ownRecord = { id: kind, kind, ...(kind === "country" ? { country_code: "XMP" } : { url: "https://example.org" }) };
      assert.equal((await db.query<{ valid: boolean }>("SELECT valid_node_kind_fields($1,$2,'record') AS valid", [kind, JSON.stringify(ownRecord)])).rows[0].valid, true);
      assert.equal((await db.query<{ valid: boolean }>("SELECT valid_node_kind_fields($1,$2,'record') AS valid", [kind, JSON.stringify({ ...ownRecord, invented: "value" })])).rows[0].valid, false);
    }
  } finally { await db.close(); }
});

function systemTypeContract(node: GraphNode<"system">, localized: ResolvedNodeLocalization<"system">, dto: RecordDetailDto<"system">) {
  const content: RecordAggregateContentInput<"system"> = { record: { kind: node.kind, url: node.url, properties: node.properties }, routes: [] };
  const patch: RecordPatchInput<"system"> = { record: { propertiesReplace: { gallery: [] } } };
  // @ts-expect-error System facts do not include organizational offices.
  node.properties.offices;
  // @ts-expect-error Institutional mission belongs to organization localization.
  localized.details.profile?.mission;
  // @ts-expect-error A system has no country identity.
  dto.record.countryCode;
  // @ts-expect-error Systems use system-only metric keys.
  content.record.properties = { metrics: [{ id: "staff", key: "staff_count", value: 3, observedAt: null, source: "evidence" }] };
  // @ts-expect-error A system patch cannot replace its prose with treaty content.
  patch.localizations = { en: { mode: "patch", detailsReplace: { treatyParticipation: [] } } };
}
