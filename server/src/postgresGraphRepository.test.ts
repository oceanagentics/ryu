import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

import type { Pool } from "pg";

import type { RecordAggregateContentInput, RecordSourceInput } from "../../shared/recordApi";
import { PostgresGraphRepository } from "./postgresGraphRepository";
import { buildRecordUpdatedAt, readRecordAggregateContentInput, readRecordPatchInput, readRecordSearchQuery, toDefaultRecordDetailDto, validateRecordQuality } from "./recordContracts";
import { collectSourceIds } from "./graphRepositorySupport";
import { resolveSourceLocalization } from "../../shared/localization";

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

test("upserts only explicitly supplied source localization rows", async () => {
  const client = new FakePoolClient();
  const repository = new PostgresGraphRepository({} as Pool);
  const source: RecordSourceInput = structuredClone(richRecordFixture().sources.upsert[0]);
  const english = source.localizations?.en;
  assert.ok(english);
  source.localizations = { en: english };
  await (repository as unknown as {
    upsertSources(client: unknown, sources: RecordSourceInput[]): Promise<void>;
  }).upsertSources(client, [source]);
  const writes = client.queries.filter(query => query.sql.includes("INSERT INTO sources_localizations"));
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].params, [source.id, "en", english.title, english.note, english.translatedFromLocale]);
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
    ["record.properties.data.recordCount.source", input => { delete input.record.properties.data.recordCount.source; }],
    ["record.properties.data.recordCount.observedAt", input => { input.record.properties.data.recordCount.observedAt = "2026-02-31"; }],
    ["localizations.es.details.access", input => { input.localizations.es.details.access[0].id = "different"; }],
    ["sources.src-fishbase-home", input => { input.sources.upsert = input.sources.upsert.filter((s: RecordSourceInput) => s.id !== "src-fishbase-home"); }],
    ["sources.src-fishbase-home.localizations.ar.title", input => { delete input.sources.upsert[0].localizations.ar; }],
    ["sources.src-fishbase-home.localizations.ar.note", input => { input.sources.upsert[0].localizations.ar.note = null; }],
    ["edges", input => { input.edges = []; }],
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
  const gaps = richRecordFixture();
  gaps.record.properties.data.recordCount = null;
  gaps.record.properties.data.storageSize = null;
  gaps.record.properties.usage = [];
  gaps.record.properties.gallery = [];
  for (const l of Object.values(gaps.localizations) as any[]) {
    l.details.data.recordCount = null;
    l.details.data.storageSize = null;
    l.details.usage = [];
    l.details.gallery = [];
    l.details.researchGaps = { recordCount: "Not published", storageSize: "Not published", usage: "Not published" };
  }
  const result = validateRecordQuality(gaps.id, gaps);
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.ok(result.warnings?.length);
  assert.throws(() => readRecordAggregateContentInput(fixture.id, { ...fixture, incomplete: true }), /incomplete records/);
  for (const field of ["title", "note"]) {
    const reference = { id: "src-fishbase-home", url: "https://www.fishbase.se", [field]: "Duplicate source text" };
    for (const input of [
      { record: { propertiesReplace: { access: [{ source: reference }] } } },
      { localizations: { fr: { mode: "patch", detailsReplace: { evidence: { source: reference } } } } },
      { edges: { upsert: [{ ...fixture.edges[0], properties: { source: reference } }] } },
      { routes: { upsert: [{ id: "route", status: "planned", mode: "api", properties: { source: reference } }] } },
    ]) assert.throws(() => readRecordPatchInput(fixture.id, input), /source title\/note belong in/);
  }
  assert.deepEqual([...collectSourceIds({ source: { id: "official-homepage" } })], ["official-homepage"]);
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

