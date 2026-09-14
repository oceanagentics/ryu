import type { GraphNode, ResolvedNodeLocalization } from "../../shared/domain";
import type { RecordAggregateContentInput, RecordPatchInput, RecordDetailDto } from "../../shared/recordApi";
import example from "./fixtures/rich-organization.json";
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { PostgresGraphRepository } from "./postgresGraphRepository";

import { supportedLocales } from "../../shared/localization";
import { organizationMetrics, organizationOffices, resolveNodeDisplay } from "../../shared/recordDisplay";
import { buildRecordUpdatedAt, readRecordAggregateContentInput, readRecordPatchInput, readRecordSearchQuery, toDefaultRecordDetailDto, validateRecordQuality } from "./recordContracts";

const schema = fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../schema/016_organization_record_shape.sql", import.meta.url), "utf8");

const translated = (value: string) => Object.fromEntries(supportedLocales.map(locale => [locale, `${value} (${locale})`]));

function fixture() { return structuredClone(example); }

test("rich organization contract is compact, sourced and complete in every locale", () => {
  const input = fixture();
  const result = validateRecordQuality(input.id, readRecordAggregateContentInput(input.id, input));
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.equal(result.sourceCompleteness?.status, "complete");

  const node = {
    id: input.id,
    ...input.record,
    createdAt: "2026-09-14",
    updatedAt: "2026-09-14",
    localizations: Object.fromEntries(Object.entries(input.localizations).map(([locale, localization]) => [locale, {
      ...localization,
      locale,
      contentUpdatedAt: "2026-09-14",
      review: { state: "agent_researched", reviewer: null, date: null, note: null },
      createdAt: "2026-09-14",
      updatedAt: "2026-09-14",
    }])),
    availableLocales: [...supportedLocales],
    requestedLocale: "en",
    displayLocale: "en",
    isLocaleFallback: false,
  } as any;
  const localization = resolveNodeDisplay(node, "en");
  assert.equal(organizationMetrics(node, localization)[0].label, "Staff");
  assert.deepEqual(organizationOffices(node, localization).map(office => office.location), ["Wellington, New Zealand", "Nairobi, Kenya"]);
});

test("organization shape rejects system fields, office counts and misplaced fact descriptions", () => {
  const failures: [string, (input: ReturnType<typeof fixture>) => void][] = [
    ["record.properties.data", input => { (input.record.properties as any).data = { descriptors: [] }; }],
    ["record.properties.officeCount", input => { (input.record.properties as any).officeCount = 2; }],
    ["record.properties.established.date", input => { input.record.properties.established.date = "2026-13"; }],
    ["record.properties.established.description", input => { (input.record.properties.established as any).description = "Founded after a merger."; }],
    ["record.properties.metrics[0].key", input => { input.record.properties.metrics[0].key = "record_count" as any; }],
    ["record.properties.metrics[0].period", input => { (input.record.properties.metrics[0] as any).period = "year"; }],
    ["record.properties.metrics[0].description", input => { (input.record.properties.metrics[0] as any).description = "Permanent staff only."; }],
    ["record.properties.offices[0].kind", input => { input.record.properties.offices[0].kind = "branch" as any; }],
    ["localizations.en.details.profile.mission", input => { input.localizations.en.details.profile.mission = "" as any; }],
    ["localizations.en.details.offices", input => { input.localizations.en.details.offices[0].id = "other"; }],
    ["record.sources.annual-report.description.fr", input => { delete (input.record.sources["annual-report"].description as any).fr; }],
    ["localizations.fr", input => { delete (input.localizations as any).fr; }],
    ["edges", input => { input.edges = []; }],
    ["edges.example-alliance-member-of-coalition.description", input => { input.edges[0].description = ""; }],
      ];

  for (const [path, mutate] of failures) {
    const input = fixture();
    mutate(input);
    const result = validateRecordQuality(input.id, input as any);
    assert.equal(result.valid, false, path);
    assert.ok(result.issues.some(issue => issue.path === path), `${path}: ${JSON.stringify(result.issues)}`);
  }
});

