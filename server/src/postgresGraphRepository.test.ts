import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

import type { Pool } from "pg";

import type { RecordAggregateContentInput } from "../../shared/recordApi";
import { dataFormats, dataStandards, dataTypes } from "../../shared/domain";
import { PostgresGraphRepository } from "./postgresGraphRepository";
import { buildRecordUpdatedAt, readRecordAggregateContentInput, readRecordPatchInput, readRecordSearchQuery, toDefaultRecordDetailDto, validateRecordQuality } from "./recordContracts";
import { collectSourceIds } from "./graphRepositorySupport";

class FakePoolClient {
  calls: string[] = [];
  queries: Array<{ sql: string; params: unknown[] }> = [];
  released = false;

  async query(sql: string, params: unknown[] = []): Promise<{ rows: unknown[]; rowCount: number }> {
    const normalizedSql = sql.trim().replace(/\s+/g, " ");
    this.calls.push(normalizedSql);
    this.queries.push({ sql: normalizedSql, params });
    if (sql.includes("SELECT id FROM nodes")) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes("INSERT INTO node_localizations")) {
      throw new Error("localization failure");
    }

    return { rows: [], rowCount: 1 };
  }

  release() {
    this.released = true;
  }
}

test("rolls back transactional record upserts when a related row write fails", async () => {
  const client = new FakePoolClient();
  const repository = new PostgresGraphRepository({
    connect: async () => client,
    query: async () => ({ rows: [{ record_updated_at: null }], rowCount: 1 }),
  } as unknown as Pool);
  const input: RecordAggregateContentInput = {
    id: "node-1",
    record: {
      kind: "system",
    },
    localizations: {
      en: {
        title: "Test System",
      },
    },
  };

  await assert.rejects(
    () => repository.upsertRecord("node-1", input, { createOnly: true }),
    /localization failure/,
  );

  assert.equal(client.calls[0], "BEGIN");
  assert.equal(client.calls.at(-1), "ROLLBACK");
  assert.equal(client.calls.includes("COMMIT"), false);
  assert.equal(client.released, true);
});

function richRecordFixture() {
  return JSON.parse(fs.readFileSync(new URL("./fixtures/rich-record.json", import.meta.url), "utf8"));
}

test("stored rich example enforces content, evidence, localization and allowed gaps", () => {
  const fixture = richRecordFixture();
  const valid = validateRecordQuality(fixture.id, readRecordAggregateContentInput(fixture.id, fixture));
  assert.equal(valid.valid, true, JSON.stringify(valid.issues));
  assert.equal(valid.sourceCompleteness?.status, "complete");
  const failures: [string, (input: typeof fixture) => void][] = [
    ["localizations.fr", input => { delete input.localizations.fr; }],
    ["localizations.en.summary", input => { input.localizations.en.summary = ""; }],
    ["localizations.en.details.profile.sourceRefs", input => { delete input.localizations.en.details.profile; }],
    ["record.countryCode", input => { input.record.countryCode = "INT"; }],
    ["record.properties.metrics[0].source", input => { delete input.record.properties.metrics[0].source; }],
    ["record.properties.metrics[0].observedAt", input => { input.record.properties.metrics[0].observedAt = "2026-02-31"; }],
    ["localizations.es.details.access", input => { input.localizations.es.details.access[0].id = "different"; }],
    ["record.sources.src-fishbase-home", input => { delete input.record.sources["src-fishbase-home"]; }],
    ["record.sources.src-fishbase-home.title.ar", input => { delete input.record.sources["src-fishbase-home"].title.ar; }],
    ["edges", input => { input.edges = []; }],
    [`edges.${fixture.edges[0].id}.sources`, input => { input.edges[0].sources = {}; }],
    ["record.properties.gallery[0].url", input => { input.record.properties.gallery[0].url = "/gallery/missing.png"; }],
    ["routes.example.target", input => { input.routes = [{ id: "example", status: "active", mode: "live_api", properties: { sourceRefs: ["src-fishbase-home"] } }]; }],
  ];
  for (const [path, mutate] of failures) {
    const input = richRecordFixture();
    mutate(input);
    const result = validateRecordQuality(input.id, input);
    assert.equal(result.valid, false, path);
    assert.ok(result.issues.some(issue => issue.path === path), `${path}: ${JSON.stringify(result.issues)}`);
  }
  const missingGallery = richRecordFixture();
  missingGallery.record.properties.gallery = [];
  for (const l of Object.values(missingGallery.localizations) as any[]) l.details.gallery = [];
  const missingGalleryResult = validateRecordQuality(missingGallery.id, missingGallery);
  assert.equal(missingGalleryResult.valid, false);
  assert.ok(missingGalleryResult.issues.some(issue => issue.path === "record.properties.gallery" && issue.message === "at least one useful gallery item showing a representative record or data content is required"));
  const metricGaps = richRecordFixture();
  metricGaps.record.properties.metrics = [];
  for (const l of Object.values(metricGaps.localizations) as any[]) {
    l.details.metrics = [];
    l.details.researchGaps = { ...l.details.researchGaps, data: "Not published", usage: "Not published" };
  }
  const result = validateRecordQuality(metricGaps.id, metricGaps);
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.ok(result.warnings?.length);
  assert.throws(() => readRecordAggregateContentInput(fixture.id, { ...fixture, incomplete: true }), /incomplete records/);
  for (const field of ["title", "note"]) {
    const reference = { id: "src-fishbase-home", url: "https://www.fishbase.se", [field]: "Duplicate source text" };
    for (const input of [
      { record: { propertiesReplace: { access: [{ source: reference }] } } },
      { localizations: { fr: { mode: "patch", detailsReplace: { evidence: { source: reference } } } } },
      { routes: { upsert: [{ id: "route", status: "planned", mode: "api", properties: { source: reference } }] } },
    ]) assert.throws(() => readRecordPatchInput(fixture.id, input), /source must be a string/);
  }
  assert.deepEqual([...collectSourceIds({ source: "official-homepage" })], ["official-homepage"]);
  for (const kind of ["country", "organization"] as const) {
    const minimal = richRecordFixture();
    minimal.record.kind = kind;
    minimal.record.recordDepth = "thin";
    minimal.record.properties = {};
    minimal.edges = [];
    for (const l of Object.values(minimal.localizations) as any[]) l.details = { profile: { sourceRefs: ["src-fishbase-home"] } };
    assert.equal(validateRecordQuality(minimal.id, minimal).sourceCompleteness?.status, "complete");
  }
});

