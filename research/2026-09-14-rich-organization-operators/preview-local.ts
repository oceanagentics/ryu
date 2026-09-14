import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";

import { supportedLocales } from "../../shared/localization";
import type { GraphBootstrapPayload, SourceCollection } from "../../shared/domain";
import type { RecordAggregateContentInput, RecordValidationResult } from "../../shared/recordApi";
import { PostgresGraphRepository } from "../../server/src/postgresGraphRepository";
import {
  buildRecordUpdatedAt,
  recordContent,
  readRecordAggregateContentInput,
  readRecordSearchQuery,
  validateRecordQuality,
} from "../../server/src/recordContracts";
import { start } from "../../server/src/server";

const root = process.cwd();
const directory = path.join(root, "research/2026-09-14-rich-organization-operators");
const sourceGraph = JSON.parse(
  fs.readFileSync("/tmp/ryu-production-bootstrap.json", "utf8"),
) as GraphBootstrapPayload;
const batch = JSON.parse(
  fs.readFileSync(path.join(directory, "batch.json"), "utf8"),
) as RecordAggregateContentInput[];

function completeSourceTitles(sources: SourceCollection): SourceCollection {
  return Object.fromEntries(Object.entries(sources).map(([id, source]) => {
    const fallback = source.title.en ?? Object.values(source.title)[0] ?? id;
    return [id, {
      ...source,
      title: Object.fromEntries(supportedLocales.map((locale) => [locale, source.title[locale] ?? fallback])),
    }];
  }));
}

async function main() {
const database = new PGlite();
await database.exec(fs.readFileSync(path.join(root, "server/schema/001_create_explorer_schema.sql"), "utf8"));

for (const node of sourceGraph.nodes) {
  const isSystem = node.kind === "system";
  await database.query(
    `INSERT INTO nodes (id, kind, country_code, url, record_depth, properties_json, sources)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [
      node.id,
      node.kind,
      node.kind === "country" ? node.countryCode : null,
      node.url,
      isSystem ? node.recordDepth : "stub",
      JSON.stringify(isSystem ? node.properties : {}),
      JSON.stringify(completeSourceTitles(node.sources ?? {})),
    ],
  );

  for (const [locale, localization] of Object.entries(node.localizations)) {
    if (!localization) continue;
    await database.query(
      `INSERT INTO node_localizations (
        node_id, locale, title, summary, description, details_json, translated_from_locale, review_json
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb)`,
      [
        node.id,
        locale,
        localization.title,
        localization.summary,
        localization.description,
        JSON.stringify(isSystem ? localization.details : {}),
        localization.translatedFromLocale,
        JSON.stringify({
          history: [{ state: "agent_researched", reviewer: null, date: localization.review.date, note: null }],
        }),
      ],
    );
  }
}

for (const edge of sourceGraph.edges) {
  await database.query(
    `INSERT INTO edges (
      id, source_node_id, target_node_id, kind, note, properties_json, sources
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [
      edge.id,
      edge.sourceNodeId,
      edge.targetNodeId,
      edge.kind,
      edge.note,
      JSON.stringify(edge.properties ?? {}),
      JSON.stringify(completeSourceTitles(edge.sources ?? {})),
    ],
  );
}

const client = {
  query: async (sql: string, parameters: unknown[] = []) => {
    const result = await database.query(sql, parameters);
    return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
  },
  release() {},
};
const repository = new PostgresGraphRepository({
  ...client,
  connect: async () => client,
  end: async () => database.close(),
} as unknown as Pool);
const query = readRecordSearchQuery({
  locale: "en",
  include: "localizations,edges,routes,sources",
});
const report: Array<{ id: string; valid: boolean; issues: number; sourceStatus: string }> = [];

for (const raw of batch) {
  const input = readRecordAggregateContentInput(raw.id, raw);
  const version = buildRecordUpdatedAt(await repository.getRecord(raw.id, query));
  const dryRun = await repository.upsertRecord(raw.id, input, {
    recordUpdatedAt: version,
    validateOnly: true,
  }) as RecordValidationResult;
  if (!dryRun.valid) throw new Error(`${raw.id}: ${JSON.stringify(dryRun.issues)}`);
  await repository.upsertRecord(raw.id, input, { recordUpdatedAt: version });
  const stored = await repository.getRecord(raw.id, query);
  const verified = validateRecordQuality(raw.id, recordContent(stored));
  report.push({
    id: raw.id,
    valid: verified.valid,
    issues: verified.issues.length,
    sourceStatus: verified.sourceCompleteness.status,
  });
}

fs.writeFileSync(
  path.join(directory, "validation-postgres.json"),
  `${JSON.stringify({ records: report, valid: report.every((item) => item.valid) }, null, 2)}\n`,
);

start({
  repository,
  mode: "local",
  host: "127.0.0.1",
  port: 8790,
  staticDirectory: path.join(root, "client/dist"),
});

console.log(`Loaded ${report.length} rich operator organizations through Postgres; validation passed.`);
}

void main();
