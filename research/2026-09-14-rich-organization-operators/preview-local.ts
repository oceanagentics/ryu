import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";

import { supportedLocales } from "../../shared/localization";
import type {
  GraphBootstrapPayload,
  GraphEdge,
  GraphEdgeKind,
  SourceCollection,
} from "../../shared/domain";
import type {
  RecordAggregateContentInput,
  RecordEdgeInput,
  RecordValidationResult,
} from "../../shared/recordApi";
import { PostgresGraphRepository } from "../../server/src/postgresGraphRepository";
import {
  buildRecordUpdatedAt,
  recordContent,
  readRecordAggregateContentInput,
  readRecordSearchQuery,
  validateRecordQuality,
} from "../../server/src/recordContracts";
import { toPublicBootstrap } from "../../server/src/server";

type LegacyEdge = Omit<GraphEdge, "kind" | "description"> & {
  kind: GraphEdgeKind | "member_of" | "publishes_to" | "syncs_to";
  description?: string | null;
  note?: string | null;
  properties?: Record<string, unknown>;
};

type LegacyBootstrap = Omit<GraphBootstrapPayload, "edges"> & {
  edges: LegacyEdge[];
};

type LegacyRecordInput = {
  id: string;
  record: RecordAggregateContentInput["record"];
  localizations?: RecordAggregateContentInput["localizations"];
  edges?: LegacyEdge[];
  routes?: unknown[];
};

const root = process.cwd();
const directory = path.join(root, "research/2026-09-14-rich-organization-operators");
const output = path.join(root, "client/public/bootstrap.preview.json");
const bootstrapUrl = process.env.RYU_PREVIEW_BOOTSTRAP_URL
  ?? "https://chm.oceanagentics.org/explorer/api/graph/bootstrap";
const countryIds = ["can", "deu", "jpn", "usa"];
const edgeKinds = new Set<GraphEdgeKind>([
  "governs", "operates", "funds", "member", "contributes", "transfers",
]);
const edgePropertySentences = [
  ["scope", "The documented scope is "],
  ["status", "The documented status is "],
  ["period", "The documented period is "],
  ["transferMethod", "The documented transfer method is "],
  ["updateFrequency", "The documented update frequency is "],
  ["cadence", "The documented cadence is "],
  ["intermediary", "The relationship is mediated by "],
  ["via", "The relationship passes through "],
  ["format", "The documented format is "],
  ["artifact", "The documented artifact is "],
  ["award", "The documented award is "],
  ["membershipStatus", "The documented membership status is "],
  ["latestPublishedAt", "The latest documented publication date is "],
  ["latestSyncedAt", "The latest documented transfer date is "],
  ["sourceIndexReportedAt", "The source index reported the relationship at "],
] as const;

function completeSourceTitles(sources: SourceCollection): SourceCollection {
  return Object.fromEntries(Object.entries(sources).map(([id, source]) => {
    const fallback = source.title.en ?? Object.values(source.title)[0] ?? id;
    return [id, {
      ...source,
      title: Object.fromEntries(supportedLocales.map((locale) => [locale, source.title[locale] ?? fallback])),
    }];
  }));
}

function migrateEdge(edge: LegacyEdge): GraphEdge {
  const properties = edge.properties ?? {};
  const unsupported = Object.keys(properties).filter((key) =>
    key !== "sourceRefs" && !edgePropertySentences.some(([name]) => name === key));
  if (unsupported.length) throw new Error(`${edge.id}: unsupported edge properties: ${unsupported.join(", ")}`);

  const note = edge.description?.trim() || edge.note?.trim() || "";
  const details = edgePropertySentences.flatMap(([key, prefix]) => {
    const value = properties[key];
    if (value === undefined) return [];
    if (typeof value !== "string" || !value.trim()) throw new Error(`${edge.id}: malformed edge property ${key}`);
    if (note.toLowerCase().includes(value.toLowerCase())) return [];
    const text = value.trim();
    return [`${prefix}${text}${/[.!?]$/.test(text) ? "" : "."}`];
  });
  const description = [note, ...details].filter(Boolean).join(" ");
  if (!description) throw new Error(`${edge.id}: missing edge description`);

  const renamed = edge.kind === "member_of" ? "member"
    : edge.kind === "publishes_to" ? "contributes"
      : edge.kind === "syncs_to" ? "transfers" : edge.kind;
  if (!edgeKinds.has(renamed as GraphEdgeKind)) throw new Error(`${edge.id}: unsupported edge kind ${edge.kind}`);

  return {
    id: edge.id,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    kind: renamed as GraphEdgeKind,
    description,
    sources: completeSourceTitles(edge.sources),
    createdAt: edge.createdAt ?? new Date().toISOString(),
    updatedAt: edge.updatedAt ?? new Date().toISOString(),
  };
}