test("discipline vocabulary and retired fields are validated at every record depth", () => {
  for (const recordDepth of ["stub", "thin", "rich"]) {
    for (const disciplines of [null, "ecology", ["fish_biodiversity"], ["taxonomy", "taxonomy"], [42]]) {
      const input = richRecordFixture();
      input.record.recordDepth = recordDepth;
      input.record.properties.disciplines = disciplines;
      const result = validateRecordQuality(input.id, input);
      assert.equal(result.valid, false, `${recordDepth}: ${JSON.stringify(disciplines)}`);
      assert.ok(result.issues.some(issue => issue.path === "record.properties.disciplines"));
    }
    for (const key of ["role", "disciplineFamily", "geographicScope"]) {
      const input = richRecordFixture();
      input.record.recordDepth = recordDepth;
      input.record.properties[key] = null;
      assert.equal(validateRecordQuality(input.id, input).valid, false, key);
    }
    for (const key of ["role", "disciplineFamily", "geographicScope", "disciplines"]) {
      const input = richRecordFixture();
      input.record.recordDepth = recordDepth;
      input.localizations.en.details[key] = "free text";
      assert.equal(validateRecordQuality(input.id, input).valid, false, `localized ${key}`);
    }
  }
  const generalist = richRecordFixture();
  generalist.record.properties.disciplines = [];
  assert.equal(validateRecordQuality(generalist.id, generalist).valid, true);
});

test("data types, formats and standards reject invented names, duplicate assignments and localized overrides at every depth", () => {
  for (const [category, vocabulary] of [["type", dataTypes], ["format", dataFormats], ["standard", dataStandards]] as const) {
    const fixture = richRecordFixture();
    // Isolate one assignment in this category so testing another approved ID
    // does not accidentally duplicate a different FishBase assignment.
    const descriptor = fixture.record.properties.data.descriptors.find((d: any) => d.category === category);
    const removed = new Set(fixture.record.properties.data.descriptors.filter((d: any) => d.category === category && d.id !== descriptor.id).map((d: any) => d.id));
    fixture.record.properties.data.descriptors = fixture.record.properties.data.descriptors.filter((d: any) => !removed.has(d.id));
    for (const l of Object.values(fixture.localizations) as any[]) l.details.data.descriptors = l.details.data.descriptors.filter((d: any) => !removed.has(d.id));
    for (const recordDepth of ["stub", "thin", "rich"]) {
      for (const label of [null, 42, "invented_value", "Taxonomic records", "CSV and parquet snapshots", ...vocabulary]) {
        const input = structuredClone(fixture);
        input.record.recordDepth = recordDepth;
        const index = input.record.properties.data.descriptors.findIndex((d: any) => d.category === category);
        input.record.properties.data.descriptors[index].label = label;
        const result = validateRecordQuality(input.id, input);
        const approved = (vocabulary as readonly unknown[]).includes(label);
        assert.equal(result.valid, approved, `${recordDepth}/${label}: ${JSON.stringify(result.issues)}`);
        if (!approved) assert.ok(result.issues.some(issue => issue.path === `record.properties.data.descriptors[${index}].label`));
      }
      const duplicate = structuredClone(fixture);
      duplicate.record.recordDepth = recordDepth;
      const type = duplicate.record.properties.data.descriptors.find((d: any) => d.category === category);
      duplicate.record.properties.data.descriptors.push({ ...type, id: "duplicate" });
      assert.ok(validateRecordQuality(duplicate.id, duplicate).issues.some(issue => issue.message.includes(`unique approved data ${category}`)));
      const override = structuredClone(fixture);
      override.record.recordDepth = recordDepth;
      override.localizations.en.details.data.descriptors.find((d: any) => d.id === type.id).label = "Invented type name";
      assert.ok(validateRecordQuality(override.id, override).issues.some(issue => issue.message.includes("labels come from the shared vocabulary")));
      if (category === "standard") {
        for (const source of [null, "missing-source"]) {
          const uncited = structuredClone(fixture);
          uncited.record.recordDepth = recordDepth;
          uncited.record.properties.data.descriptors.find((d: any) => d.id === descriptor.id).source = source;
          assert.equal(validateRecordQuality(uncited.id, uncited).valid, false);
        }
        const untranslated = structuredClone(fixture);
        untranslated.record.recordDepth = recordDepth;
        delete untranslated.localizations.fr;
        assert.ok(validateRecordQuality(untranslated.id, untranslated).issues.some(issue => issue.path?.includes(`localizations.fr.details.data.descriptors.${descriptor.id}.description`)));
        const organization = structuredClone(fixture);
        organization.record.kind = "organization";
        organization.record.recordDepth = recordDepth;
        assert.ok(validateRecordQuality(organization.id, organization).issues.some(issue => issue.path === "record.properties.data"));
      }
    }
  }
  const generalist = richRecordFixture();
  const typeIds = new Set(generalist.record.properties.data.descriptors.filter((d: any) => d.category === "type").map((d: any) => d.id));
  generalist.record.properties.data.descriptors = generalist.record.properties.data.descriptors.filter((d: any) => !typeIds.has(d.id));
  for (const l of Object.values(generalist.localizations) as any[]) l.details.data.descriptors = l.details.data.descriptors.filter((d: any) => !typeIds.has(d.id));
  assert.equal(validateRecordQuality(generalist.id, generalist).valid, true);
});