test("source text migration preserves localizations, removes duplicate fields, and rolls back conflicts", async () => {
  const db = new PGlite();
  const migration = fs.readFileSync(new URL("../schema/004_source_text_in_localizations.sql", import.meta.url), "utf8");
  try {
    await db.exec(fs.readFileSync(new URL("../schema/001_create_explorer_schema.sql", import.meta.url), "utf8"));
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
      INSERT INTO node_localizations (node_id, locale, title, review_state)
        VALUES ('system', 'fr', 'Système', 'human_reviewed');
      INSERT INTO edges (id, source_node_id, target_node_id, kind)
        VALUES ('edge', 'operator', 'system', 'operates');
      INSERT INTO ryu_routes (id, node_id, status, mode)
        VALUES ('route', 'system', 'planned', 'api');
    `);
    const nested = { gallery: [{ title: "Keep gallery text", source: { id: "src-existing", title: "Old citation label", note: "Old citation note", url: "https://example.org" } }], sourceRefs: ["src-existing"] };
    for (const [table, column] of [["nodes", "properties_json"], ["node_localizations", "details_json"], ["edges", "properties_json"], ["ryu_routes", "properties_json"]]) {
      await db.query(`UPDATE ${table} SET ${column} = $1::jsonb`, [JSON.stringify(nested)]);
    }
    const history = (await db.query("SELECT * FROM node_review_history ORDER BY node_id")).rows;
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
    assert.deepEqual((await db.query("SELECT * FROM node_review_history ORDER BY node_id")).rows, history);
    assert.deepEqual((await db.query("SELECT review_state FROM node_localizations")).rows, [{ review_state: "human_reviewed" }]);
    await db.exec(migration);
    assert.deepEqual((await db.query("SELECT * FROM sources_localizations ORDER BY source_id, locale")).rows, migrated);
  } finally { await db.close(); }
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
    await db.query("INSERT INTO nodes (id, kind) VALUES ('q-quatics', 'organization')");
    const fixture = readRecordAggregateContentInput("fishbase", richRecordFixture());
    await t.test("dry run does not write and apply round-trips all source localizations", async () => {
      const dry = await repository.upsertRecord("fishbase", fixture, { createOnly: true, validateOnly: true });
      assert.ok("valid" in dry && dry.valid, JSON.stringify(dry));
      assert.equal((await db.query("SELECT * FROM sources")).rows.length, 0);
      const applied = await repository.upsertRecord("fishbase", fixture, { createOnly: true });
      assert.ok("node" in applied);
      assert.equal(applied.node.recordDepth, "rich");
      assert.equal(applied.sources.length, 6);
      assert.equal(Object.keys(applied.sources[0].localizations ?? {}).length, 6);
      assert.deepEqual(Object.fromEntries(Object.entries(applied.sources[0].localizations ?? {}).map(([locale, l]) => [locale, l?.title])),
        Object.fromEntries(Object.entries(fixture.sources!.upsert!.find(s => s.id === applied.sources[0].id)!.localizations!).map(([locale, l]) => [locale, l?.title])));
      const dto = toDefaultRecordDetailDto(applied, "public", [], "fr");
      assert.equal(dto.sourceCompleteness?.status, "complete");
      assert.equal("localPath" in dto.sources![0], false);
      assert.equal("title" in dto.sources![0], false);
      assert.equal("note" in dto.sources![0], false);
      assert.equal("reviewer" in dto.sources![0].localizations!.fr!, false);
    });
    await t.test("source review migration preserves translations and record review history on rerun", async () => {
      const sources = await db.query<Record<string, unknown>>("SELECT * FROM sources_localizations ORDER BY source_id, locale");
      assert.equal("review_state" in sources.rows[0], false);
      await repository.updateNodeLocalizationReview("fishbase", "fr", { reviewState: "human_reviewed", reviewerNote: "Reviewed with citations." }, "reviewer@example.org", { recordUpdatedAt: await version() });
      const localizations = await db.query("SELECT * FROM node_localizations ORDER BY node_id, locale");
      const history = await db.query("SELECT * FROM node_review_history ORDER BY node_id");
      await db.exec(`
        ALTER TABLE sources_localizations
          ADD COLUMN review_state text NOT NULL DEFAULT 'human_reviewed',
          ADD COLUMN reviewer_note text,
          ADD COLUMN reviewer text,
          ADD COLUMN last_reviewed timestamptz;
        CREATE INDEX idx_sources_localizations_review_state ON sources_localizations(review_state);
        CREATE INDEX idx_sources_localizations_locale_review_state ON sources_localizations(locale, review_state);
      `);
      const migration = fs.readFileSync(new URL("../schema/003_drop_source_localization_review.sql", import.meta.url), "utf8");
      await db.exec(migration);
      await db.exec(migration);
      assert.deepEqual((await db.query("SELECT * FROM sources_localizations ORDER BY source_id, locale")).rows, sources.rows);
      assert.deepEqual((await db.query("SELECT * FROM node_localizations ORDER BY node_id, locale")).rows, localizations.rows);
      assert.deepEqual((await db.query("SELECT * FROM node_review_history ORDER BY node_id")).rows, history.rows);
      assert.equal((await db.query("SELECT indexname FROM pg_indexes WHERE tablename = 'sources_localizations' AND indexname LIKE '%review_state%'")).rows.length, 0);
    });
    await t.test("source text search resolves source languages independently of node languages", async () => {
      await db.query("BEGIN");
      try {
        const source = { id: "src-search-probe", url: "https://example.org/source" };
        const properties = { access: [{ id: "read", type: "read", method: "download", url: source.url, source }] };
        await db.query("INSERT INTO nodes (id, kind, properties_json) VALUES ($1, $2, $3::jsonb)", ["search-probe", "system", JSON.stringify(properties)]);
        await db.query("INSERT INTO node_localizations (node_id, locale, title) VALUES ($1, $2, $3)", ["search-probe", "en", "English record"]);
        await db.query("INSERT INTO sources (id, source_type, url) VALUES ($1, $2, $3)", [source.id, "website", source.url]);
        for (const [locale, title, note] of [["en", "EnglishTitleMarker", "EnglishNoteMarker"], ["fr", "FrenchTitleMarker", "FrenchNoteMarker"]]) {
          await db.query("INSERT INTO sources_localizations (source_id, locale, title, note) VALUES ($1, $2, $3, $4)", [source.id, locale, title, note]);
        }
        await db.query("INSERT INTO sources (id, source_type) VALUES ($1, $2)", ["src-unlinked", "website"]);
        await db.query("INSERT INTO sources_localizations (source_id, locale, title) VALUES ($1, $2, $3)", ["src-unlinked", "fr", "UnlinkedTranslationMarker"]);
        for (const [locale, q, allLanguages, expected] of [
          ["fr", "FrenchTitleMarker", false, true],
          ["fr", "FrenchNoteMarker", false, true],
          ["fr", "EnglishTitleMarker", false, false],
          ["fr", "EnglishNoteMarker", false, false],
          ["ru", "EnglishTitleMarker", false, true],
          ["ru", "EnglishNoteMarker", false, true],
          ["ru", "FrenchNoteMarker", true, true],
          ["fr", "UnlinkedTranslationMarker", true, false],
        ] as const) {
          const query = readRecordSearchQuery({ locale, q, localeMode: allLanguages ? "all_locales" : "display_locale" });
          const results = await repository.listRecords(query);
          assert.deepEqual(results.records.map(record => record.node.id), expected ? ["search-probe"] : [], JSON.stringify(query));
          const record = await repository.getRecord("search-probe", query);
          const display = resolveSourceLocalization(record.sources[0], locale);
          assert.equal(display?.title, locale === "fr" ? "FrenchTitleMarker" : "EnglishTitleMarker");
        }
        await db.query("DELETE FROM sources_localizations WHERE source_id = $1 AND locale = $2", [source.id, "fr"]);
        const fallback = await repository.listRecords(readRecordSearchQuery({ locale: "fr", q: "EnglishNoteMarker" }));
        assert.deepEqual(fallback.records.map(record => record.node.id), ["search-probe"]);
        const strict = await repository.listRecords(readRecordSearchQuery({ locale: "fr", localeMode: "locale_only", q: "EnglishNoteMarker" }));
        assert.deepEqual(strict.records, []);
        assert.equal(resolveSourceLocalization(await repository.getSource(source.id), "fr")?.note, "EnglishNoteMarker");
        for (const props of [{ sourceRefs: [source.id] }, { evidence: { source } }, { evidence: source }]) {
          await db.query("UPDATE nodes SET properties_json = $2::jsonb WHERE id = $1", ["search-probe", JSON.stringify(props)]);
          const results = await repository.listRecords(readRecordSearchQuery({ locale: "fr", q: "EnglishNoteMarker" }));
          assert.deepEqual(results.records.map(record => record.node.id), ["search-probe"]);
        }
        await db.query("UPDATE nodes SET properties_json = '{}'::jsonb WHERE id = $1", ["search-probe"]);
        await db.query("UPDATE node_localizations SET details_json = $2::jsonb WHERE node_id = $1", ["search-probe", JSON.stringify({ profile: { sourceRefs: [source.id] } })]);
        const record = await repository.getRecord("search-probe", readRecordSearchQuery({ locale: "fr" }));
        await db.query("DELETE FROM sources_localizations WHERE source_id = $1", [source.id]);
        const missing = await repository.getRecord("search-probe", readRecordSearchQuery({}));
        assert.equal(resolveSourceLocalization(missing.sources[0], "fr"), undefined);
        assert.deepEqual((await repository.listRecords(readRecordSearchQuery({ locale: "fr", q: "EnglishNoteMarker" }))).records, []);
      } finally { await db.query("ROLLBACK"); }
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
      const applied = await repository.upsertRecord("fishbase", { record: fixture.record }, { recordUpdatedAt: await version() });
      assert.ok("node" in applied, JSON.stringify(applied));
      assert.equal(applied.node.availableLocales.length, 6);
      assert.equal(applied.sources.length, 6);
    });
    await t.test("substantive edits invalidate human review and unchanged edits preserve it", async () => {
      await repository.updateNodeLocalizationReview("fishbase", "fr", { reviewState: "human_reviewed" }, "reviewer@example.org", { recordUpdatedAt: await version() });
      const summary = (await read()).node.localizations.fr!.summary!;
      await repository.patchRecord("fishbase", { localizations: { fr: { mode: "patch", summary } } }, { recordUpdatedAt: await version() });
      assert.equal((await read()).node.localizations.fr?.reviewState, "human_reviewed");
      await repository.patchRecord("fishbase", { localizations: { fr: { mode: "patch", summary: `${summary} Révision.` } } }, { recordUpdatedAt: await version() });
      assert.equal((await read()).node.localizations.fr?.reviewState, "needs_revision");
      const history = await db.query<{ history_json: any[] }>("SELECT history_json FROM node_review_history WHERE node_id = 'fishbase'");
      assert.equal(history.rows[0].history_json.at(-1).to, "needs_revision");
    });
    await t.test("shared source edits invalidate all affected records and advance their versions", async () => {
      await db.query("INSERT INTO nodes (id, kind, properties_json) VALUES ('related', 'organization', $1::jsonb)", [JSON.stringify({ sourceRefs: ["src-fishbase-home"] })]);
      await db.query("INSERT INTO node_localizations (node_id, locale, title, review_state) VALUES ('related', 'en', 'Related', 'human_reviewed')");
      await repository.updateNodeLocalizationReview("fishbase", "en", { reviewState: "human_reviewed" }, "reviewer@example.org", { recordUpdatedAt: await version() });
      const oldVersion = await version();
      const source = structuredClone(fixture.sources!.upsert!.find(s => s.id === "src-fishbase-home")!);
      source.accessedAt = "2026-09-07";
      const applied = await repository.patchRecord("fishbase", { sources: { upsert: [source] } }, { recordUpdatedAt: oldVersion });
      assert.ok("node" in applied, JSON.stringify(applied));
      assert.equal(applied.node.localizations.en?.reviewState, "needs_revision");
      const related = await repository.getRecord("related", readRecordSearchQuery({}));
      assert.equal(related.node.localizations.en?.reviewState, "needs_revision");
      assert.notEqual(await version(), oldVersion);
      await assert.rejects(repository.patchRecord("fishbase", { record: { recordDepth: "thin" } }, { recordUpdatedAt: oldVersion }), /stale recordUpdatedAt/);
    });
    await t.test("source translation edits use record review state and retain the previous review", async () => {
      await repository.updateNodeLocalizationReview("fishbase", "fr", { reviewState: "human_reviewed", reviewerNote: "Reviewed with citations." }, "reviewer@example.org", { recordUpdatedAt: await version() });
      const source = structuredClone(fixture.sources!.upsert!.find(s => s.id === "src-fishbase-home")!);
      source.accessedAt = (await repository.getSource(source.id)).accessedAt;
      source.localizations = { fr: { ...source.localizations!.fr!, note: `${source.localizations!.fr!.note} Note révisée.` } };
      const applied = await repository.patchRecord("fishbase", { sources: { upsert: [source] } }, { recordUpdatedAt: await version() });
      assert.ok("node" in applied, JSON.stringify(applied));
      assert.equal(applied.node.localizations.fr?.reviewState, "needs_revision");
      assert.equal(applied.sources.find(s => s.id === source.id)?.localizations?.fr?.note, source.localizations.fr!.note);
      const history = await db.query<{ history_json: any[] }>("SELECT history_json FROM node_review_history WHERE node_id = 'fishbase'");
      const frenchHistory = history.rows[0].history_json.filter(event => event.locale === "fr");
      assert.equal(frenchHistory.at(-2).to, "human_reviewed");
      assert.equal(frenchHistory.at(-2).note, "Reviewed with citations.");
      assert.equal(frenchHistory.at(-1).to, "needs_revision");
    });
    await t.test("stored missing source translations are not filled by fallback", async () => {
      await db.query("DELETE FROM sources_localizations WHERE source_id = 'src-fishbase-home' AND locale = 'ar'");
      const stored = await read();
      const dto = toDefaultRecordDetailDto(stored, "public", [], "ar");
      assert.equal(dto.sourceCompleteness?.status, "partial");
      const rejected = await repository.patchRecord("fishbase", { record: { recordDepth: "rich" } }, { recordUpdatedAt: await version(), validateOnly: true });
      assert.ok("valid" in rejected && !rejected.valid);
      assert.ok(rejected.issues.some(issue => issue.path === "sources.src-fishbase-home.localizations.ar.title"));
      const source = fixture.sources!.upsert!.find(s => s.id === "src-fishbase-home")!;
      const repaired = await repository.patchRecord("fishbase", { sources: { upsert: [source] } }, { recordUpdatedAt: await version() });
      assert.ok("node" in repaired, JSON.stringify(repaired));
    });
    await t.test("a thin record cannot change shared evidence to break a rich record", async () => {
      const related = await repository.getRecord("related", readRecordSearchQuery({}));
      const source = structuredClone(fixture.sources!.upsert!.find(s => s.id === "src-fishbase-home")!);
      source.url = "https://example.org/replaced-source";
      const oldVersion = await version();
      const rejected = await repository.patchRecord("related", { sources: { upsert: [source] } }, { recordUpdatedAt: buildRecordUpdatedAt(related) });
      assert.ok("valid" in rejected && !rejected.valid);
      assert.ok(rejected.issues.some(issue => issue.recordId === "fishbase"));
      assert.equal(await version(), oldVersion);
      assert.equal((await repository.getSource(source.id)).url, fixture.sources!.upsert!.find(s => s.id === source.id)!.url);
    });
    await t.test("operator-side relationship deletion cannot leave a rich system without an operator", async () => {
      const operator = await repository.getRecord("q-quatics", readRecordSearchQuery({}));
      const rejected = await repository.patchRecord("q-quatics", { edges: { delete: [fixture.edges![0].id] } }, { recordUpdatedAt: buildRecordUpdatedAt(operator) });
      assert.ok("valid" in rejected && !rejected.valid);
      assert.ok(rejected.issues.some(issue => issue.recordId === "fishbase" && issue.path === "edges"));
      assert.equal((await read()).edges.length, 1);
    });
    await t.test("an incomplete record can be saved as thin but cannot be promoted with a bare PATCH", async () => {
      await repository.patchRecord("fishbase", { record: { recordDepth: "thin" }, localizations: { en: { mode: "patch", summary: null } } }, { recordUpdatedAt: await version() });
      const promotion = await repository.patchRecord("fishbase", { record: { recordDepth: "rich" } }, { recordUpdatedAt: await version() });
      assert.ok("valid" in promotion && !promotion.valid);
      assert.equal((await read()).node.recordDepth, "thin");
    });
  } finally { await db.close(); }
});