test("rich organizations use explicit research gaps instead of invented facts", () => {
  const input = fixture();
  input.record.properties.established = null as any;
  input.record.properties.metrics = [];
  input.record.properties.offices = [];
  for (const localization of Object.values(input.localizations)) {
    localization.details.offices = [];
    (localization.details as any).researchGaps = {
      established: "No authoritative establishment date was located.",
      scale: "No comparable current staffing or membership figure was published.",
      officeLocations: "No authoritative office directory was located.",
    };
  }
  const result = validateRecordQuality(input.id, readRecordAggregateContentInput(input.id, input));
  assert.equal(result.valid, true, JSON.stringify(result.issues));

  delete (input.localizations.en.details as any).researchGaps.established;
  assert.ok(validateRecordQuality(input.id, readRecordAggregateContentInput(input.id, input)).issues
    .some(issue => issue.path === "localizations.en.details.researchGaps.established"));
});

test("reference schema and migration enforce organization shape and normalize only empty legacy sections", async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    const valid = fixture();
    assert.equal((await db.query<{ valid: boolean }>("SELECT valid_organization_record_object($1, 'properties') AS valid", [JSON.stringify(valid.record.properties)])).rows[0].valid, true);
    assert.equal((await db.query<{ valid: boolean }>("SELECT valid_organization_record_object($1, 'details') AS valid", [JSON.stringify(valid.localizations.en.details)])).rows[0].valid, true);
    assert.equal((await db.query<{ valid: boolean }>("SELECT valid_organization_record_object($1, 'details') AS valid", [JSON.stringify({ researchGaps: { established: "No authoritative date was located." } })])).rows[0].valid, true);
    assert.equal((await db.query<{ valid: boolean }>("SELECT valid_organization_record_object($1, 'properties') AS valid", [JSON.stringify({ ...valid.record.properties, officeCount: 2 })])).rows[0].valid, false);

    await db.exec("DROP TRIGGER trg_nodes_organization_record_shape ON nodes; DROP TRIGGER trg_localizations_organization_record_shape ON node_localizations;");
    await db.query("INSERT INTO nodes(id,kind,properties_json) VALUES ('legacy-organization','organization',$1)", [JSON.stringify({ disciplines: [], data: { descriptors: [] }, access: [], gallery: [], metrics: [] })]);
    await db.query("INSERT INTO node_localizations(node_id,locale,title,details_json) VALUES ('legacy-organization','en','Legacy Organization',$1)", [JSON.stringify({ aliases: [], profile: { sourceRefs: [] }, data: { descriptors: [] }, access: [], gallery: [], metrics: [] })]);
    await db.exec(migration);
    assert.deepEqual((await db.query<{ properties_json: object }>("SELECT properties_json FROM nodes WHERE id='legacy-organization'")).rows[0].properties_json, { metrics: [] });
    assert.deepEqual((await db.query<{ details_json: object }>("SELECT details_json FROM node_localizations WHERE node_id='legacy-organization'")).rows[0].details_json, { aliases: [], profile: { sourceRefs: [] } });
    await assert.rejects(db.query("UPDATE nodes SET properties_json='{\"officeCount\":2}' WHERE id='legacy-organization'"), /canonical record shape/);
  } finally {
    await db.close();
  }
});

function organizationTypeContract(node: GraphNode<"organization">, localized: ResolvedNodeLocalization<"organization">, dto: RecordDetailDto<"organization">) {
  const content: RecordAggregateContentInput<"organization"> = { record: { kind: node.kind, url: node.url, properties: node.properties } };
  const patch: RecordPatchInput<"organization"> = { localizations: { en: { mode: "patch", description: "Institutional context." } } };
  // @ts-expect-error Institutional facts are not a data catalogue.
  node.properties.data;
  // @ts-expect-error Office locations are organization prose, treaties are country prose.
  localized.details.treatyParticipation;
  // @ts-expect-error Organization DTOs do not carry a country identity.
  dto.record.countryCode;
  // @ts-expect-error Organization scale uses organization-only keys.
  content.record.properties = { metrics: [{ id: "size", key: "record_count", value: 3, observedAt: null, source: "evidence" }] };
  // @ts-expect-error Organization metrics have no reporting period.
  content.record.properties = { metrics: [{ id: "staff", key: "staff_count", value: 3, observedAt: null, source: "evidence", period: "year" }] };
  // @ts-expect-error Organization patches cannot add system access mechanics.
  patch.record = { propertiesReplace: { access: [] } };
}