test("data type migration preserves evidence, removes ambiguous claims and duplicates, and is safe to rerun", async () => {
  const db = new PGlite();
  try {
    // Migration 007 consumes the citation format that predates owned sources.
    await db.exec(`
      CREATE TABLE nodes(id text PRIMARY KEY,kind text,properties_json jsonb);
      CREATE TABLE node_localizations(node_id text,locale text,title text,details_json jsonb,review_json jsonb);
    `);
    const source = { id: "official", url: "https://example.org" };
    const cases = [
      ["fishbase", ["Species biology profiles", "Life history and population dynamics", "Taxonomy / nomenclature", "taxonomic_records", "Fisheries and human uses"], [[1, "biological_traits"], [3, "taxonomic_records"]]],
      ["aquamaps", ["Occurrence / observation", "Model / forecast / reanalysis"], [[1, "model_outputs"]]],
      ["bio-oracle", ["Environmental layers", "Physical oceanography", "Model / forecast / reanalysis"], [[1, "model_outputs"]]],
      ["ggbn", ["Genomic / sequence", "Sample / biosample", "Metadata catalogue / registry"], [[1, "sample_records"]]],
      ["geome", ["Genomic / sequence", "Sample / biosample"], [[0, "sequence_data"], [1, "sample_records"]]],
      ["datras", ["Fisheries catch / effort"], [[0, "survey_records"]]],
      ["platform-bbnj-chm", ["Metadata catalogue / registry", "Policy / treaty information"], []],
      ["dryad", ["Research artifact / publication"], []],
      ["untyped", [], []],
    ] as const;
    const format = { id: "format", category: "format", label: "CSV", source };
    const standard = { id: "standard", category: "standard", label: "Darwin Core", source };
    for (const [id, labels] of cases) {
      const descriptors = labels.map((label, i) => ({ id: `type-${i}`, category: "type", label, source: i === 1 ? source : null }));
      await db.query("INSERT INTO nodes (id, kind, properties_json) VALUES ($1, 'system', $2)", [id, JSON.stringify({ custom: true, data: { recordCount: null, descriptors: [...descriptors, format, standard] } })]);
      for (const locale of ["en", "fr"]) {
        const localized = [...descriptors, format, standard].map(d => ({ id: d.id, label: `${locale}/${d.label}`, description: `${locale}/${d.id} evidence` }));
        await db.query("INSERT INTO node_localizations (node_id, locale, title, details_json, review_json) VALUES ($1, $2, $1, $3, '{\"history\":[{\"state\":\"human_reviewed\",\"reviewer\":null,\"date\":null,\"note\":null}]}')", [id, locale, JSON.stringify({ profile: { sourceRefs: [source.id] }, data: { descriptors: localized } })]);
      }
    }
    const migration = fs.readFileSync(new URL("../schema/007_data_types.sql", import.meta.url), "utf8");
    await db.exec(migration);
    const nodes = (await db.query<{ id: string; properties_json: any }>("SELECT * FROM nodes ORDER BY id")).rows;
    const localizations = (await db.query<{ node_id: string; locale: string; details_json: any; review_json: any }>("SELECT * FROM node_localizations ORDER BY node_id, locale")).rows;
    for (const [id, , expected] of cases) {
      const descriptors = expected.map(([i, label]) => ({ id: `type-${i}`, category: "type", label, source: i === 1 ? source : null }));
      assert.deepEqual(nodes.find(n => n.id === id)?.properties_json, { custom: true, data: { recordCount: null, descriptors: [...descriptors, format, standard] } }, id);
      for (const l of localizations.filter(l => l.node_id === id)) {
        assert.deepEqual(l.details_json, { profile: { sourceRefs: [source.id] }, data: { descriptors: [
          ...descriptors.map(d => ({ id: d.id, description: `${l.locale}/${d.id} evidence` })),
          ...[format, standard].map(d => ({ id: d.id, label: `${l.locale}/${d.label}`, description: `${l.locale}/${d.id} evidence` })),
        ] } }, `${id}/${l.locale}`);
        assert.equal(l.review_json.history.at(-1).state, "human_reviewed");
      }
    }
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT * FROM nodes ORDER BY id")).rows, nodes);
    assert.deepEqual((await db.query("SELECT * FROM node_localizations ORDER BY node_id, locale")).rows, localizations);
  } finally { await db.close(); }
});

