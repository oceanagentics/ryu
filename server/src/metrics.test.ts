import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { systemMetricDefinitions, type SourcedMetric } from "../../shared/domain";
import { formatMetricValue, vocabularyLabel } from "../../shared/i18n";
import { validateRecordQuality } from "./recordContracts";


const fixture = () => JSON.parse(fs.readFileSync(new URL("./fixtures/rich-record.json", import.meta.url), "utf8"));
const migration = fs.readFileSync(new URL("../schema/013_system_metrics.sql", import.meta.url), "utf8");

test("metrics accept exactly the ten approved keys and reject malformed observations at every depth", () => {
  assert.deepEqual(Object.keys(systemMetricDefinitions), ["record_count", "occurrence_count", "sample_count", "sequence_count", "species_count", "storage_size_bytes", "session_count", "download_count", "contributor_count", "citation_count"]);
  for (const depth of ["stub", "thin", "rich"]) {
    const valid = fixture();
    valid.record.recordDepth = depth;
    valid.record.properties.metrics = Object.keys(systemMetricDefinitions).map((key, i) => ({
      id: `metric-${i}`, key, value: i, source: "src-fishbase-home", observedAt: null,
      ...(i >= 6 ? { period: "month" } : {}),
    }));
    for (const l of Object.values(valid.localizations) as any[]) l.details.metrics = valid.record.properties.metrics.map((m: any) => ({ id: m.id, description: "Test measurement scope; observation date not published." }));
    assert.equal(validateRecordQuality(valid.id, valid).valid, true);
    const invalid: [string, (record: any) => void][] = [
      ["key", r => { r.record.properties.metrics[0].key = "invented_metric"; }],
      ["key", r => { r.record.properties.metrics[0].key = "toString"; }],
      ["unit", r => { r.record.properties.metrics[0].unit = "bytes"; }],
      ["value", r => { r.record.properties.metrics[0].value = -1; }],
      ["value", r => { r.record.properties.metrics[0].value = Infinity; }],
      ["value", r => { r.record.properties.metrics[0].value = Number.MAX_SAFE_INTEGER + 1; }],
      ["observedAt", r => { r.record.properties.metrics[0].observedAt = "2026-02-31"; }],
      ["observedAt", r => { delete r.record.properties.metrics[0].observedAt; }],
      ["source", r => { delete r.record.properties.metrics[0].source; }],
      ["period", r => { r.record.properties.metrics[0].period = "month"; }],
      ["period", r => { r.record.properties.metrics[6].period = "sometimes"; }],
      ["id", r => { r.record.properties.metrics[1].id = r.record.properties.metrics[0].id; }],
      ["metrics", r => {
        r.record.properties.metrics[0].id = "123";
        for (const l of Object.values(r.localizations) as any[]) l.details.metrics[0].id = "123";
        r.localizations.en.details.metrics[0].id = 123;
      }],
      ["label", r => { r.localizations.en.details.metrics[0].label = "Invented label"; }],
      ["metrics", r => { r.localizations.en.details.metrics = []; }],
      ["recordCount", r => { r.record.properties.data.recordCount = null; }],
      ["usage", r => { r.record.properties.usage = []; }],
      ["usage", r => { r.localizations.en.details.usage = []; }],
    ];
    for (const [field, mutate] of invalid) {
      const record = structuredClone(valid);
      mutate(record);
      const result = validateRecordQuality(record.id, record);
      assert.ok(!result.valid && result.issues.some(issue => issue.path?.endsWith(`.${field}`)), `${depth}/${field}: ${JSON.stringify(result.issues)}`);
    }
  }

});

test("metric labels and units are closed; formatting keeps reporting basis separate from units", () => {
  assert.throws(() => {
    // @ts-expect-error Metric vocabulary is closed, including at the lookup boundary.
    vocabularyLabel("en", "metricKeys", "view_count");
  }, /Unknown metricKeys/);
  assert.throws(() => {
    // @ts-expect-error Units cannot encode a reporting period.
    vocabularyLabel("en", "units", "sessions\/month");
  }, /Unknown units/);
  const metric: SourcedMetric = { id: "m", key: "session_count", value: 1200, observedAt: "2026-08", source: "s", period: "month" };
  assert.equal(formatMetricValue(metric, "en"), "1,200 sessions · per month");
  assert.match(formatMetricValue(metric, "fr"), /par mois$/);
  assert.equal(formatMetricValue({ ...metric, period: null }, "en"), "1,200 sessions");
  assert.equal(formatMetricValue({ ...metric, key: "storage_size_bytes", value: 194684778, period: null }, "en"), "194.7 MB");
});