test("organization reads and writes retain their own facts, localizations, sources and reviews", async () => {
  const db = new PGlite();
  const client = { query: async (sql: string, params: unknown[] = []) => {
    const result = await db.query(sql, params);
    return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
  }, release() {} };
  const repository = new PostgresGraphRepository({ ...client, connect: async () => client } as unknown as Pool);
  const input = fixture();
  const read = (id = input.id) => repository.getRecord(id, readRecordSearchQuery({}));
  try {
    await db.exec(schema);
    await db.query("INSERT INTO nodes(id,kind) VALUES ('example-coalition','organization')");
    const payload = readRecordAggregateContentInput(input.id, input);
    const dry = await repository.upsertRecord(input.id, payload, { createOnly: true, validateOnly: true });
    assert.ok("valid" in dry && dry.valid, JSON.stringify(dry));
    const applied = await repository.upsertRecord(input.id, payload, { createOnly: true });
    assert.ok("node" in applied, JSON.stringify(applied));
    await repository.updateNodeLocalizationReview(input.id, "en", { reviewState: "agent_researched" }, "research-agent", { recordUpdatedAt: buildRecordUpdatedAt(await read()) });
    const before = await read();
    for (const scope of ["public", "admin", "private"] as const) {
      const dto = toDefaultRecordDetailDto(before, scope, ["reviewHistory"], "en");
      assert.equal(dto.kind, "organization");
      assert.equal("countryCode" in dto.record, false);
      assert.equal("routes" in dto, false);
      assert.deepEqual(dto.localizations!.en!.details, input.localizations.en.details);
      assert.ok(dto.localizations!.en!.review.date);
      assert.equal(dto.localizations!.en!.review.history!.length, before.node.localizations.en!.review.history!.length);
      assert.deepEqual(dto.record.sources, input.record.sources);
    }
    assert.deepEqual((await repository.getBootstrap()).nodes.find(node => node.id === input.id), before.node);
    for (const patch of [
      { record: { propertiesReplace: { data: { descriptors: [] } } } },
      { routes: { upsert: [] } },
      { record: { kind: "system", recordDepth: "thin", propertiesReplace: {} } },
    ]) {
      const parsed = readRecordPatchInput(input.id, patch);
      const options = { recordUpdatedAt: buildRecordUpdatedAt(before) };
      const dry = await repository.patchRecord(input.id, parsed, { ...options, validateOnly: true });
      assert.ok("valid" in dry && !dry.valid, JSON.stringify(dry));
      assert.deepEqual(await repository.patchRecord(input.id, parsed, options), dry);
      assert.deepEqual(await read(), before);
    }
    // A deliberate kind change succeeds only after incompatible retained
    // content (including operational routes) is explicitly replaced/deleted.
    await repository.upsertRecord("convert", readRecordAggregateContentInput("convert", {
      record: { kind: "system", url: "https://example.org", properties: {} },
      localizations: { en: { title: "Convertible", details: { aliases: [] } } },
      routes: [{ id: "convert-route", status: "planned", mode: "api" }],
    }), { createOnly: true });
    const changed = await repository.patchRecord("convert", readRecordPatchInput("convert", {
      record: { kind: "organization", propertiesReplace: {} }, routes: { delete: ["convert-route"] },
    }), { recordUpdatedAt: buildRecordUpdatedAt(await read("convert")) });
    assert.ok("node" in changed && changed.node.kind === "organization", JSON.stringify(changed));
    assert.equal("routes" in changed, false);
    assert.equal((await db.query("SELECT * FROM ryu_routes WHERE node_id='convert'")).rows.length, 0);
  } finally { await db.close(); }
});