test("discipline migration preserves new tags and unrelated content and is safe to rerun", async () => {
  const db = new PGlite();
  try {
    await db.exec(fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8"));
    await db.exec("DROP TRIGGER trg_nodes_record_shape ON nodes; DROP TRIGGER trg_localizations_record_shape ON node_localizations;");
    const cases = [
      ["argo", "oceanography", ["oceanography"]],
      ["genbank", "genetics", ["genetics"]],
      ["catch", "fisheries", ["fisheries_science"]],
      ["map", "cartography", ["geography"]],
      ["coast", "coastal_planning", ["spatial_planning"]],
      ["fishbase", "fish_biodiversity", ["zoology"]],
      ["worms", "reference", ["taxonomy"]],
      ["unrelated-reference", "reference", []],
      ["gbif", "biodiversity", []],
      ["sealifebase", "aquatic_biodiversity", []],
      ["zenodo", "cross-domain", []],
      ["unknown", "invented", []],
      ["empty", null, []],
    ] as const;
    for (const [id, family] of cases) {
      await db.query("INSERT INTO nodes (id, kind, properties_json) VALUES ($1, 'system', $2)", [id, JSON.stringify({ disciplineFamily: family, role: "legacy", geographicScope: "global", custom: { preserve: true } })]);
    }
    await db.query("INSERT INTO nodes (id, kind, properties_json) VALUES ('already-tagged', 'system', $1)", [JSON.stringify({ disciplines: ["ecology", "taxonomy"], role: "legacy", disciplineFamily: "reference" })]);
    await db.query("UPDATE nodes SET sources=$1 WHERE id='worms'", [JSON.stringify({ source: { id: "source", url: "https://example.org", title: { en: "Source" }, accessedAt: "2026-09-09" } })]);
    await db.query("INSERT INTO node_localizations (node_id, locale, title, details_json) VALUES ('worms', 'en', 'WoRMS', $1)", [JSON.stringify({ role: "legacy", disciplineFamily: "reference", profile: { sourceRefs: ["source"] } })]);
    const migration = fs.readFileSync(new URL("../schema/005_disciplines.sql", import.meta.url), "utf8");
    await db.exec(migration);
    const rows = (await db.query<{ id: string; properties_json: Record<string, unknown> }>("SELECT * FROM nodes ORDER BY id")).rows;
    for (const [id, , disciplines] of cases) {
      assert.deepEqual(rows.find(row => row.id === id)?.properties_json, { disciplines, geographicScope: "global", custom: { preserve: true } });
    }
    assert.deepEqual(rows.find(row => row.id === "already-tagged")?.properties_json, { disciplines: ["ecology", "taxonomy"] });
    const localizations = (await db.query<{ details_json: unknown }>("SELECT * FROM node_localizations")).rows;
    assert.deepEqual(localizations[0].details_json, { profile: { sourceRefs: ["source"] } });
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT * FROM nodes ORDER BY id")).rows, rows);
    assert.deepEqual((await db.query("SELECT * FROM node_localizations")).rows, localizations);
  } finally { await db.close(); }
});

test("subtype removal preserves records and relationships and is safe to rerun", async () => {
  const db = new PGlite();
  try {
    await db.exec(fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8"));
    await db.exec(`
      DROP TRIGGER trg_nodes_kind_fields ON nodes;
      DROP TRIGGER trg_localizations_kind_fields ON node_localizations;
      ALTER TABLE nodes ADD COLUMN subtype text;
      INSERT INTO nodes(id,kind,subtype,properties_json) VALUES
        ('institute','organization','research_institute','{}'),
        ('archive','system',NULL,'{}');
      INSERT INTO node_localizations(node_id,locale,title) VALUES ('institute','en','Institute');
      INSERT INTO edges(id,kind,source_node_id,target_node_id,description,sources) VALUES (
        'operator','operates','institute','archive','The institute operates the archive.',
        '{"docs":{"id":"docs","url":"https://example.org/relationship","title":{"en":"Evidence"},"accessedAt":"2026-09-14"}}');
    `);
    const before = await db.query("SELECT to_jsonb(n) - 'subtype' AS node FROM nodes n ORDER BY id");
    const localizations = await db.query("SELECT * FROM node_localizations");
    const edges = await db.query("SELECT * FROM edges");
    const migration = fs.readFileSync(new URL("../schema/010_remove_node_subtype.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT to_jsonb(n) AS node FROM nodes n ORDER BY id")).rows, before.rows);
    assert.deepEqual((await db.query("SELECT * FROM node_localizations")).rows, localizations.rows);
    assert.deepEqual((await db.query("SELECT * FROM edges")).rows, edges.rows);
    await assert.rejects(db.query("SELECT subtype FROM nodes"), /does not exist/);
  } finally { await db.close(); }
});

test("PUT and PATCH reject the retired subtype field, including null", () => {
  for (const subtype of [null, "research_institute"]) {
    const input = { record: { kind: "organization", subtype } };
    assert.throws(() => readRecordAggregateContentInput("institute", input), /subtype/);
    assert.throws(() => readRecordPatchInput("institute", input), /subtype/);
  }
});

test("geographic scope migration preserves other metadata and prose and is safe to rerun", async () => {
  const db = new PGlite();
  try {
    await db.exec(fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8"));
    await db.exec("DROP TRIGGER trg_nodes_record_shape ON nodes; DROP TRIGGER trg_localizations_record_shape ON node_localizations;");
    await db.query("INSERT INTO nodes (id, kind, properties_json) VALUES ('fishbase', 'system', $1)", [JSON.stringify({ geographicScope: "global", disciplines: ["zoology"] })]);
    await db.query("UPDATE nodes SET sources=$1 WHERE id='fishbase'", [JSON.stringify({ source: { id: "source", url: "https://example.org", title: { en: "Source" }, accessedAt: "2026-09-09" } })]);
    await db.query("INSERT INTO node_localizations (node_id, locale, title, description, details_json) VALUES ('fishbase', 'en', 'FishBase', 'Fish information from around the world.', $1)", [JSON.stringify({ geographicScope: "global", profile: { sourceRefs: ["source"] } })]);
    const migration = fs.readFileSync(new URL("../schema/006_remove_geographic_scope.sql", import.meta.url), "utf8");
    await db.exec(migration);
    const nodes = (await db.query<{ properties_json: unknown }>("SELECT * FROM nodes")).rows;
    const localizations = (await db.query<{ details_json: unknown; description: string }>("SELECT * FROM node_localizations")).rows;
    assert.deepEqual(nodes[0].properties_json, { disciplines: ["zoology"] });
    assert.deepEqual(localizations[0].details_json, { profile: { sourceRefs: ["source"] } });
    assert.equal(localizations[0].description, "Fish information from around the world.");
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT * FROM nodes")).rows, nodes);
    assert.deepEqual((await db.query("SELECT * FROM node_localizations")).rows, localizations);
  } finally { await db.close(); }
});

test("source text migration preserves localizations, removes duplicate fields, and rolls back conflicts", async () => {
  const db = new PGlite();
  const migration = fs.readFileSync(new URL("../schema/004_source_text_in_localizations.sql", import.meta.url), "utf8");
  try {
    await db.exec(`
      CREATE TABLE sources(id text PRIMARY KEY,source_type text);
      CREATE TABLE sources_localizations(source_id text,locale text,title text,note text,translated_from_locale text,PRIMARY KEY(source_id,locale));
      CREATE TABLE nodes(id text,kind text,properties_json jsonb DEFAULT '{}');
      CREATE TABLE node_localizations(node_id text,locale text,title text,details_json jsonb DEFAULT '{}',review_json jsonb);
      CREATE TABLE edges(id text,source_node_id text,target_node_id text,kind text,properties_json jsonb DEFAULT '{}');
      CREATE TABLE ryu_routes(id text,node_id text,status text,mode text,properties_json jsonb DEFAULT '{}');
    `);
    await db.exec(`
      ALTER TABLE sources ADD COLUMN title text, ADD COLUMN note text;
      INSERT INTO sources (id, source_type, title, note) VALUES
        ('src-a-new', 'website', 'English source', 'English note'),
        ('src-existing', 'website', 'Existing source', 'Existing note'),
        ('src-french', 'website', 'Source française', 'Note française'),
        ('src-z-conflict', 'website', 'Conflicting title', 'Conflicting note');
      INSERT INTO sources_localizations (source_id, locale, title, note) VALUES
        ('src-existing', 'en', 'Existing source', 'Existing note'),
        ('src-existing', 'fr', 'Source existante', 'Note existante'),
        ('src-french', 'fr', 'Source française', NULL),
        ('src-z-conflict', 'en', 'Preserved title', 'Preserved note');
      INSERT INTO nodes (id, kind) VALUES ('operator', 'organization'), ('system', 'system');
      INSERT INTO node_localizations (node_id, locale, title, review_json)
        VALUES ('system', 'fr', 'Système', '{"history":[{"state":"human_reviewed","reviewer":null,"date":null,"note":null}]}');
      INSERT INTO edges (id, source_node_id, target_node_id, kind)
        VALUES ('edge', 'operator', 'system', 'operates');
      INSERT INTO ryu_routes (id, node_id, status, mode)
        VALUES ('route', 'system', 'planned', 'api');
    `);
    const nested = { gallery: [{ title: "Keep gallery text", source: { id: "src-existing", title: "Old citation label", note: "Old citation note", url: "https://example.org" } }], sourceRefs: ["src-existing"] };
    for (const [table, column] of [["nodes", "properties_json"], ["node_localizations", "details_json"], ["edges", "properties_json"], ["ryu_routes", "properties_json"]]) {
      await db.query(`UPDATE ${table} SET ${column} = $1::jsonb`, [JSON.stringify(nested)]);
    }
    const history = (await db.query("SELECT node_id, locale, review_json FROM node_localizations ORDER BY node_id, locale")).rows;
    const preserved = (await db.query("SELECT * FROM sources_localizations WHERE source_id = 'src-existing' ORDER BY locale")).rows;

    await assert.rejects(db.exec(migration), /conflicting title text/);
    await db.exec("ROLLBACK");
    assert.equal((await db.query("SELECT * FROM sources_localizations WHERE source_id = 'src-a-new'")).rows.length, 0);
    await db.query("UPDATE sources SET title = 'Preserved title' WHERE id = 'src-z-conflict'");
    await assert.rejects(db.exec(migration), /conflicting note text/);
    await db.exec("ROLLBACK");
    await db.query("UPDATE sources SET note = 'Preserved note' WHERE id = 'src-z-conflict'");

    await db.exec(migration);
    const migrated = (await db.query("SELECT * FROM sources_localizations ORDER BY source_id, locale")).rows;
    assert.deepEqual((await db.query("SELECT locale, title, note FROM sources_localizations WHERE source_id = 'src-a-new'")).rows,
      [{ locale: "en", title: "English source", note: "English note" }]);
    assert.deepEqual((await db.query("SELECT locale, title, note FROM sources_localizations WHERE source_id = 'src-french'")).rows,
      [{ locale: "fr", title: "Source française", note: "Note française" }]);
    assert.deepEqual((await db.query("SELECT * FROM sources_localizations WHERE source_id = 'src-existing' ORDER BY locale")).rows, preserved);
    assert.equal((await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sources' AND column_name IN ('title', 'note')")).rows.length, 0);
    const expected = { gallery: [{ title: "Keep gallery text", source: { id: "src-existing", url: "https://example.org" } }], sourceRefs: ["src-existing"] };
    for (const [table, column] of [["nodes", "properties_json"], ["node_localizations", "details_json"], ["edges", "properties_json"], ["ryu_routes", "properties_json"]]) {
      for (const row of (await db.query<Record<string, unknown>>(`SELECT ${column} FROM ${table}`)).rows) assert.deepEqual(row[column], expected);
    }
    assert.deepEqual((await db.query("SELECT node_id, locale, review_json FROM node_localizations ORDER BY node_id, locale")).rows, history);
    assert.deepEqual((await db.query("SELECT review_json #>> '{history,-1,state}' AS review_state FROM node_localizations")).rows, [{ review_state: "human_reviewed" }]);
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT * FROM sources_localizations ORDER BY source_id, locale")).rows, migrated);
  } finally { await db.close(); }
});

test("localization review migration seeds current state, discards the old table, and enforces complete append-only snapshots", async () => {
  const migration = fs.readFileSync(new URL("../schema/008_localization_reviews.sql", import.meta.url), "utf8");
  for (const dateColumn of ["last_reviewed", "review_date"]) {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE TABLE node_localizations (
          node_id text, locale text, title text,
          review_state text, reviewer text, reviewer_note text, ${dateColumn} timestamptz,
          PRIMARY KEY (node_id, locale)
        );
        CREATE TABLE node_review_history (node_id text, history_json jsonb);
        INSERT INTO node_review_history VALUES ('record', '[{"discarded":true}]');
        INSERT INTO node_localizations VALUES
          ('record', 'en', 'Record', 'human_reviewed', 'reviewer@example.org', 'Verified', '2026-09-09T12:00:00Z'),
          ('record', 'fr', 'Fiche', 'agent_researched', NULL, NULL, NULL);
      `);
      await db.exec(migration);
      assert.equal((await db.query<{ name: string | null }>("SELECT to_regclass('node_review_history') AS name")).rows[0].name, null);
      const rows = (await db.query<{ node_id: string; locale: string; title: string; review_json: { history: any[] } }>("SELECT * FROM node_localizations ORDER BY locale")).rows;
      assert.deepEqual(Object.keys(rows[0]).sort(), ["locale", "node_id", "review_json", "title"]);
      const current = rows[0].review_json.history[0];
      assert.deepEqual(current, { state: "human_reviewed", reviewer: "reviewer@example.org", note: "Verified", date: current.date });
      assert.equal(Date.parse(current.date), Date.parse("2026-09-09T12:00:00Z"));
      assert.deepEqual(rows[1].review_json.history, [{ state: "agent_researched", reviewer: null, note: null, date: null }]);
      await db.exec(migration);
      assert.deepEqual((await db.query("SELECT * FROM node_localizations ORDER BY locale")).rows, rows);
      for (const invalid of [null, [], {}, { history: [] }, { history: "bad" },
        { history: [{ ...current, state: "invented" }] },
        { history: [{ state: "human_reviewed" }] },
        { history: [{ ...current, reviewer: 42 }] },
        { history: [{ ...current, note: {} }] },
        { history: [{ ...current, date: "2026-02-30T12:00:00Z" }] },
        { history: [{ ...current, date: "not a date" }] },
        { history: [{ ...current, extra: true }] },
        { history: [current], current },
      ]) {
        await assert.rejects(db.query("INSERT INTO node_localizations (node_id, locale, review_json) VALUES ('invalid', 'en', $1::jsonb)", [JSON.stringify(invalid)]));
      }
      const next = { ...current, state: "needs_revision", reviewer: null, note: "Evidence changed.", date: "2026-09-10T12:00:00Z" };
      for (const history of [[next], [next, current], [current, next, next], [current, { ...next, date: null }]]) {
        await assert.rejects(db.query("UPDATE node_localizations SET review_json = $1 WHERE locale = 'en'", [JSON.stringify({ history })]), /append one dated snapshot/);
      }
      await db.query("UPDATE node_localizations SET review_json = $1 WHERE locale = 'en'", [JSON.stringify({ history: [current, next] })]);
      assert.deepEqual((await db.query<{ review_json: unknown }>("SELECT review_json FROM node_localizations WHERE locale = 'en'")).rows[0].review_json, { history: [current, next] });
      await db.exec(migration);
      assert.deepEqual((await db.query<{ review_json: unknown }>("SELECT review_json FROM node_localizations WHERE locale = 'en'")).rows[0].review_json, { history: [current, next] });
    } finally { await db.close(); }
  }
});

test("rich record transactions use the real PostgreSQL schema", async t => {
  const db = new PGlite();
  // PGlite runs PostgreSQL in process; this adapter supplies the existing pg interface.
  const client = { query: async (sql: string, params: unknown[] = []) => {
    const result = await db.query(sql, params);
    return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
  }, release() {} };
  const repository = new PostgresGraphRepository({ ...client, connect: async () => client } as unknown as Pool);
  const read = () => repository.getRecord("fishbase", readRecordSearchQuery({}));
  const version = async () => buildRecordUpdatedAt(await read());
  try {
    await db.exec(fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8"));
    const endpoints = new Map<string, string>();
    for (const edge of richRecordFixture().edges) {
      if (edge.sourceNodeId !== "fishbase") endpoints.set(edge.sourceNodeId, "organization");
      if (edge.targetNodeId !== "fishbase") endpoints.set(edge.targetNodeId, "system");
    }
    for (const [id, kind] of endpoints) await db.query("INSERT INTO nodes (id, kind) VALUES ($1, $2)", [id, kind]);
    const fixture = readRecordAggregateContentInput("fishbase", richRecordFixture());
    await t.test("dry run does not write and apply round-trips all source localizations", async () => {
      const dry = await repository.upsertRecord("fishbase", fixture, { createOnly: true, validateOnly: true });
      assert.ok("valid" in dry && dry.valid, JSON.stringify(dry));
      assert.equal((await db.query("SELECT * FROM nodes WHERE id = 'fishbase'")).rows.length, 0);
      const applied = await repository.upsertRecord("fishbase", fixture, { createOnly: true });
      assert.ok("node" in applied);
      assert.equal(applied.node.recordDepth, "rich");
      assert.equal("subtype" in applied.node, false);
      assert.equal(applied.node.kind, "system");
      assert.equal(fixture.record.kind, "system");
      assert.deepEqual(applied.node.properties.disciplines, fixture.record.properties?.disciplines);
      assert.equal("role" in applied.node.properties, false);
      assert.equal("disciplineFamily" in applied.node.properties, false);
      assert.equal("geographicScope" in applied.node.properties, false);
      assert.deepEqual(applied.node.sources, fixture.record.sources);
      assert.deepEqual(applied.edges.find(edge => edge.kind === "operates")!.sources, fixture.edges![0].sources);
      const dto = toDefaultRecordDetailDto(applied, "public", [], "fr");
      assert.equal("subtype" in dto, false);
      assert.equal("subtype" in dto.record, false);
      assert.equal(dto.sourceCompleteness?.status, "complete");
      assert.deepEqual(dto.record.sources, fixture.record.sources);
      assert.equal("sources" in dto, false);
    });
    await t.test("invalid vocabulary and retired fields cannot be written by PUT or PATCH even on thin records", async () => {
      const type = richRecordFixture().record.properties.data.descriptors.find((d: any) => d.category === "type");
      const format = richRecordFixture().record.properties.data.descriptors.find((d: any) => d.category === "format");
      for (const method of ["put", "patch"] as const) {
        for (const invalid of [{ disciplines: ["fish_biodiversity"] }, { disciplines: ["ecology", "ecology"] }, { role: "reference_backbone" }, { disciplineFamily: "biodiversity" }, { geographicScope: "global" },
          { metrics: [{ ...richRecordFixture().record.properties.metrics[0], key: "invented_metric" }] },
          { metrics: [{ ...richRecordFixture().record.properties.metrics[0], unit: "visits/month" }] },
          { usage: [] },
          { data: { descriptors: [{ ...type, label: "invented_type" }] } },
          { data: { descriptors: [type, { ...type, id: "duplicate" }] } },
          { data: { descriptors: [{ ...format, label: "invented_format" }] } },
          { data: { descriptors: [format, { ...format, id: "duplicate" }] } },
        ]) {
          const before = await read();
          const properties = { ...before.node.properties, ...invalid };
          const put = readRecordAggregateContentInput("fishbase", { record: { kind: "system", recordDepth: "thin", properties } });
          const patch = readRecordPatchInput("fishbase", { record: { recordDepth: "thin", propertiesReplace: properties } });
          for (const validateOnly of [true, false]) {
            const options = { recordUpdatedAt: await version(), validateOnly };
            const result = method === "put"
              ? await repository.upsertRecord("fishbase", put, options)
              : await repository.patchRecord("fishbase", patch, options);
            assert.ok("valid" in result && !result.valid, JSON.stringify(result));
            assert.deepEqual((await read()).node, before.node);
          }
        }
        for (const descriptor of [type, format]) {
          const before = await read();
          const details = structuredClone(before.node.localizations.en!.details);
          // @ts-expect-error Deliberately invalid input must be rejected at runtime.
          details.data.descriptors.find(d => d.id === descriptor.id)!.label = "Invented label";
          for (const validateOnly of [true, false]) {
            const options = { recordUpdatedAt: await version(), validateOnly };
            const result = method === "put"
              ? await repository.upsertRecord("fishbase", readRecordAggregateContentInput("fishbase", { record: { kind: "system", recordDepth: "thin", properties: before.node.properties }, localizations: { en: { title: "FishBase", details } } }), options)
              : await repository.patchRecord("fishbase", readRecordPatchInput("fishbase", { record: { recordDepth: "thin" }, localizations: { en: { mode: "patch", detailsReplace: details } } }), options);
            assert.ok("valid" in result && !result.valid, JSON.stringify(result));
            assert.deepEqual((await read()).node, before.node);
          }
        }
      }
    });
    await t.test("ranked pagination returns all matching IDs and traverses equal titles and lower-score matches", async () => {
      await db.query("BEGIN");
      try {
        await db.exec(`
          INSERT INTO nodes (id, kind) SELECT 'page-probe-' || n, 'system' FROM generate_series(1, 205) n;
          INSERT INTO node_localizations (node_id, locale, title, details_json)
            SELECT 'page-probe-' || n, 'en', CASE WHEN n < 205 THEN 'Shelfmarker' ELSE 'Zebra' END,
              CASE WHEN n < 205 THEN '{}'::jsonb ELSE '{"aliases":["Shelfmarker"]}'::jsonb END
            FROM generate_series(1, 205) n;
        `);
        const first = await repository.listRecords(readRecordSearchQuery({ q: "Shelfmarker", locale: "fr", include: "matchingIds,matchReasons", limit: "100" }));
        assert.equal(first.total, 205);
        assert.equal(first.records.length, 100);
        assert.equal(first.matchingIds?.length, 205);
        assert.equal(new Set(first.matchingIds).size, 205);
        assert.ok(first.nextCursor);
        assert.equal(first.records[0].matchReasons[0].field, "name");
        const ids = first.records.map(record => record.node.id);
        let cursor: string | null = first.nextCursor;
        while (cursor) {
          const page = await repository.listRecords(readRecordSearchQuery({ q: "Shelfmarker", locale: "fr", cursor, limit: "100" }));
          assert.equal(page.total, 205);
          assert.equal(page.matchingIds, undefined);
          ids.push(...page.records.map(record => record.node.id));
          cursor = page.nextCursor;
        }
        assert.deepEqual(ids, first.matchingIds);
        assert.equal(ids.at(-1), "page-probe-205");
        const filtered = await repository.listRecords(readRecordSearchQuery({ q: "Shelfmarker", kind: "country", include: "matchingIds" }));
        assert.deepEqual(filtered, { records: [], total: 0, matchingIds: [], nextCursor: null });
      } finally { await db.query("ROLLBACK"); }
    });
    await t.test("PATCH cannot remove rich content; dry run and apply report identical issues", async () => {
      const recordUpdatedAt = await version();
      const patch = readRecordPatchInput("fishbase", { localizations: { en: { mode: "patch", summary: null } } });
      const dry = await repository.patchRecord("fishbase", patch, { recordUpdatedAt, validateOnly: true });
      const applied = await repository.patchRecord("fishbase", patch, { recordUpdatedAt });
      assert.ok("valid" in dry && !dry.valid);
      assert.deepEqual(applied, dry);
      assert.equal(await version(), recordUpdatedAt);
      assert.ok((await read()).node.localizations.en?.summary);
    });
    await t.test("PUT preserves omitted locales and sources while validating the resulting record", async () => {
      assert.equal(fixture.record.kind, "system");
      const { sources: _sources, ...record } = fixture.record;
      const applied = await repository.upsertRecord("fishbase", { record }, { recordUpdatedAt: await version() });
      assert.ok("node" in applied, JSON.stringify(applied));
      assert.equal(applied.node.availableLocales.length, 6);
      assert.equal(Object.keys(applied.node.sources).length, Object.keys(fixture.record.sources!).length);
    });
    await t.test("note-only reviews are rejected without changing a human-reviewed record", async () => {
      await repository.updateNodeLocalizationReview("fishbase", "fr", { reviewState: "human_reviewed", reviewerNote: "Original approval." }, "reviewer@example.org", { recordUpdatedAt: await version() });
      const before = await read();
      for (const validateOnly of [true, false]) {
        await assert.rejects(repository.updateNodeLocalizationReview("fishbase", "fr",
          // @ts-expect-error Reviews require an explicit state, including for callers outside TypeScript.
          { reviewerNote: "New note." }, "second@example.org", { recordUpdatedAt: await version(), validateOnly }), /invalid reviewState/);
        assert.deepEqual(await read(), before);
      }
    });
    await t.test("explicit reviews append a full snapshot without changing content or sibling reviews", async () => {
      const before = (await read()).node;
      const updated = await repository.updateNodeLocalizationReview("fishbase", "fr", { reviewState: "needs_revision", reviewerNote: "A new review note." }, "second@example.org", { recordUpdatedAt: await version() });
      const previous = before.localizations.fr!;
      const current = updated.localizations.fr!;
      assert.equal(current.contentUpdatedAt, previous.contentUpdatedAt);
      assert.deepEqual(updated.localizations.en, before.localizations.en);
      assert.deepEqual(current.review.history!.slice(0, -1), previous.review.history);
      const { history, ...snapshot } = current.review;
      assert.deepEqual(snapshot, history!.at(-1));
      assert.equal(snapshot.state, "needs_revision");
      assert.equal(snapshot.note, "A new review note.");
      assert.equal(snapshot.reviewer, "second@example.org");
      assert.ok(Number.isFinite(Date.parse(snapshot.date!)));
    });
    await t.test("substantive edits invalidate human review and unchanged edits preserve it", async () => {
      const reviewed = await repository.updateNodeLocalizationReview("fishbase", "fr", { reviewState: "human_reviewed" }, "reviewer@example.org", { recordUpdatedAt: await version() });
      assert.equal(reviewed.localizations.fr!.review.note, null);
      assert.ok(Number.isFinite(Date.parse(reviewed.localizations.fr!.review.date!)));
      const summary = (await read()).node.localizations.fr!.summary!;
      await repository.patchRecord("fishbase", { localizations: { fr: { mode: "patch", summary } } }, { recordUpdatedAt: await version() });
      assert.deepEqual((await read()).node.localizations.fr?.review, reviewed.localizations.fr!.review);
      await repository.patchRecord("fishbase", { localizations: { fr: { mode: "patch", summary: `${summary} Révision.` } } }, { recordUpdatedAt: await version() });
      assert.equal((await read()).node.localizations.fr?.review.state, "needs_revision");
      assert.notEqual((await read()).node.localizations.fr?.review.date, reviewed.localizations.fr!.review.date);
      const history = (await read()).node.localizations.fr!.review.history!;
      assert.equal(history.at(-2)!.state, "human_reviewed");
      assert.equal(history.at(-1)!.state, "needs_revision");
      assert.equal(history.at(-1)!.reviewer, null);
      assert.equal(history.at(-1)!.note, "Content or cited evidence changed; review is required.");
    });
    await t.test("operator-side relationship deletion cannot leave a rich system without an operator", async () => {
      const operator = await repository.getRecord("q-quatics", readRecordSearchQuery({}));
      const rejected = await repository.patchRecord("q-quatics", { edges: { delete: [fixture.edges![0].id] } }, { recordUpdatedAt: buildRecordUpdatedAt(operator) });
      assert.ok("valid" in rejected && !rejected.valid);
      assert.ok(rejected.issues.some(issue => issue.recordId === "fishbase" && issue.path === "edges"));
      assert.equal((await read()).edges.length, fixture.edges!.length);
    });
    await t.test("an incomplete record can be saved as thin but cannot be promoted with a bare PATCH", async () => {
      await repository.patchRecord("fishbase", { record: { recordDepth: "thin" }, localizations: { en: { mode: "patch", summary: null } } }, { recordUpdatedAt: await version() });
      const promotion = await repository.patchRecord("fishbase", { record: { recordDepth: "rich" } }, { recordUpdatedAt: await version() });
      assert.ok("valid" in promotion && !promotion.valid);
      assert.equal((await read()).node.recordDepth, "thin");
    });
  } finally { await db.close(); }
});