async function legacyDatabase() {
  const db = new PGlite();
  await db.exec(`CREATE TABLE nodes(id text PRIMARY KEY, properties_json jsonb, sources jsonb);
    CREATE TABLE node_localizations(node_id text, locale text, description text, details_json jsonb, review_json jsonb);`);
  const count = { id: "count", key: "record_count", unit: "species records", value: 71911, source: "s", observedAt: "2025-04" };
  const visits = { id: "visits", key: "view_count", unit: "visits/month", value: 700000, source: "s", observedAt: "2026-02" };
  const size = { id: "size", key: "storage_size_bytes", unit: "bytes", value: 1234, source: "s", observedAt: "2026" };
  const properties = { untouched: true, data: { descriptors: [], recordCount: count, storageSize: size }, usage: [visits] };
  await db.query("INSERT INTO nodes VALUES ('system', $1, $2)", [JSON.stringify(properties), JSON.stringify({ s: { id: "s" } })]);
  await db.query("INSERT INTO nodes VALUES ('unrelated', '{}', '{}')");
  for (const locale of ["en", "fr"]) await db.query("INSERT INTO node_localizations VALUES ('system',$1,$2,$3,$4)", [locale, `${locale} profile`, JSON.stringify({
    data: { descriptors: [], recordCount: { id: "count", description: `${locale} species in a public snapshot` }, storageSize: { id: "size", description: `${locale} compressed snapshot` } },
    usage: [{ id: "visits", description: `${locale} more than 700000 monthly visits; not sessions` }],
    researchGaps: { storageSize: "Legacy caveat" },
  }), JSON.stringify({ history: [{ state: "human_reviewed" }] })]);
  return db;
}

test("metric migration preserves scoped counts and sourced prose, leaves unrelated data intact, and is idempotent", async () => {
  const db = await legacyDatabase();
  try {
    await db.exec(migration);
    const snapshot = async () => ({
      nodes: (await db.query<any>("SELECT * FROM nodes ORDER BY id")).rows,
      localizations: (await db.query<any>("SELECT * FROM node_localizations ORDER BY locale")).rows,
    });
    const first = await snapshot();
    const system = first.nodes.find(n => n.id === "system").properties_json;
    assert.deepEqual(system.metrics.map((m: any) => m.key), ["species_count", "storage_size_bytes"]);
    assert.equal(system.metrics[0].value, 71911);
    assert.equal(system.metrics[0].source, "s");
    assert.ok(!("usage" in system) && !("recordCount" in system.data) && system.untouched);
    assert.deepEqual(first.nodes.find(n => n.id === "unrelated").properties_json, {});
    for (const l of first.localizations) {
      assert.match(l.description, /700000 visits\/month \(2026-02\)/);
      assert.match(l.description, /not sessions/);
      assert.deepEqual(l.details_json.profile.sourceRefs, ["s"]);
      assert.deepEqual(l.details_json.metrics.map((m: any) => m.id), ["count", "size"]);
      assert.equal(l.details_json.metrics[0].description, `${l.locale} species in a public snapshot`);
      assert.deepEqual(l.details_json.researchGaps, { data: "Legacy caveat" });
      assert.deepEqual(l.review_json, { history: [{ state: "human_reviewed" }] });
    }
    await db.exec(migration);
    assert.deepEqual(await snapshot(), first);
  } finally { await db.close(); }
});

test("metric migration rolls back on collisions or orphaned localized evidence", async () => {
  for (const collision of [true, false]) {
    const db = await legacyDatabase();
    try {
      await db.exec(collision
        ? `UPDATE nodes SET properties_json = properties_json || '{"metrics":[{"id":"count"}]}' WHERE id = 'system'`
        : `UPDATE node_localizations SET details_json = jsonb_set(details_json,'{usage}','[{"id":"orphan","description":"Preserve me"}]')`);
      const before = (await db.query("SELECT * FROM nodes ORDER BY id")).rows;
      await assert.rejects(db.exec(migration), collision ? /duplicate metric IDs/ : /orphaned localized metric/);
      await db.exec("ROLLBACK");
      assert.deepEqual((await db.query("SELECT * FROM nodes ORDER BY id")).rows, before);
    } finally { await db.close(); }
  }
});
