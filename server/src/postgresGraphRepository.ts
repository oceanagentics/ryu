import { indexGraph } from "../../shared/indexGraph";
import { validEdgeEndpoints } from "../../shared/domain";
import { searchRecords } from "./recordSearch";
import type { Pool, PoolClient } from "pg";
import { isDeepStrictEqual } from "node:util";

import type {
  GraphBootstrapPayload,
  GraphEdge,
  GraphNode,
  NodeLocalizationReviewInput,
  RyuPortalRoute,
  RyuRoute,
  RyuSystemOperator,
  RyuSystemQuery,
  RyuSystemRecord,
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
  RecordValidationResult,
} from "../../shared/recordApi";
import type { GraphRepository } from "./graphRepository";
import {
  isReviewState,
  mapEdge,
  mapNode,
  mapNodeContent,
  mapNodeLocalization,
  mapPortalRoute,
  mapRyuRoute,
  normalizeString,
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

function timestampText(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapPostgresNode(
  row: Record<string, unknown>,
  localizations: ReturnType<typeof mapNodeLocalization>[] = [],
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

function mapPostgresNodeLocalization(row: Record<string, unknown>) {
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

export class PostgresGraphRepository implements GraphRepository {
  constructor(private readonly pool: Pool) {}

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getBootstrap(): Promise<GraphBootstrapPayload> {
    const [nodeRows, localizationRows, edgeRows, routeRows] = await Promise.all([
      this.query("SELECT id, kind, country_code, url, record_depth, properties_json, sources, created_at, updated_at FROM nodes ORDER BY id"),
      this.query("SELECT * FROM node_localizations ORDER BY node_id, locale"),
      this.query("SELECT id, source_node_id, target_node_id, kind, description, sources, created_at, updated_at FROM edges ORDER BY id"),
      this.query("SELECT * FROM ryu_routes ORDER BY node_id, priority, id"),
    ]);
    const localizationsByNodeId = new Map<string, ReturnType<typeof mapNodeLocalization>[]>();
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
    return {
      nodes,
      edges: edgeRows.map(mapPostgresEdge),
      ryuRoutes: routeRows.map(mapPostgresRoute),
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
            url,
            record_depth,
            properties_json, sources
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET kind = EXCLUDED.kind,
              country_code = EXCLUDED.country_code,
              url = EXCLUDED.url,
              record_depth = EXCLUDED.record_depth,
              properties_json = EXCLUDED.properties_json,
              sources = EXCLUDED.sources
        `,
        [
          id,
          input.record.kind,
          input.record.kind === "country" ? input.record.countryCode ?? null : null,
          input.record.kind === "country" ? null : input.record.url ?? null,
          input.record.recordDepth ?? "stub",
          stringifyJson(input.record.properties ?? {}),
          JSON.stringify(prepared.candidate.record.sources),
        ],
      );

      for (const [locale, localization] of Object.entries(input.localizations ?? {})) {
        if (localization) {
          await this.upsertLocalization(client, id, locale as SupportedLocale, localization);
        }
      }
      await this.upsertEdges(client, prepared.edgeUpserts);
      await this.upsertRoutes(client, id, ("routes" in input ? input.routes ?? [] : []));
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

      await this.upsertEdges(client, prepared.edgeUpserts);
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

      await this.upsertRoutes(client, id, ("routes" in input ? input.routes?.upsert ?? [] : []));
      for (const routeId of ("routes" in input ? input.routes?.delete ?? [] : [])) {
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
    ] = await Promise.all([
      this.countRows("SELECT count(*) AS count FROM node_localizations WHERE node_id = $1", [id]),
      this.countRows("SELECT count(*) AS count FROM edges WHERE target_node_id = $1", [id]),
      this.countRows("SELECT count(*) AS count FROM edges WHERE source_node_id = $1", [id]),
      this.countRows("SELECT count(*) AS count FROM ryu_routes WHERE node_id = $1", [id]),
    ]);
    const [aggregate] = await this.getRecordAggregatesByIds([id], defaultLocale);
    const impactWithoutHash = {
      recordId: id,
      recordUpdatedAt,
      nodeRows,
      localizationRows,
      inboundEdges,
      outboundEdges,
      routeRows,
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

    if (!isReviewState(input.reviewState)) {
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
      await this.getNodeLocalization(id, locale, client);
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
          input.reviewState,
          normalizeString(input.reviewerNote),
          normalizedReviewer,
          reviewDate,
          locale,
        ],
      );
    });

    return this.getNode(id);
  }

  private getRecordAggregatesByIds(ids: string[], requestedLocale: SupportedLocale, client: Pool | PoolClient, preserveContent: true): Promise<RecordQualityInput[]>;
  private getRecordAggregatesByIds(ids: string[], requestedLocale: SupportedLocale, client?: Pool | PoolClient): Promise<RecordAggregate[]>;
  private async getRecordAggregatesByIds(
    ids: string[],
    requestedLocale: SupportedLocale,
    client: Pool | PoolClient = this.pool,
    preserveContent = false,
  ): Promise<RecordAggregate[] | RecordQualityInput[]> {
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
    const localizationsByNodeId = new Map<string, ReturnType<typeof mapNodeLocalization>[]>();
    for (const row of localizationRows) {
      const nodeId = String(row.node_id);
      // Display defaults must not hide malformed or unknown stored fields from
      // aggregate validation. Database JSON is inspected before accepting edits.
      localizationsByNodeId.set(nodeId, [
        ...(localizationsByNodeId.get(nodeId) ?? []),
        mapPostgresNodeLocalization(row),
      ]);
    }

    const edges = edgeRows.map(mapPostgresEdge);
    const routes = routeRows.map(mapPostgresRoute);
    if (preserveContent) return nodeRows.map(row => {
      const content = mapNodeContent({ ...row as RawNode, properties_json: jsonText(row.properties_json) },
        localizationsByNodeId.get(String(row.id)) ?? []);
      const ownedRoutes = routes.filter(route => route.nodeId === content.id);
      return { ...content,
        edges: edges.filter(edge => edge.sourceNodeId === content.id || edge.targetNodeId === content.id),
        ...(content.record.kind === "system" || ownedRoutes.length ? { routes: ownedRoutes } : {}),
      };
    });

    const nodesById = new Map(
      nodeRows.map((row) => [
        String(row.id),
        mapPostgresNode(row, localizationsByNodeId.get(String(row.id)) ?? [], requestedLocale),
      ]),
    );
    return ids.flatMap<RecordAggregate>((id) => {
      const node = nodesById.get(id);
      if (!node) {
        return [];
      }

      const recordEdges = edges.filter((edge) => edge.sourceNodeId === id || edge.targetNodeId === id);
      const recordRoutes = routes.filter((route) => route.nodeId === id);
      if (node.kind !== "system" && recordRoutes.length) throw new Error(`invalid stored ${node.kind} ${id}: routes is not part of its contract`);
      switch (node.kind) {
        case "system": return [{ node, edges: recordEdges, routes: recordRoutes, matchReasons: [] }];
        case "country": return [{ node, edges: recordEdges, matchReasons: [] }];
        case "organization": return [{ node, edges: recordEdges, matchReasons: [] }];
      }
    });
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
    const [before] = await this.getRecordAggregatesByIds([id], defaultLocale, client, true);
    const full = input as RecordAggregateContentInput;
    const changes = input as RecordPatchInput;
    const routeChanges = "routes" in changes ? changes.routes : undefined;
    const fullRoutes = "routes" in full ? full.routes : undefined;
    const candidate: RecordQualityInput = {
      id,
      record: patch ? { ...before!.record } : {
        kind: full.record.kind,
        ...(full.record.kind === "country" ? { countryCode: full.record.countryCode ?? null } : { url: full.record.url ?? null }),
        sources: full.record.sources ?? before?.record.sources ?? {},
        recordDepth: full.record.recordDepth ?? "stub", properties: full.record.properties ?? {},
      },
      localizations: { ...before?.localizations },
      edges: [...before?.edges ?? []], routes: [...before?.routes ?? []],
    };
    if (patch && changes.record) {
      const { propertiesReplace, sourcesReplace, ...neutral } = changes.record;
      Object.assign(candidate.record, Object.fromEntries(Object.entries(neutral).filter(([, value]) => value !== undefined)));
      if (sourcesReplace !== undefined) candidate.record.sources = sourcesReplace;
      if (propertiesReplace !== undefined) candidate.record.properties = propertiesReplace;
    }
    const mergeRows = <T extends { id: string }>(old: T[], upsert: T[], deleted: string[] = []) =>
      [...new Map([...old.filter(row => !deleted.includes(row.id)), ...upsert].map(row => [row.id, row])).values()];
    const pendingIssues: RecordValidationResult["issues"] = [];
    if (patch && routeChanges !== undefined && before?.record.kind !== "system") pendingIssues.push({ recordId: id, path: "routes", message: `routes is not a ${before?.record.kind ?? candidate.record.kind} record section` });
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
      } else candidate.localizations![key] = Object.fromEntries(Object.entries(value).filter(([field]) => field !== "mode")) as unknown as LocalizationContentInput;
    }
    const edgeUpserts = (patch ? changes.edges?.upsert ?? [] : full.edges ?? []).map(edge => ({
      ...edge, sources: edge.sources ?? before?.edges?.find(old => old.id === edge.id)?.sources ?? {},
    }));
    candidate.edges = mergeRows(candidate.edges!, edgeUpserts, patch ? changes.edges?.delete : []);
    const candidateRoutes = mergeRows(candidate.routes!, patch ? routeChanges?.upsert ?? [] : fullRoutes ?? [], patch ? routeChanges?.delete : []);
    if (candidate.record.kind === "system" || candidateRoutes.length || (patch ? routeChanges?.upsert !== undefined : fullRoutes !== undefined)) candidate.routes = candidateRoutes;
    else delete candidate.routes;
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
      for (const [section, deleted, rows] of [["edges", changes.edges?.delete, before?.edges], ["routes", routeChanges?.delete, before?.routes]] as const) {
        for (const deletedId of deleted ?? []) if (!rows?.some(row => row.id === deletedId)) validation.issues.push({ recordId: id, path: `${section}.${deletedId}`, message: "row does not belong to this record" });
      }
    }
    const edgeFields = (rows: RecordEdgeInput[] = []) => rows.map(({ id, kind, sourceNodeId, targetNodeId, description, sources }) => ({ id, kind, sourceNodeId, targetNodeId, description, sources: sources ?? {} })).sort((a, b) => a.id.localeCompare(b.id));
    for (const [section, supplied, previous] of [
      ["edges", patch ? changes.edges?.upsert : full.edges, before?.edges],
      ["ryu_routes", patch ? routeChanges?.upsert : fullRoutes, before?.routes],
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
      const neutralFields = (record: RecordQualityInput["record"]) => [record.kind, record.countryCode, record.url, record.properties, record.sources];
      const routeFields = (rows: RecordRouteInput[] = []) => rows.map(({ id, status, mode, priority, capabilities, target, upstream, format, contractRef, caveat, properties }) => ({ id, status, mode, priority: priority ?? 1, capabilities: capabilities ?? [], target: target ?? null, upstream: upstream ?? null, format: format ?? null, contractRef: contractRef ?? null, caveat: caveat ?? null, properties: properties ?? {} })).sort((a, b) => a.id.localeCompare(b.id));
      if (!isDeepStrictEqual(neutralFields(before.record), neutralFields(candidate.record)) || !isDeepStrictEqual(edgeFields(before.edges), edgeFields(candidate.edges)) || !isDeepStrictEqual(routeFields(before.routes), routeFields(candidate.routes))) invalidate(id, [...supportedLocales]);
      for (const locale of supportedLocales) {
        const fields = (l: NonNullable<RecordQualityInput["localizations"]>[SupportedLocale]) => [l?.title, l?.summary ?? null, (l && "description" in l ? l.description ?? null : null), l?.details ?? {}, l?.translatedFromLocale ?? null];
        if (!isDeepStrictEqual(fields(before.localizations?.[locale]), fields(candidate.localizations?.[locale]))) {
          const affected = new Set<SupportedLocale>([locale]);
          for (const changed of affected) for (const target of supportedLocales) {
            if (candidate.localizations?.[target]?.translatedFromLocale === changed) affected.add(target);
          }
          invalidate(id, [...affected]);
        }
      }
    }
    const changedEdges = [...before?.edges ?? [], ...candidate.edges ?? []].filter(edge =>
      !isDeepStrictEqual(edgeFields(before?.edges?.filter(row => row.id === edge.id)), edgeFields(candidate.edges?.filter(row => row.id === edge.id))));
    const edgeRecordIds = new Set(changedEdges.flatMap(edge => [edge.sourceNodeId, edge.targetNodeId]));
    const relatedIds = new Set(edgeRecordIds);
    if (relatedIds.size) {
      await client.query("SELECT id FROM nodes WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE", [[...relatedIds]]);
      const related = await this.getRecordAggregatesByIds([...relatedIds], defaultLocale, client, true);
      for (const record of related) {
        const relatedId = record.id!;
        invalidate(relatedId, [...supportedLocales]);
        if (relatedId === id) continue;
        const content = record;
        const changedEdgeIds = new Set(changedEdges.map(edge => edge.id));
        content.edges = mergeRows((content.edges ?? []).filter(edge => !changedEdgeIds.has(edge.id)),
          (candidate.edges ?? []).filter(edge => edge.sourceNodeId === relatedId || edge.targetNodeId === relatedId));
        validation.issues.push(...validateRecordQuality(relatedId, content).issues);
      }
    }
    validation.valid = validation.issues.length === 0;
    return { validation, invalidations, candidate, edgeUpserts };
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
    if ("countryCode" in input && input.countryCode !== undefined) {
      addField("country_code", input.countryCode);
    }
    if ("url" in input && input.url !== undefined) {
      addField("url", input.url);
    }
    if (input.recordDepth !== undefined) {
      addField("record_depth", input.recordDepth);
    }
    if (input.sourcesReplace !== undefined) addField("sources", JSON.stringify(input.sourcesReplace), "::jsonb");
    if (input.propertiesReplace !== undefined) {
      addField(
        "properties_json",
        stringifyJson(input.propertiesReplace),
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
        "description" in input ? input.description ?? null : null,
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
    if ("description" in input && input.description !== undefined) {
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

  private async upsertEdges(client: PoolClient, edges: RecordEdgeInput[]): Promise<void> {
    for (const edge of edges) {
      await client.query(
        `
          INSERT INTO edges (
            id,
            source_node_id,
            target_node_id,
            kind,
            description,
            sources
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
          ON CONFLICT (id) DO UPDATE
          SET source_node_id = EXCLUDED.source_node_id,
              target_node_id = EXCLUDED.target_node_id,
              kind = EXCLUDED.kind,
              description = EXCLUDED.description,
              sources = EXCLUDED.sources
        `,
        [
          edge.id,
          edge.sourceNodeId,
          edge.targetNodeId,
          edge.kind,
          edge.description,
          JSON.stringify(edge.sources ?? {}),
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
    const routesByNodeId = new Map<string, RyuRoute[]>();

    graph.ryuRoutes.forEach((route) => {
      routesByNodeId.set(route.nodeId, [...(routesByNodeId.get(route.nodeId) ?? []), route]);
    });

    return graph.nodes
      .filter((node) => node.kind === "system")
      .map((node) => {
        const localization = resolveNodeLocalization(node, defaultLocale);
        const details = localization.details as unknown as Record<string, unknown>;
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
          ...accessPath.methods,
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
          description: localization.description ?? null,
          requestedLocale: localization.requestedLocale,
          displayLocale: localization.displayLocale,
          isLocaleFallback: localization.isLocaleFallback,
          url: node.url ?? null,
          domains: uniqueStrings([
            ...node.properties.disciplines ?? [],
          ]),
          geographies: [],
          capabilities: uniqueStrings([
            ...routeCapabilities,
            ...descriptorLabels,
            ...accessValues,
            routeSupportsLayerSearch ? "map_layers" : null,
          ]),
          routes,
          sources: node.sources,
          caveats: uniqueStrings(routes.flatMap(route => route.caveats)),
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
      sources: query.includeSources === false ? {} : system.sources,
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
  ): Promise<ReturnType<typeof mapNodeLocalization>> {
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