function migrateEdgeInput(edge: LegacyEdge): RecordEdgeInput {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...input } = migrateEdge(edge);
  return input;
}

async function loadSourceGraph(): Promise<LegacyBootstrap> {
  const response = await fetch(bootstrapUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${bootstrapUrl} returned HTTP ${response.status}`);
  return response.json() as Promise<LegacyBootstrap>;
}

async function main() {
  const sourceGraph = await loadSourceGraph();
  const organizationBatch = JSON.parse(
    fs.readFileSync(path.join(directory, "batch.json"), "utf8"),
  ) as LegacyRecordInput[];
  const countryBatch = countryIds.map((id) => JSON.parse(
    fs.readFileSync(path.join(root, `research/2026-09-14-rich-countries/${id}.json`), "utf8"),
  ) as RecordAggregateContentInput);
  const batch = [
    ...countryBatch,
    ...organizationBatch.map(({ edges, routes: _routes, ...record }) => ({
      ...record,
      edges: edges?.map(migrateEdgeInput),
    })),
  ] as RecordAggregateContentInput[];

  const database = new PGlite();
  await database.exec(fs.readFileSync(path.join(root, "server/schema/001_create_explorer_schema.sql"), "utf8"));
  await database.exec("BEGIN");
  try {
    for (const node of sourceGraph.nodes) {
      const isSystem = node.kind === "system";
      await database.query(
        `INSERT INTO nodes (id, kind, country_code, url, record_depth, properties_json, sources)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
        [
          node.id,
          node.kind,
          node.kind === "country" ? node.countryCode : null,
          node.kind === "country" ? null : node.url,
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
            node.kind === "country" ? null : localization.description,
            JSON.stringify(isSystem ? localization.details : {}),
            localization.translatedFromLocale,
            JSON.stringify({
              history: [{
                state: localization.review.state,
                reviewer: null,
                date: localization.review.date,
                note: null,
              }],
            }),
          ],
        );
      }
    }

    for (const legacyEdge of sourceGraph.edges) {
      const edge = migrateEdge(legacyEdge);
      await database.query(
        `INSERT INTO edges (id, source_node_id, target_node_id, kind, description, sources)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [edge.id, edge.sourceNodeId, edge.targetNodeId, edge.kind, edge.description,
          JSON.stringify(edge.sources)],
      );
    }
    await database.exec("COMMIT");
  } catch (error) {
    await database.exec("ROLLBACK");
    throw error;
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

  try {
    for (const raw of batch) {
      const input = readRecordAggregateContentInput(raw.id, raw);
      const version = buildRecordUpdatedAt(await repository.getRecord(raw.id, query));
      const dryRun = await repository.upsertRecord(raw.id, input, {
        recordUpdatedAt: version,
        validateOnly: true,
      }) as RecordValidationResult;
      if (!dryRun.valid) throw new Error(`${raw.id}: ${JSON.stringify(dryRun.issues)}`);
      await repository.upsertRecord(raw.id, input, { recordUpdatedAt: version });
    }

    const graph = await repository.getBootstrap();
    const richRecords = graph.nodes.filter((node) => node.recordDepth === "rich");
    for (const node of richRecords) {
      const stored = await repository.getRecord(node.id, query);
      const verified = validateRecordQuality(node.id, recordContent(stored));
      if (!verified.valid) throw new Error(`${node.id}: ${JSON.stringify(verified.issues)}`);
    }

    fs.writeFileSync(output, `${JSON.stringify(toPublicBootstrap(graph), null, 2)}\n`);
    console.log(`Wrote ${output}`);
    console.log(`Preview contains ${graph.nodes.length} nodes, ${graph.edges.length} migrated edges, and ${richRecords.length} rich records.`);
  } finally {
    await repository.close?.();
  }
}

void main();
