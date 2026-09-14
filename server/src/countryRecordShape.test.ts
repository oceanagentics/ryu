import type { GraphNode, ResolvedNodeLocalization } from "../../shared/domain";
import type { RecordAggregateContentInput, RecordPatchInput, RecordDetailDto } from "../../shared/recordApi";
import example from "./fixtures/rich-country.json";
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";

import { supportedLocales } from "../../shared/localization";
import { countryTreatyParticipation, resolveNodeDisplay } from "../../shared/recordDisplay";
import { buildRecordUpdatedAt, readRecordAggregateContentInput, readRecordPatchInput, readRecordSearchQuery, toDefaultRecordDetailDto, validateRecordQuality } from "./recordContracts";
import { PostgresGraphRepository } from "./postgresGraphRepository";

const schema = fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../schema/015_country_record_shape.sql", import.meta.url), "utf8");

function fixture() { return structuredClone(example); }

test("rich country contract is compact, sourced and complete in every locale", () => {
  const input = fixture();
  const result = validateRecordQuality(input.id, readRecordAggregateContentInput(input.id, input));
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.equal(result.sourceCompleteness?.status, "complete");

  const graphNode = {
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
  assert.deepEqual(countryTreatyParticipation(graphNode, resolveNodeDisplay(graphNode, "en"))[0], {
    ...input.record.properties.treatyParticipation[0],
    ...input.localizations.en.details.treatyParticipation[0],
  });
});

test("country shape and rich requirements reject incomplete or system-shaped content", () => {
  const failures: [string, (input: ReturnType<typeof fixture>) => void][] = [
    ["record.countryCode", input => { input.record.countryCode = null as any; }],
    ["record.properties.extra", input => { (input.record.properties as any).extra = true; }],
    ["record.properties.data", input => { (input.record.properties as any).data = { descriptors: [] }; }],
    ["record.properties.treatyParticipation", input => { input.record.properties.treatyParticipation = []; }],
    ["record.properties.treatyParticipation[0].status", input => { input.record.properties.treatyParticipation[0].status = "ratified" as any; }],
    ["record.properties.treatyParticipation[0].signatureDate", input => { input.record.properties.treatyParticipation[0].signatureDate = "2026-02-31"; }],
    ["record.properties.treatyParticipation[0].consentMethod", input => { input.record.properties.treatyParticipation[0].consentMethod = "signature" as any; }],
    ["record.properties.treatyParticipation[0].focalPointUrl", input => { input.record.properties.treatyParticipation[0].focalPointUrl = "mailto:focal@example.gov"; }],
    ["record.properties.treatyParticipation[0].sourceRefs", input => { input.record.properties.treatyParticipation[0].sourceRefs = ["treaty-status", "treaty-status"]; }],
    ["localizations.en.summary", input => { input.localizations.en.summary = null as any; }],
    ["localizations.en.description", input => { Object.assign(input.localizations.en, { description: "Extra prose" }); }],
    ["localizations.en.details.data", input => { (input.localizations.en.details as any).data = { descriptors: [] }; }],
    ["localizations.en.details.treatyParticipation", input => { input.localizations.en.details.treatyParticipation[0].id = "different"; }],
    ["localizations.en.details.treatyParticipation[0].description", input => { input.localizations.en.details.treatyParticipation[0].description = ""; }],
    ["localizations.en.details.treatyParticipation[0].focalPoint", input => { input.localizations.en.details.treatyParticipation[0].focalPoint = ""; }],
    ["localizations.fr", input => { delete (input.localizations as any).fr; }],
      ];

  for (const [path, mutate] of failures) {
    const input = fixture();
    mutate(input);
    const result = validateRecordQuality(input.id, input as any);
    assert.equal(result.valid, false, path);
    assert.ok(result.issues.some(issue => issue.path === path), `${path}: ${JSON.stringify(result.issues)}`);
  }

  for (const recordDepth of ["stub", "thin"]) {
    const sparse = { record: { kind: "country", countryCode: "XMP", recordDepth }, localizations: { en: { title: "Example Country" } } };
    assert.equal(validateRecordQuality("example-country", readRecordAggregateContentInput("example-country", sparse)).valid, true);
    assert.throws(() => readRecordAggregateContentInput("example-country", { ...sparse, record: { ...sparse.record, url: null } }), /unsupported record fields: url/);
  }

  const organization = { record: { kind: "organization", recordDepth: "stub", properties: { treatyParticipation: [] } } };
  assert.ok(validateRecordQuality("organization", readRecordAggregateContentInput("organization", organization)).issues
    .some(issue => issue.path === "record.properties.treatyParticipation"));
});

test("reference schema and migration enforce the country shape and preserve legacy prose", async () => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    const valid = fixture();
    const properties = JSON.stringify(valid.record.properties);
    const details = JSON.stringify(valid.localizations.en.details);
    assert.equal((await db.query<{ valid: boolean }>("SELECT valid_country_record_object($1, 'properties') AS valid", [properties])).rows[0].valid, true);
    assert.equal((await db.query<{ valid: boolean }>("SELECT valid_country_record_object($1, 'details') AS valid", [details])).rows[0].valid, true);
    assert.equal((await db.query<{ valid: boolean }>("SELECT valid_country_record_object($1, 'properties') AS valid", [JSON.stringify({ ...valid.record.properties, extra: true })])).rows[0].valid, false);
    assert.equal((await db.query<{ valid: boolean }>("SELECT valid_country_record_object($1, 'details') AS valid", [JSON.stringify({ ...valid.localizations.en.details, treatyParticipation: [{ ...valid.localizations.en.details.treatyParticipation[0], focalPoint: "" }] })])).rows[0].valid, false);

    await db.exec("DROP TRIGGER trg_nodes_kind_fields ON nodes; DROP TRIGGER trg_localizations_kind_fields ON node_localizations; DROP TRIGGER trg_nodes_country_record_shape ON nodes; DROP TRIGGER trg_localizations_country_record_shape ON node_localizations;");
    await db.query("INSERT INTO nodes(id,kind,country_code,properties_json) VALUES ('legacy-country','country','XMP',$1)", [JSON.stringify({ disciplines: [], data: { descriptors: [] }, access: [], gallery: [], metrics: [], pseudoCountry: false })]);
    await db.query("INSERT INTO node_localizations(node_id,locale,title,details_json) VALUES ('legacy-country','en','Legacy Country',$1)", [JSON.stringify({ aliases: [], data: { descriptors: [] }, access: [], gallery: [], metrics: [] })]);
    await db.query("UPDATE nodes SET url='https://example.gov' WHERE id='legacy-country'");
    await db.query("UPDATE node_localizations SET summary='Introduction', description='Additional context' WHERE node_id='legacy-country'");
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual((await db.query<{ properties_json: object }>("SELECT properties_json FROM nodes WHERE id='legacy-country'")).rows[0].properties_json, {});
    assert.deepEqual((await db.query<{ details_json: object }>("SELECT details_json FROM node_localizations WHERE node_id='legacy-country'")).rows[0].details_json, { aliases: [] });
    assert.deepEqual((await db.query("SELECT summary,description FROM node_localizations WHERE node_id='legacy-country'")).rows[0], { summary: "Introduction\n\nAdditional context", description: null });
    await assert.rejects(db.query("UPDATE nodes SET url='https://example.gov' WHERE id='legacy-country'"), /canonical record shape/);
    await assert.rejects(db.query("UPDATE node_localizations SET description='Extra prose' WHERE node_id='legacy-country'"), /canonical record shape/);
    await assert.rejects(db.query("UPDATE nodes SET properties_json='{\"extra\":true}' WHERE id='legacy-country'"), /canonical record shape/);
  } finally {
    await db.close();
  }
});

