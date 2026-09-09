import { indexGraph } from "../../shared/indexGraph";
import { validEdgeEndpoints } from "../../shared/domain";
import { searchRecords } from "./recordSearch";
import type { Pool, PoolClient } from "pg";
import { isDeepStrictEqual } from "node:util";

import type {
  GraphBootstrapPayload,
  GraphEdge,
  GraphNode,
  NodeLocalization,
  NodeLocalizationReviewInput,
  RyuPortalRoute,
  RyuRoute,
  RyuSystemOperator,
  RyuSystemQuery,
  RyuSystemRecord,
  SavedView,
  Source,
  SupportedLocale,
} from "../../shared/domain";
import { defaultLocale, resolveNodeLocalization, supportedLocales } from "../../shared/localization";
import type {
  BulkRecordValidationInput,
  BulkRecordValidationResult,
  RecordAggregate,
  RecordAggregateContentInput,
  RecordDeleteImpact,
  RecordEdgeInput,
  LocalizationContentInput,
  RecordListResult,
  RecordMutationOptions,
  RecordPatchInput,
  RecordRouteInput,
  RecordSearchQuery,
  RecordSourceInput,
  RecordValidationResult,
  SourceLocalizationContentInput,
} from "../../shared/recordApi";
import type { GraphRepository } from "./graphRepository";
import {
  collectSourceIds,
  filterSavedViews,
  isReviewState,
  mapEdge,
  mapNode,
  mapNodeLocalization,
  mapPortalRoute,
  mapPortalSource,
  mapRyuRoute,
  mapSavedView,
  mapSource,
  normalizeString,
  readStringArray,
  stringifyJson,
  systemSearchScore,
  uniqueStrings,
  valuesMatchAny,
  type RawEdge,
  type RawNode,
  type RawNodeLocalization,
  type RawRyuRoute,
} from "./graphRepositorySupport";
import {
  ApiRequestError,
  buildDeleteImpactHash,
  encodeRecordCursor,
  validateBulkRecordPayload,
  recordContent,
  type RecordQualityInput,
  validateRecordQuality,
} from "./recordContracts";

type UpsertLocalizationInput = LocalizationContentInput | Extract<
  NonNullable<RecordPatchInput["localizations"]>[SupportedLocale],
  { mode: "replace" }
>;
type PatchLocalizationInput = Extract<
  NonNullable<RecordPatchInput["localizations"]>[SupportedLocale],
  { mode: "patch" }
>;