test("country PUT, PATCH, DTOs and bootstrap retain one introduction and dated same-state reviews", async () => {
  const db = new PGlite();
  const client = { query: async (sql: string, params: unknown[] = []) => {
    const result = await db.query(sql, params);
    return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
  }, release() {} };
  const repository = new PostgresGraphRepository({ ...client, connect: async () => client } as unknown as Pool);
  const input = fixture();
  const read = () => repository.getRecord(input.id, readRecordSearchQuery({}));
  try {
    await db.exec(schema);
    const payload = readRecordAggregateContentInput(input.id, input);
    const dry = await repository.upsertRecord(input.id, payload, { createOnly: true, validateOnly: true });
    assert.ok("valid" in dry && dry.valid, JSON.stringify(dry));
    assert.equal((await db.query("SELECT * FROM nodes")).rows.length, 0);
    const applied = await repository.upsertRecord(input.id, payload, { createOnly: true });
    assert.ok("node" in applied, JSON.stringify(applied));
    const updated = await repository.patchRecord(input.id, readRecordPatchInput(input.id, {
      localizations: { en: { mode: "replace", ...input.localizations.en, summary: "Updated country introduction." } },
    }), { recordUpdatedAt: buildRecordUpdatedAt(await read()) });
    assert.ok("node" in updated, JSON.stringify(updated));
    const beforeReview = (await read()).node.localizations.en!;
    for (let i = 0; i < 2; i++) {
      const reviewed = await repository.updateNodeLocalizationReview(input.id, "en", { reviewState: "agent_researched" }, "research-agent", {
        recordUpdatedAt: buildRecordUpdatedAt(await read()),
      });
      assert.equal(reviewed.localizations.en!.review.state, "agent_researched");
      assert.ok(Number.isFinite(Date.parse(reviewed.localizations.en!.review.date!)));
      assert.equal(reviewed.localizations.en!.review.history!.length, beforeReview.review.history!.length + i + 1);
      assert.equal(reviewed.localizations.en!.contentUpdatedAt, beforeReview.contentUpdatedAt);
    }
    const aggregate = await read();
    for (const scope of ["public", "admin", "private"] as const) {
      const dto = toDefaultRecordDetailDto(aggregate, scope, ["reviewHistory"], "en");
      assert.equal("url" in dto, false);
      assert.equal("url" in dto.record, false);
      assert.equal("description" in dto.localizations!.en!, false);
      assert.equal(dto.localizations!.en!.summary, "Updated country introduction.");
      assert.ok(dto.localizations!.en!.review.date);
    }
    const country = (await repository.getBootstrap()).nodes.find(node => node.id === input.id)!;
    assert.equal("url" in country, false);
    assert.equal("description" in country.localizations.en!, false);
    assert.deepEqual(Object.keys(country.localizations.en!.details).sort(), ["aliases", "profile", "treatyParticipation"]);
    const invalid = await repository.patchRecord(input.id, readRecordPatchInput(input.id, {
      localizations: { en: { mode: "patch", description: "Another introduction" } },
    }), { recordUpdatedAt: buildRecordUpdatedAt(aggregate) });
    assert.ok("valid" in invalid && !invalid.valid);
    assert.deepEqual(await read(), aggregate);
  } finally { await db.close(); }
});

// Compile-time coverage: a country retains its contract at each public boundary.
function countryTypeContract(node: GraphNode<"country">, localized: ResolvedNodeLocalization<"country">, dto: RecordDetailDto<"country">) {
  const content: RecordAggregateContentInput<"country"> = { record: { kind: node.kind, countryCode: node.countryCode, properties: node.properties } };
  const patch: RecordPatchInput<"country"> = { localizations: { en: { mode: "patch", summary: "Introduction." } } };
  // @ts-expect-error A country has only its declared neutral facts.
  node.properties.metrics;
  // @ts-expect-error Country introductions have one prose field.
  localized.description;
  // @ts-expect-error Country DTOs have no canonical website.
  dto.record.url;
  // @ts-expect-error Country aggregates have no operational routes section.
  content.routes = [];
  // @ts-expect-error A country localization patch uses the country contract.
  patch.localizations = { en: { mode: "patch", description: "Second introduction." } };
}