function jsonText(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function stripRetiredNodeProperties(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const properties = { ...(value ?? {}) };
  delete properties.operator;
  return properties;
}

function timestampText(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapPostgresNode(
  row: Record<string, unknown>,
  localizations: NodeLocalization[] = [],
  requestedLocale: SupportedLocale = defaultLocale,
): GraphNode {
  return mapNode(
    {
      ...(row as RawNode),
      properties_json: jsonText(row.properties_json),
      created_at: timestampText(row.created_at),
      updated_at: timestampText(row.updated_at),
    },
    localizations,
    requestedLocale,
  );
}

function mapPostgresNodeLocalization(row: Record<string, unknown>): NodeLocalization {
  return mapNodeLocalization({
    ...(row as RawNodeLocalization),
    details_json: jsonText(row.details_json),
    content_updated_at: timestampText(row.content_updated_at),
    created_at: timestampText(row.created_at),
    updated_at: timestampText(row.updated_at),
  });
}

function mapPostgresEdge(row: Record<string, unknown>): GraphEdge {
  return mapEdge({
    ...(row as RawEdge),
    properties_json: jsonText(row.properties_json),
    created_at: timestampText(row.created_at),
    updated_at: timestampText(row.updated_at),
  });
}

function mapPostgresRoute(row: Record<string, unknown>): RyuRoute {
  return mapRyuRoute({
    ...(row as RawRyuRoute),
    capabilities_json: jsonText(row.capabilities_json),
    properties_json: jsonText(row.properties_json),
    priority: Number(row.priority),
    created_at: timestampText(row.created_at),
    updated_at: timestampText(row.updated_at),
  });
}

function mapPostgresSavedView(row: Record<string, unknown>): SavedView {
  return mapSavedView({
    ...row,
    filter_json: jsonText(row.filter_json),
    layout_json: jsonText(row.layout_json),
    style_json: jsonText(row.style_json),
    created_at: timestampText(row.created_at),
    updated_at: timestampText(row.updated_at),
  });
}

export class PostgresGraphRepository implements GraphRepository {
  constructor(private readonly pool: Pool) {}

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getBootstrap(): Promise<GraphBootstrapPayload> {
    const [nodeRows, localizationRows, edgeRows, sourceRows, routeRows] = await Promise.all([
      this.query("SELECT * FROM nodes ORDER BY id"),
      this.query("SELECT * FROM node_localizations ORDER BY node_id, locale"),
      this.query("SELECT * FROM edges ORDER BY id"),
      this.getSources(),
      this.query("SELECT * FROM ryu_routes ORDER BY node_id, priority, id"),
    ]);
    const localizationsByNodeId = new Map<string, NodeLocalization[]>();
    for (const row of localizationRows) {
      const localization = mapPostgresNodeLocalization(row);
      const nodeId = String(row.node_id);
      localizationsByNodeId.set(nodeId, [
        ...(localizationsByNodeId.get(nodeId) ?? []),
        localization,
      ]);
    }
    const nodes = nodeRows
      .map((row) => mapPostgresNode(row, localizationsByNodeId.get(String(row.id)) ?? []))
      .sort((left, right) =>
        resolveNodeLocalization(left, defaultLocale).title.localeCompare(
          resolveNodeLocalization(right, defaultLocale).title,
        ) || left.id.localeCompare(right.id),
      );
    const savedViews = filterSavedViews(
      await this.listSavedViews(),
      new Set(nodes.map((node) => node.id)),
    );

    return {
      nodes,
      edges: edgeRows.map(mapPostgresEdge),
      sources: sourceRows,
      ryuRoutes: routeRows.map(mapPostgresRoute),
      savedViews,
    };
  }

  async listPortalSystems(query: RyuSystemQuery = {}): Promise<RyuSystemRecord[]> {
    const systems = await this.buildPortalSystems();
    return systems
      .filter((system) => this.matchesPortalSystem(system, query))
      .map((system) => this.withPortalIncludes(system, query));
  }

  async searchPortalSystems(query: RyuSystemQuery = {}): Promise<RyuSystemRecord[]> {
    return (await this.listPortalSystems(query))
      .map((system) => ({
        system,
        score: systemSearchScore(system, query.query),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) =>
        right.score - left.score || left.system.title.localeCompare(right.system.title),
      )
      .map(({ system }) => system);
  }

  async getPortalSystem(id: string, query: RyuSystemQuery = {}): Promise<RyuSystemRecord> {
    const system = (await this.buildPortalSystems()).find((candidate) => candidate.ryuSystemId === id);
    if (!system) {
      throw new Error(`system not found: ${id}`);
    }

    return this.withPortalIncludes(system, query);
  }

  async listRecords(query: RecordSearchQuery): Promise<RecordListResult> {
    const matches = searchRecords(indexGraph(await this.getBootstrap()), query);
    const cursor = query.cursor;
    const remaining = cursor ? matches.filter(match =>
      match.score < (cursor.score ?? 0) || (match.score === (cursor.score ?? 0) && (
        resolveNodeLocalization(match.entity, query.locale).title.localeCompare(cursor.title, query.locale) > 0 ||
        (resolveNodeLocalization(match.entity, query.locale).title.localeCompare(cursor.title, query.locale) === 0 &&
          match.entity.id.localeCompare(cursor.id) > 0)
      ))) : matches;
    const page = remaining.slice(0, query.limit);
    const records = await this.getRecordAggregatesByIds(page.map(match => match.entity.id), query.locale);
    const last = page.at(-1);
    return {
      records: records.map((record, index) => ({ ...record,
        score: page[index].score, matchedLocale: page[index].matchedLocale, matchReasons: page[index].reasons,
      })),
      total: matches.length,
      ...(query.include.includes("matchingIds") ? { matchingIds: matches.map(match => match.entity.id) } : {}),
      nextCursor: remaining.length > query.limit && last
        ? encodeRecordCursor({ title: resolveNodeLocalization(last.entity, query.locale).title, id: last.entity.id, score: last.score })
        : null,
    };
  }

  async getRecord(id: string, query: RecordSearchQuery): Promise<RecordAggregate> {
    const [record] = await this.getRecordAggregatesByIds([id], query.locale);
    if (!record) {
      throw new Error(`record not found: ${id}`);
    }

    return record;
  }

  async validateRecordAggregate(
    id: string,
    input: RecordAggregateContentInput,
  ): Promise<RecordValidationResult> {
    return this.withTransaction(async client => (await this.prepareRecordContent(client, id, input, false)).validation);
  }

  async upsertRecord(
    id: string,
    input: RecordAggregateContentInput,
    options: RecordMutationOptions = {},
  ): Promise<RecordAggregate | RecordValidationResult> {
    const validation = await this.withTransaction(async (client) => {
      await this.requireUpsertPrecondition(client, id, options);
      const prepared = await this.prepareRecordContent(client, id, input, false);
      if (options.validateOnly || !prepared.validation.valid) return prepared.validation;
      await client.query(
        `
          INSERT INTO nodes (
            id,
            kind,
            country_code,
            subtype,
            url,
            record_depth,
            properties_json
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET kind = EXCLUDED.kind,
              country_code = EXCLUDED.country_code,
              subtype = EXCLUDED.subtype,
              url = EXCLUDED.url,
              record_depth = EXCLUDED.record_depth,
              properties_json = EXCLUDED.properties_json
        `,
        [
          id,
          input.record.kind,
          input.record.countryCode ?? null,
          input.record.subtype ?? null,
          input.record.url ?? null,
          input.record.recordDepth ?? "stub",
          stringifyJson(stripRetiredNodeProperties(input.record.properties)),
        ],
      );

      await this.upsertSources(client, input.sources?.upsert ?? []);
      for (const [locale, localization] of Object.entries(input.localizations ?? {})) {
        if (localization) {
          await this.upsertLocalization(client, id, locale as SupportedLocale, localization);
        }
      }
      await this.upsertEdges(client, input.edges ?? []);
      await this.upsertRoutes(client, id, input.routes ?? []);
      await this.invalidateContentReviews(client, prepared.invalidations);
      return null;
    });

    return validation ?? this.getRecordAfterWrite(id);
  }

  async patchRecord(
    id: string,
    input: RecordPatchInput,
    options: RecordMutationOptions = {},
  ): Promise<RecordAggregate | RecordValidationResult> {
    const validation = await this.withTransaction(async (client) => {
      await this.requireExistingRecordPrecondition(client, id, options);
      const prepared = await this.prepareRecordContent(client, id, input, true);
      if (options.validateOnly || !prepared.validation.valid) return prepared.validation;
      if (input.record) {
        await this.patchNeutralRecord(client, id, input.record);
      }

      await this.upsertSources(client, input.sources?.upsert ?? []);

      for (const [locale, patch] of Object.entries(input.localizations ?? {})) {
        if (!patch) {
          continue;
        }
        if (patch.mode === "replace") {
          await this.upsertLocalization(client, id, locale as SupportedLocale, patch);
        } else {
          await this.patchLocalization(client, id, locale as SupportedLocale, patch);
        }
      }

      await this.upsertEdges(client, input.edges?.upsert ?? []);
      for (const edgeId of input.edges?.delete ?? []) {
        const result = await client.query(
          `
            DELETE FROM edges
            WHERE id = $1
              AND (source_node_id = $2 OR target_node_id = $2)
          `,
          [edgeId, id],
        );
        if (result.rowCount !== 1) {
          throw new Error(`edge not found for record: ${edgeId}`);
        }
      }

      await this.upsertRoutes(client, id, input.routes?.upsert ?? []);
      for (const routeId of input.routes?.delete ?? []) {
        const result = await client.query(
          "DELETE FROM ryu_routes WHERE id = $1 AND node_id = $2",
          [routeId, id],
        );
        if (result.rowCount !== 1) {
          throw new Error(`route not found for record: ${routeId}`);
        }
      }
      await this.invalidateContentReviews(client, prepared.invalidations);
      return null;
    });

    return validation ?? this.getRecordAfterWrite(id);
  }

  async getRecordDeleteImpact(id: string): Promise<RecordDeleteImpact> {
    const recordUpdatedAt = await this.getRecordUpdatedAt(id);
    if (!recordUpdatedAt) {
      throw new Error(`record not found: ${id}`);
    }

    const nodeRows = await this.countRows("SELECT count(*) AS count FROM nodes WHERE id = $1", [id]);
    if (nodeRows === 0) {
      throw new Error(`record not found: ${id}`);
    }

    const [
      localizationRows,
      inboundEdges,
      outboundEdges,
      routeRows,
      savedViewRows,
    ] = await Promise.all([
      this.countRows("SELECT count(*) AS count FROM node_localizations WHERE node_id = $1", [id]),
      this.countRows("SELECT count(*) AS count FROM edges WHERE target_node_id = $1", [id]),
      this.countRows("SELECT count(*) AS count FROM edges WHERE source_node_id = $1", [id]),
      this.countRows("SELECT count(*) AS count FROM ryu_routes WHERE node_id = $1", [id]),
      this.query(
        `
          SELECT id
          FROM saved_views
          WHERE scope = $1
             OR filter_json::text LIKE $2
             OR layout_json::text LIKE $2
             OR style_json::text LIKE $2
          ORDER BY id
        `,
        [id, `%${id}%`],
      ),
    ]);
    const [aggregate] = await this.getRecordAggregatesByIds([id], defaultLocale);
    const sourceIds = aggregate ? this.collectRecordSourceIds(aggregate) : [];
    const orphanedSourceCandidates: string[] = [];
    for (const sourceId of sourceIds) {
      if (!(await this.sourceIsReferencedOutsideRecord(sourceId, id))) {
        orphanedSourceCandidates.push(sourceId);
      }
    }

    const impactWithoutHash = {
      recordId: id,
      recordUpdatedAt,
      nodeRows,
      localizationRows,
      inboundEdges,
      outboundEdges,
      routeRows,
      affectedSavedViews: savedViewRows.map((row) => String(row.id)),
      orphanedSourceCandidates,
    };

    return {
      ...impactWithoutHash,
      impactHash: buildDeleteImpactHash(impactWithoutHash),
    };
  }

  async deleteRecord(
    id: string,
    impactHash: string,
    options: RecordMutationOptions = {},
  ): Promise<RecordDeleteImpact> {
    const impact = await this.getRecordDeleteImpact(id);
    if (impact.impactHash !== impactHash) {
      throw new ApiRequestError(409, "stale delete impact hash");
    }

    await this.withTransaction(async (client) => {
      await this.requireExistingRecordPrecondition(client, id, options);
      const result = await client.query("DELETE FROM nodes WHERE id = $1", [id]);
      if (result.rowCount !== 1) {
        throw new Error(`record not found: ${id}`);
      }
    });

    return impact;
  }

  async validateBulkRecords(input: BulkRecordValidationInput): Promise<BulkRecordValidationResult> {
    return validateBulkRecordPayload(input);
  }

  async updateNodeLocalizationReview(
    id: string,
    locale: SupportedLocale,
    input: NodeLocalizationReviewInput,
    reviewer: string,
    options: RecordMutationOptions = {},
  ): Promise<GraphNode> {
    const normalizedReviewer = normalizeString(reviewer);
    if (!normalizedReviewer) {
      throw new Error("reviewer is required");
    }

    const hasReviewState = Object.prototype.hasOwnProperty.call(input, "reviewState");
    const hasReviewerNote = Object.prototype.hasOwnProperty.call(input, "reviewerNote");
    if (!hasReviewState && !hasReviewerNote) {
      throw new Error("reviewState or reviewerNote is required");
    }
    if (hasReviewState && !isReviewState(input.reviewState)) {
      throw new Error("invalid reviewState");
    }

    if (options.validateOnly) {
      await this.withTransaction(async (client) => {
        await this.requireExistingRecordPrecondition(client, id, options);
        await this.getNodeLocalization(id, locale, client);
      });
      return this.getNode(id);
    }

    await this.withTransaction(async (client) => {
      await this.requireExistingRecordPrecondition(client, id, options);
      const existing = await this.getNodeLocalization(id, locale, client);
      const reviewState = hasReviewState ? input.reviewState : existing.review.state;
      const reviewerNote = hasReviewerNote
        ? normalizeString(input.reviewerNote)
        : existing.review.note;
      const reviewDate = new Date().toISOString();

      await client.query(
        `
          UPDATE node_localizations
          SET review_json = jsonb_build_object('history', review_json->'history' || jsonb_build_array(
            jsonb_build_object('state', $2::text, 'note', $3::text, 'reviewer', $4::text, 'date', $5::text)
          ))
          WHERE node_id = $1
            AND locale = $6
        `,
        [
          id,
          reviewState,
          reviewerNote,
          normalizedReviewer,
          reviewDate,
          locale,
        ],
      );
    });

    return this.getNode(id);
  }

  async getSource(id: string): Promise<Source> {
    const [source] = await this.getSources([id]);
    if (!source) throw new Error(`source not found: ${id}`);
    return source;
  }

  private async getSources(ids?: string[], client: Pool | PoolClient = this.pool): Promise<Source[]> {
    if (ids?.length === 0) return [];
    const rows = await this.query(`
      SELECT s.*, coalesce((
        SELECT jsonb_object_agg(l.locale, jsonb_build_object(
          'locale', l.locale, 'title', l.title, 'note', l.note,
          'translatedFromLocale', l.translated_from_locale,
          'contentUpdatedAt', l.content_updated_at, 'createdAt', l.created_at, 'updatedAt', l.updated_at
        )) FROM sources_localizations l WHERE l.source_id = s.id
      ), '{}'::jsonb) AS localizations
      FROM sources s ${ids ? "WHERE s.id = ANY($1::text[])" : ""} ORDER BY s.id
    `, ids ? [ids] : [], client);
    return rows.map(mapSource);
  }

  async listSavedViews(): Promise<SavedView[]> {
    return (await this.query("SELECT * FROM saved_views ORDER BY updated_at DESC"))
      .map(mapPostgresSavedView);
  }

  private async getRecordAggregatesByIds(
    ids: string[],
    requestedLocale: SupportedLocale,
    client: Pool | PoolClient = this.pool,
  ): Promise<RecordAggregate[]> {
    if (ids.length === 0) {
      return [];
    }

    const queryRows = (sql: string, params: unknown[]) => this.query(sql, params, client);
    const [nodeRows, localizationRows, edgeRows, routeRows] = await Promise.all([
      queryRows("SELECT * FROM nodes WHERE id = ANY($1::text[])", [ids]),
      queryRows(
        "SELECT * FROM node_localizations WHERE node_id = ANY($1::text[]) ORDER BY node_id, locale",
        [ids],
      ),
      queryRows(
        `
          SELECT *
          FROM edges
          WHERE source_node_id = ANY($1::text[])
             OR target_node_id = ANY($1::text[])
          ORDER BY id
        `,
        [ids],
      ),
      queryRows(
        "SELECT * FROM ryu_routes WHERE node_id = ANY($1::text[]) ORDER BY node_id, priority, id",
        [ids],
      ),
    ]);
    const localizationsByNodeId = new Map<string, NodeLocalization[]>();
    for (const row of localizationRows) {
      const nodeId = String(row.node_id);
      localizationsByNodeId.set(nodeId, [
        ...(localizationsByNodeId.get(nodeId) ?? []),
        mapPostgresNodeLocalization(row),
      ]);
    }

    const nodesById = new Map(
      nodeRows.map((row) => [
        String(row.id),
        mapPostgresNode(row, localizationsByNodeId.get(String(row.id)) ?? [], requestedLocale),
      ]),
    );
    const edges = edgeRows.map(mapPostgresEdge);
    const routes = routeRows.map(mapPostgresRoute);
    const sourceIds = new Set<string>();
    for (const id of ids) {
      const node = nodesById.get(id);
      if (!node) {
        continue;
      }
      collectSourceIds(node.properties, sourceIds);
      Object.values(node.localizations).forEach((localization) => {
        if (localization) {
          collectSourceIds(localization.details, sourceIds);
        }
      });
      edges
        .filter((edge) => edge.sourceNodeId === id || edge.targetNodeId === id)
        .forEach((edge) => collectSourceIds(edge.properties, sourceIds));
      routes
        .filter((route) => route.nodeId === id)
        .forEach((route) => collectSourceIds(route.properties, sourceIds));
    }
    const sources = sourceIds.size > 0
      ? await this.getSources([...sourceIds], client)
      : [];
    const sourcesById = new Map(sources.map((source) => [source.id, source]));

    return ids.flatMap((id) => {
      const node = nodesById.get(id);
      if (!node) {
        return [];
      }

      const recordEdges = edges.filter((edge) => edge.sourceNodeId === id || edge.targetNodeId === id);
      const recordRoutes = routes.filter((route) => route.nodeId === id);
      const recordSourceIds = this.collectRecordSourceIds({
        node,
        edges: recordEdges,
        routes: recordRoutes,
      });

      return [{
        node,
        edges: recordEdges,
        routes: recordRoutes,
        sources: recordSourceIds
          .map((sourceId) => sourcesById.get(sourceId))
          .filter((source): source is Source => Boolean(source)),
        matchReasons: [],
      }];
    });
  }

  private collectRecordSourceIds(record: {
    node: GraphNode;
    edges: GraphEdge[];
    routes: RyuRoute[];
  }): string[] {
    const sourceIds = new Set<string>();
    collectSourceIds(record.node.properties, sourceIds);
    Object.values(record.node.localizations).forEach((localization) => {
      if (localization) {
        collectSourceIds(localization.details, sourceIds);
      }
    });
    record.edges.forEach((edge) => collectSourceIds(edge.properties, sourceIds));
    record.routes.forEach((route) => collectSourceIds(route.properties, sourceIds));
    return [...sourceIds].sort();
  }

  private async getRecordAfterWrite(id: string): Promise<RecordAggregate> {
    const [record] = await this.getRecordAggregatesByIds([id], defaultLocale);
    if (!record) {
      throw new Error(`record not found: ${id}`);
    }

    return record;
  }

  private async countRows(sql: string, params: unknown[]): Promise<number> {
    const row = await this.queryOne(sql, params);
    return Number(row?.count ?? 0);
  }

  private async sourceIsReferencedOutsideRecord(sourceId: string, recordId: string): Promise<boolean> {
    const pattern = `%${sourceId}%`;
    const row = await this.queryOne(
      `
        SELECT EXISTS (
          SELECT 1
          FROM nodes
          WHERE id <> $2
            AND properties_json::text LIKE $1
          UNION ALL
          SELECT 1
          FROM node_localizations
          WHERE node_id <> $2
            AND details_json::text LIKE $1
          UNION ALL
          SELECT 1
          FROM edges
          WHERE source_node_id <> $2
            AND target_node_id <> $2
            AND properties_json::text LIKE $1
          UNION ALL
          SELECT 1
          FROM ryu_routes
          WHERE node_id <> $2
            AND properties_json::text LIKE $1
        ) AS referenced
      `,
      [pattern, recordId],
    );

    return row?.referenced === true;
  }

  private async getRecordUpdatedAt(
    id: string,
    client: Pool | PoolClient = this.pool,
  ): Promise<string | null> {
    const result = await client.query(
      `
        SELECT max(updated_at) AS record_updated_at
        FROM (
          SELECT updated_at
          FROM nodes
          WHERE id = $1
          UNION ALL
          SELECT updated_at
          FROM node_localizations
          WHERE node_id = $1
          UNION ALL
          SELECT updated_at
          FROM edges
          WHERE source_node_id = $1 OR target_node_id = $1
          UNION ALL
          SELECT updated_at
          FROM ryu_routes
          WHERE node_id = $1
        ) record_versions
      `,
      [id],
    );
    const value = result.rows[0]?.record_updated_at;
    return value == null ? null : timestampText(value);
  }

  private async prepareRecordContent(
    client: PoolClient,
    id: string,
    input: RecordAggregateContentInput | RecordPatchInput,
    patch: boolean,
  ) {
    const [existing] = await this.getRecordAggregatesByIds([id], defaultLocale, client);
    const before = existing ? recordContent(existing) : undefined;
    const full = input as RecordAggregateContentInput;
    const changes = input as RecordPatchInput;
    const candidate: RecordQualityInput = {
      id,
      record: patch ? { ...before!.record } : {
        kind: full.record.kind, countryCode: full.record.countryCode ?? null,
        subtype: full.record.subtype ?? null, url: full.record.url ?? null,
        recordDepth: full.record.recordDepth ?? "stub", properties: stripRetiredNodeProperties(full.record.properties),
      },
      localizations: { ...before?.localizations },
      edges: [...before?.edges ?? []], routes: [...before?.routes ?? []],
    };
    if (patch && changes.record) {
      const { propertiesReplace, ...neutral } = changes.record;
      Object.assign(candidate.record, Object.fromEntries(Object.entries(neutral).filter(([, value]) => value !== undefined)));
      if (propertiesReplace !== undefined) candidate.record.properties = stripRetiredNodeProperties(propertiesReplace);
    }
    const mergeRows = <T extends { id: string }>(old: T[], upsert: T[], deleted: string[] = []) =>
      [...new Map([...old.filter(row => !deleted.includes(row.id)), ...upsert].map(row => [row.id, row])).values()];
    const pendingIssues: RecordValidationResult["issues"] = [];
    for (const [locale, value] of Object.entries(input.localizations ?? {})) {
      if (!value) continue;
      const key = locale as SupportedLocale;
      if (patch && "mode" in value && value.mode === "patch") {
        const old = candidate.localizations![key];
        if (!old) pendingIssues.push({ recordId: id, path: `localizations.${locale}`, message: "cannot patch a missing localization; use replace" });
        const { mode: _mode, detailsReplace, ...content } = value;
        candidate.localizations![key] = {
          ...old, ...Object.fromEntries(Object.entries(content).filter(([, field]) => field !== undefined)),
          ...(detailsReplace !== undefined ? { details: detailsReplace } : {}),
        } as LocalizationContentInput;
      } else candidate.localizations![key] = value as LocalizationContentInput;
    }
    candidate.edges = mergeRows(candidate.edges!, patch ? changes.edges?.upsert ?? [] : full.edges ?? [], patch ? changes.edges?.delete : []);
    candidate.routes = mergeRows(candidate.routes!, patch ? changes.routes?.upsert ?? [] : full.routes ?? [], patch ? changes.routes?.delete : []);
    const sourceIds = collectSourceIds([candidate.record.properties, candidate.localizations, candidate.edges, candidate.routes]);
    for (const source of input.sources?.upsert ?? []) sourceIds.add(source.id);
    // Source locks make shared evidence checks stable until the transaction commits.
    if (sourceIds.size) await client.query("SELECT id FROM sources WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE", [[...sourceIds]]);
    const storedSources = await this.getSources([...sourceIds], client);
    const sources = new Map<string, Source | RecordSourceInput>(storedSources.map(source => [source.id, source]));
    for (const source of input.sources?.upsert ?? []) {
      const existing = sources.get(source.id);
      sources.set(source.id, {
        ...existing,
        ...source,
        localizations: {
          ...existing?.localizations,
          ...source.localizations,
        },
      });
    }
    candidate.sources = { upsert: [...sources.values()] };
    const validation = validateRecordQuality(id, candidate);
    validation.issues.push(...pendingIssues);
    validation.recordUpdatedAt = await this.getRecordUpdatedAt(id, client);
    validation.affectedSections = Object.keys(input).filter(key => !["id", "incomplete"].includes(key));
    const edges = candidate.edges ?? [];
    if (edges.length) {
      const ids = [...new Set(edges.flatMap(edge => [edge.sourceNodeId, edge.targetNodeId]))];
      const rows = await this.query("SELECT id, kind FROM nodes WHERE id = ANY($1::text[])", [ids], client);
      const kinds = new Map(rows.map(row => [String(row.id), String(row.kind)]));
      kinds.set(id, candidate.record.kind);
      const relationships = new Set<string>();
      for (const edge of edges) {
        if (edge.sourceNodeId === edge.targetNodeId || !validEdgeEndpoints(edge.kind, kinds.get(edge.sourceNodeId), kinds.get(edge.targetNodeId))) {
          validation.issues.push({ recordId: id, path: `edges.${edge.id}`, message: "edge endpoints must exist and match the relationship kind" });
        }
        const key = JSON.stringify([edge.kind, edge.sourceNodeId, edge.targetNodeId]);
        if (relationships.has(key)) validation.issues.push({ recordId: id, path: `edges.${edge.id}`, message: "duplicate relationship; put multiple sources or funding periods on the existing edge" });
        relationships.add(key);
      }
    }
    if (patch) {
      for (const [section, deleted, rows] of [["edges", changes.edges?.delete, before?.edges], ["routes", changes.routes?.delete, before?.routes]] as const) {
        for (const deletedId of deleted ?? []) if (!rows?.some(row => row.id === deletedId)) validation.issues.push({ recordId: id, path: `${section}.${deletedId}`, message: "row does not belong to this record" });
      }
    }
    const edgeFields = (rows: RecordEdgeInput[] = []) => rows.map(({ id, kind, sourceNodeId, targetNodeId, note, properties }) => ({ id, kind, sourceNodeId, targetNodeId, note: note ?? null, properties: properties ?? {} })).sort((a, b) => a.id.localeCompare(b.id));
    for (const [section, supplied, previous] of [
      ["edges", patch ? changes.edges?.upsert : full.edges, before?.edges],
      ["ryu_routes", patch ? changes.routes?.upsert : full.routes, before?.routes],
    ] as const) {
      const newIds = (supplied ?? []).filter(row => !previous?.some(old => old.id === row.id)).map(row => row.id);
      if (newIds.length) {
        const collisions = await this.query(`SELECT id FROM ${section} WHERE id = ANY($1::text[])`, [newIds], client);
        for (const row of collisions) validation.issues.push({ recordId: id, path: `${section}.${row.id}`, message: "row ID belongs to another record" });
      }
    }
    const invalidations = new Map<string, Set<SupportedLocale>>();
    const invalidate = (nodeId: string, locales: SupportedLocale[]) => invalidations.set(nodeId, new Set([...(invalidations.get(nodeId) ?? []), ...locales]));
    if (before) {
      const neutralFields = (record: RecordAggregateContentInput["record"]) => [record.kind, record.countryCode, record.subtype, record.url, record.properties];
      const routeFields = (rows: RecordRouteInput[] = []) => rows.map(({ id, status, mode, priority, capabilities, target, upstream, format, contractRef, caveat, properties }) => ({ id, status, mode, priority: priority ?? 1, capabilities: capabilities ?? [], target: target ?? null, upstream: upstream ?? null, format: format ?? null, contractRef: contractRef ?? null, caveat: caveat ?? null, properties: properties ?? {} })).sort((a, b) => a.id.localeCompare(b.id));
      if (!isDeepStrictEqual(neutralFields(before.record), neutralFields(candidate.record)) || !isDeepStrictEqual(edgeFields(before.edges), edgeFields(candidate.edges)) || !isDeepStrictEqual(routeFields(before.routes), routeFields(candidate.routes))) invalidate(id, [...supportedLocales]);
      for (const locale of supportedLocales) {
        const fields = (l: LocalizationContentInput | undefined) => [l?.title, l?.summary ?? null, l?.description ?? null, l?.details ?? {}, l?.translatedFromLocale ?? null];
        if (!isDeepStrictEqual(fields(before.localizations?.[locale]), fields(candidate.localizations?.[locale]))) {
          const affected = new Set<SupportedLocale>([locale]);
          for (const changed of affected) for (const target of supportedLocales) {
            if (candidate.localizations?.[target]?.translatedFromLocale === changed) affected.add(target);
          }
          invalidate(id, [...affected]);
        }
      }
    }
    const changedSources = (input.sources?.upsert ?? []).filter(source => {
      const old = storedSources.find(stored => stored.id === source.id);
      const fields = (s: Source | RecordSourceInput | undefined) => [s?.sourceType, s?.url, s?.localPath, s?.publisher, s?.publishedAt, s?.accessedAt,
        supportedLocales.map(locale => { const l = s?.localizations?.[locale]; return [l?.title, l?.note ?? null, l?.translatedFromLocale ?? null]; })];
      return !isDeepStrictEqual(fields(old), fields(sources.get(source.id)));
    });
    const changedEdges = [...before?.edges ?? [], ...candidate.edges ?? []].filter(edge =>
      !isDeepStrictEqual(edgeFields(before?.edges?.filter(row => row.id === edge.id)), edgeFields(candidate.edges?.filter(row => row.id === edge.id))));
    const edgeRecordIds = new Set(changedEdges.flatMap(edge => [edge.sourceNodeId, edge.targetNodeId]));
    const relatedIds = new Set(edgeRecordIds);
    const changedIds = new Set(changedSources.map(source => source.id));
    if (changedSources.length) {
      // Text matching only narrows the query; exact references are checked below.
      const patterns = [...changedIds].map(sourceId => `%${sourceId}%`);
      const rows = await this.query(`
        SELECT id FROM nodes WHERE properties_json::text LIKE ANY($1::text[])
        UNION SELECT node_id FROM node_localizations WHERE details_json::text LIKE ANY($1::text[])
        UNION SELECT source_node_id FROM edges WHERE properties_json::text LIKE ANY($1::text[])
        UNION SELECT target_node_id FROM edges WHERE properties_json::text LIKE ANY($1::text[])
        UNION SELECT node_id FROM ryu_routes WHERE properties_json::text LIKE ANY($1::text[])
      `, [patterns], client);
      rows.forEach(row => relatedIds.add(String(row.id)));
      if ([...collectSourceIds([candidate.record.properties, candidate.localizations, candidate.edges, candidate.routes])].some(ref => changedIds.has(ref))) invalidate(id, [...supportedLocales]);
    }
    if (relatedIds.size) {
      await client.query("SELECT id FROM nodes WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE", [[...relatedIds]]);
      const related = await this.getRecordAggregatesByIds([...relatedIds], defaultLocale, client);
      for (const record of related) {
        if (!edgeRecordIds.has(record.node.id) && !this.collectRecordSourceIds(record).some(ref => changedIds.has(ref))) continue;
        invalidate(record.node.id, [...supportedLocales]);
        if (record.node.id === id || record.node.recordDepth !== "rich") continue;
        const content = recordContent(record);
        const changedEdgeIds = new Set(changedEdges.map(edge => edge.id));
        content.edges = mergeRows((content.edges ?? []).filter(edge => !changedEdgeIds.has(edge.id)),
          (candidate.edges ?? []).filter(edge => edge.sourceNodeId === record.node.id || edge.targetNodeId === record.node.id));
        content.sources = { upsert: mergeRows(content.sources?.upsert ?? [], [...sources.values()]) };
        validation.issues.push(...validateRecordQuality(record.node.id, content).issues);
      }
    }
    validation.valid = validation.issues.length === 0;
    return { validation, invalidations };
  }

  private async invalidateContentReviews(client: PoolClient, invalidations: Map<string, Set<SupportedLocale>>) {
    for (const [id, locales] of invalidations) {
      await client.query("UPDATE nodes SET updated_at = clock_timestamp() WHERE id = $1", [id]);
      await client.query(`
        UPDATE node_localizations
        SET review_json = jsonb_build_object('history', review_json->'history' || jsonb_build_array(
          jsonb_build_object('state', 'needs_revision', 'reviewer', NULL, 'date', clock_timestamp(),
            'note', 'Content or cited evidence changed; review is required.')
        ))
        WHERE node_id = $1 AND locale = ANY($2::text[])
          AND review_json #>> '{history,-1,state}' = 'human_reviewed'
      `, [id, [...locales]]);
    }
  }

  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private async requireExistingNode(client: PoolClient, id: string): Promise<void> {
    const result = await client.query("SELECT id FROM nodes WHERE id = $1 FOR UPDATE", [id]);
    if (result.rowCount !== 1) {
      throw new Error(`record not found: ${id}`);
    }
  }

  private async requireUpsertPrecondition(
    client: PoolClient,
    id: string,
    options: RecordMutationOptions,
  ): Promise<void> {
    const result = await client.query("SELECT id FROM nodes WHERE id = $1 FOR UPDATE", [id]);
    if (result.rowCount === 0) {
      if (options.createOnly) {
        return;
      }
      throw new ApiRequestError(428, "createOnly precondition is required");
    }

    if (options.createOnly) {
      throw new ApiRequestError(412, "record already exists");
    }

    await this.requireRecordUpdatedAt(client, id, options);
  }

  private async requireExistingRecordPrecondition(
    client: PoolClient,
    id: string,
    options: RecordMutationOptions,
  ): Promise<void> {
    await this.requireExistingNode(client, id);
    await this.requireRecordUpdatedAt(client, id, options);
  }

  private async requireRecordUpdatedAt(
    client: PoolClient,
    id: string,
    options: RecordMutationOptions,
  ): Promise<void> {
    if (!options.recordUpdatedAt) {
      throw new ApiRequestError(428, "recordUpdatedAt precondition is required");
    }

    const current = await this.getRecordUpdatedAt(id, client);
    if (current !== options.recordUpdatedAt) {
      throw new ApiRequestError(412, "stale recordUpdatedAt");
    }
  }

  private async patchNeutralRecord(
    client: PoolClient,
    id: string,
    input: RecordPatchInput["record"],
  ): Promise<void> {
    if (!input) {
      return;
    }

    const sets: string[] = [];
    const params: unknown[] = [id];
    const addField = (column: string, value: unknown, cast = "") => {
      params.push(value);
      sets.push(`${column} = $${params.length}${cast}`);
    };

    if (input.kind !== undefined) {
      addField("kind", input.kind);
    }
    if (input.countryCode !== undefined) {
      addField("country_code", input.countryCode);
    }
    if (input.subtype !== undefined) {
      addField("subtype", input.subtype);
    }
    if (input.url !== undefined) {
      addField("url", input.url);
    }
    if (input.recordDepth !== undefined) {
      addField("record_depth", input.recordDepth);
    }
    if (input.propertiesReplace !== undefined) {
      addField(
        "properties_json",
        stringifyJson(stripRetiredNodeProperties(input.propertiesReplace)),
        "::jsonb",
      );
    }
    if (sets.length === 0) {
      return;
    }

    const result = await client.query(
      `UPDATE nodes SET ${sets.join(", ")} WHERE id = $1`,
      params,
    );
    if (result.rowCount !== 1) {
      throw new Error(`record not found: ${id}`);
    }
  }

  private async upsertLocalization(
    client: PoolClient,
    nodeId: string,
    locale: SupportedLocale,
    input: UpsertLocalizationInput,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO node_localizations (
          node_id,
          locale,
          title,
          summary,
          description,
          details_json,
          translated_from_locale
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (node_id, locale) DO UPDATE
        SET title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            description = EXCLUDED.description,
            details_json = EXCLUDED.details_json,
            translated_from_locale = EXCLUDED.translated_from_locale
      `,
      [
        nodeId,
        locale,
        input.title,
        input.summary ?? null,
        input.description ?? null,
        stringifyJson(input.details ?? {}),
        input.translatedFromLocale ?? null,
      ],
    );
  }

  private async patchLocalization(
    client: PoolClient,
    nodeId: string,
    locale: SupportedLocale,
    input: PatchLocalizationInput,
  ): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [nodeId, locale];
    const addField = (column: string, value: unknown, cast = "") => {
      params.push(value);
      sets.push(`${column} = $${params.length}${cast}`);
    };

    if (input.title !== undefined) {
      addField("title", input.title);
    }
    if (input.summary !== undefined) {
      addField("summary", input.summary);
    }
    if (input.description !== undefined) {
      addField("description", input.description);
    }
    if ("detailsReplace" in input && input.detailsReplace !== undefined) {
      addField("details_json", stringifyJson(input.detailsReplace), "::jsonb");
    }
    if (input.translatedFromLocale !== undefined) {
      addField("translated_from_locale", input.translatedFromLocale);
    }
    if (sets.length === 0) {
      return;
    }

    const result = await client.query(
      `
        UPDATE node_localizations
        SET ${sets.join(", ")}
        WHERE node_id = $1
          AND locale = $2
      `,
      params,
    );
    if (result.rowCount !== 1) {
      throw new Error(`node localization not found: ${nodeId}/${locale}`);
    }
  }

  private async upsertSources(client: PoolClient, sources: RecordSourceInput[]): Promise<void> {
    for (const source of sources) {
      const localizations = supportedLocales
        .map((locale) => [locale, source.localizations?.[locale]] as const)
        .filter((entry): entry is readonly [SupportedLocale, SourceLocalizationContentInput] => Boolean(entry[1]));

      await client.query(
        `
          INSERT INTO sources (
            id,
            source_type,
            url,
            local_path,
            publisher,
            published_at,
            accessed_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE
          SET source_type = EXCLUDED.source_type,
              url = EXCLUDED.url,
              local_path = EXCLUDED.local_path,
              publisher = EXCLUDED.publisher,
              published_at = EXCLUDED.published_at,
              accessed_at = EXCLUDED.accessed_at
        `,
        [
          source.id,
          source.sourceType,
          source.url,
          source.localPath,
          source.publisher,
          source.publishedAt,
          source.accessedAt,
        ],
      );

      for (const [locale, localization] of localizations) {
        await client.query(`
          INSERT INTO sources_localizations (source_id, locale, title, note, translated_from_locale)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (source_id, locale) DO UPDATE
          SET title = EXCLUDED.title, note = EXCLUDED.note,
              translated_from_locale = EXCLUDED.translated_from_locale
        `, [source.id, locale, localization.title, localization.note ?? null, localization.translatedFromLocale ?? null]);
      }
    }
  }

  private async upsertEdges(client: PoolClient, edges: RecordEdgeInput[]): Promise<void> {
    for (const edge of edges) {
      await client.query(
        `
          INSERT INTO edges (
            id,
            source_node_id,
            target_node_id,
            kind,
            note,
            properties_json
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET source_node_id = EXCLUDED.source_node_id,
              target_node_id = EXCLUDED.target_node_id,
              kind = EXCLUDED.kind,
              note = EXCLUDED.note,
              properties_json = EXCLUDED.properties_json
        `,
        [
          edge.id,
          edge.sourceNodeId,
          edge.targetNodeId,
          edge.kind,
          edge.note ?? null,
          stringifyJson(edge.properties ?? {}),
        ],
      );
    }
  }

  private async upsertRoutes(
    client: PoolClient,
    nodeId: string,
    routes: RecordRouteInput[],
  ): Promise<void> {
    for (const route of routes) {
      await client.query(
        `
          INSERT INTO ryu_routes (
            id,
            node_id,
            status,
            mode,
            priority,
            capabilities_json,
            target,
            upstream,
            format,
            contract_ref,
            caveat,
            properties_json
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET node_id = EXCLUDED.node_id,
              status = EXCLUDED.status,
              mode = EXCLUDED.mode,
              priority = EXCLUDED.priority,
              capabilities_json = EXCLUDED.capabilities_json,
              target = EXCLUDED.target,
              upstream = EXCLUDED.upstream,
              format = EXCLUDED.format,
              contract_ref = EXCLUDED.contract_ref,
              caveat = EXCLUDED.caveat,
              properties_json = EXCLUDED.properties_json
        `,
        [
          route.id,
          nodeId,
          route.status,
          route.mode,
          route.priority ?? 1,
          JSON.stringify(route.capabilities ?? []),
          route.target ?? null,
          route.upstream ?? null,
          route.format ?? null,
          route.contractRef ?? null,
          route.caveat ?? null,
          stringifyJson(route.properties ?? {}),
        ],
      );
    }
  }

  private async query(sql: string, params: unknown[] = [], client: Pool | PoolClient = this.pool): Promise<Array<Record<string, unknown>>> {
    const result = await client.query(sql, params);
    return result.rows as Array<Record<string, unknown>>;
  }

  private async queryOne(
    sql: string,
    params: unknown[] = [],
  ): Promise<Record<string, unknown> | undefined> {
    return (await this.query(sql, params))[0];
  }

  private async buildPortalSystems(): Promise<RyuSystemRecord[]> {
    const graph = await this.getBootstrap();
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const sourcesById = new Map(graph.sources.map((source) => [source.id, source]));
    const routesByNodeId = new Map<string, RyuRoute[]>();

    graph.ryuRoutes.forEach((route) => {
      routesByNodeId.set(route.nodeId, [...(routesByNodeId.get(route.nodeId) ?? []), route]);
    });

    return graph.nodes
      .filter((node) => node.kind === "system")
      .map((node) => {
        const localization = resolveNodeLocalization(node, defaultLocale);
        const details = localization.details as unknown as Record<string, unknown>;
        const sourceIds = collectSourceIds(localization.details);
        collectSourceIds(node.properties, sourceIds);
        const routes = (routesByNodeId.get(node.id) ?? [])
          .map((route) => mapPortalRoute(route))
          .sort((left, right) => left.priority - right.priority || left.routeId.localeCompare(right.routeId));
        const routeCapabilities = routes.flatMap((route) => route.capabilities);
        const routeSupportsLayerSearch = routes.some((route) =>
          route.supportedTools.includes("search_layers"),
        );
        const descriptorLabels = node.properties.data?.descriptors.map((descriptor) => descriptor.label) ?? [];
        const accessValues = node.properties.access?.flatMap((accessPath) => [
          accessPath.type,
          accessPath.method,
        ]) ?? [];

        return {
          ryuSystemId: node.id,
          title: localization.title,
          operator: this.findSystemOperator(
            node,
            graph.edges,
            nodesById,
            localization.requestedLocale,
          ),
          summary: localization.summary,
          description: localization.description,
          requestedLocale: localization.requestedLocale,
          displayLocale: localization.displayLocale,
          isLocaleFallback: localization.isLocaleFallback,
          url: node.url,
          domains: uniqueStrings([
            ...readStringArray(node.properties, "domains"),
            ...readStringArray(node.properties, "families"),
            node.subtype,
            ...node.properties.disciplines ?? [],
          ]),
          geographies: uniqueStrings([
            ...readStringArray(node.properties, "geographies"),
          ]),
          capabilities: uniqueStrings([
            ...readStringArray(node.properties, "capabilities"),
            ...routeCapabilities,
            ...descriptorLabels,
            ...accessValues,
            routeSupportsLayerSearch ? "map_layers" : null,
          ]),
          routes,
          sources: [...sourceIds]
            .map((sourceId) => sourcesById.get(sourceId))
            .filter((source): source is Source => Boolean(source))
            .map((source) => mapPortalSource(source)),
          caveats: uniqueStrings([
            ...readStringArray(details, "caveats"),
            ...readStringArray(node.properties, "caveats"),
          ]),
          recordDepth: node.recordDepth,
          reviewState: localization.review?.state ?? null,
          updatedAt: node.updatedAt,
        };
      });
  }

  private findSystemOperator(
    system: GraphNode,
    edges: GraphEdge[],
    nodesById: Map<string, GraphNode>,
    locale: SupportedLocale,
  ): RyuSystemOperator | null {
    const operatesEdge = edges.find((edge) =>
      edge.kind === "operates" && edge.targetNodeId === system.id,
    );
    const operator = operatesEdge ? nodesById.get(operatesEdge.sourceNodeId) : null;
    if (!operator) {
      return null;
    }

    return {
      id: operator.id,
      name: resolveNodeLocalization(operator, locale).title,
    };
  }

  private matchesPortalSystem(system: RyuSystemRecord, query: RyuSystemQuery): boolean {
    const routeStatus = uniqueStrings(query.routeStatus ?? []);
    const deliveryFormats = uniqueStrings(query.deliveryFormats ?? []);
    const hasRouteFilters = routeStatus.length > 0 || deliveryFormats.length > 0;
    const matchingRoutes = this.filterPortalRoutes(system.routes, query);

    return (
      valuesMatchAny(system.domains, query.domains) &&
      valuesMatchAny(system.geographies, query.geographies) &&
      valuesMatchAny(system.capabilities, query.capabilities) &&
      (!hasRouteFilters || matchingRoutes.length > 0)
    );
  }

  private filterPortalRoutes(routes: RyuPortalRoute[], query: RyuSystemQuery): RyuPortalRoute[] {
    return routes.filter((route) =>
      valuesMatchAny([route.status], query.routeStatus) &&
      valuesMatchAny(route.deliveryFormats, query.deliveryFormats),
    );
  }

  private withPortalIncludes(
    system: RyuSystemRecord,
    query: RyuSystemQuery,
  ): RyuSystemRecord {
    return {
      ...system,
      routes: query.includeRoutes === false ? [] : this.filterPortalRoutes(system.routes, query),
      sources: query.includeSources === false ? [] : system.sources,
    };
  }

  private async getNode(id: string): Promise<GraphNode> {
    const row = await this.queryOne("SELECT * FROM nodes WHERE id = $1", [id]);
    if (!row) {
      throw new Error(`node not found: ${id}`);
    }

    const localizationRows = await this.query(
      "SELECT * FROM node_localizations WHERE node_id = $1 ORDER BY locale",
      [id],
    );

    return mapPostgresNode(row, localizationRows.map(mapPostgresNodeLocalization));
  }

  private async getNodeLocalization(
    id: string,
    locale: SupportedLocale,
    client: Pool | PoolClient = this.pool,
  ): Promise<NodeLocalization> {
    const result = await client.query(
      "SELECT * FROM node_localizations WHERE node_id = $1 AND locale = $2",
      [id, locale],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error(`node localization not found: ${id}/${locale}`);
    }

    return mapPostgresNodeLocalization(row);
  }
}
