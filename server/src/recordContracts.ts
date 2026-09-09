import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { edgeKinds } from "../../shared/domain";

import type {
  GraphEdge,
  GraphNode,
  NodeLocalization,
  NodeLocalizationDetails,
  NodeLocalizationReviewInput,
  ReviewState,
  RyuRoute,
  SourceCollection,
  SupportedLocale,
} from "../../shared/domain";
import {
  defaultLocale,
  isSupportedLocale,
  resolveNodeLocalization,
  supportedLocales,
} from "../../shared/localization";
import type {
  AdminRecordLocalizationDto,
  AdminRouteDto,
  BulkRecordValidationInput,
  BulkRecordValidationResult,
  LocaleAvailability,
  LocaleMode,
  LocalizationContentInput,
  LocalizationPatchInput,
  PrivateRouteDto,
  PublicRecordLocalizationDto,
  PublicRouteDto,
  RecordAggregate,
  RecordAggregateContentInput,
  RecordDeleteImpact,
  RecordDetailDto,
  RecordDtoScope,
  RecordEdgeInput,
  RecordInclude,
  RecordListDto,
  RecordListResult,
  RecordNeutralContentInput,
  RecordNeutralPatchInput,
  RecordPatchInput,
  RecordReviewInput,
  RecordRouteInput,
  RecordSearchCursor,
  RecordSearchQuery,
  RecordSummaryDto,
  RecordValidationIssue,
  RecordValidationResult,
  ReviewLocaleMode,
} from "../../shared/recordApi";
import {
  isDiscipline,
  isDataType,
  isEdgeKind,
  isNodeKind,
  isRecord,
  isRecordDepth,
  isReviewState,
  collectSourceIds,
  normalizeString,
} from "./graphRepositorySupport";

const defaultRecordLimit = 50;
const maxRecordLimit = 100;

const queryFields = new Set([
  "q",
  "countryCode",
  "disciplines",
  "dataFormat",
  "dataStandard",
  "kind",
  "geography",
  "dataType",
  "recordDepth",
  "reviewState",
  "locale",
  "localeMode",
  "localeAvailability",
  "reviewLocale",
  "routeStatus",
  "routeCapability",
  "accessType",
  "accessMethod",
  "include",
  "limit",
  "cursor",
]);
const recordIncludes = new Set<RecordInclude>([
  "localizationSummary",
  "localizations",
  "edges",
  "sources",
  "routes",
  "matchReasons",
  "matchingIds",
  "reviewHistory",
]);
const localeModes = new Set<LocaleMode>([
  "locale_only",
  "locale_with_fallbacks",
  "display_locale",
  "all_locales",
]);
const localeAvailabilityValues = new Set<LocaleAvailability>([
  "available",
  "missing",
  "partial",
  "complete",
]);
const reviewLocaleModes = new Set<ReviewLocaleMode>(["requested", "displayed", "any"]);
const reviewAuditFields = new Set([
  "review",
  "reviewState",
  "reviewerNote",
  "reviewer",
  "reviewDate",
  "contentUpdatedAt",
  "createdAt",
  "updatedAt",
]);

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = message,
  ) {
    super(message);
  }
}

export function encodeRecordCursor(cursor: RecordSearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeRecordCursor(value: string): RecordSearchCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (
      isRecord(parsed) &&
      typeof parsed.title === "string" &&
      typeof parsed.id === "string" &&
      (parsed.score === undefined || (typeof parsed.score === "number" && Number.isFinite(parsed.score) && parsed.score >= 0))
    ) {
      return { title: parsed.title, id: parsed.id, score: parsed.score as number | undefined };
    }
  } catch {
    // handled below
  }

  throw new ApiRequestError(400, "invalid cursor");
}

export function hashJson(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 24);
}

export function readValidateOnly(value: unknown): boolean {
  if (value === undefined) {
    return false;
  }
  if (value === "true" || value === true) {
    return true;
  }
  if (value === "false" || value === false) {
    return false;
  }

  throw new ApiRequestError(400, "validateOnly must be true or false");
}

export function readRecordSearchQuery(input: Record<string, unknown>): RecordSearchQuery {
  assertAllowedFields(input, queryFields, "query");

  const locale = readOptionalEnum(input.locale, isSupportedLocale, "locale") ?? defaultLocale;
  const localeMode =
    readOptionalSetValue(input.localeMode, localeModes, "localeMode") ?? "display_locale";
  const localeAvailability = readOptionalSetValue(
    input.localeAvailability,
    localeAvailabilityValues,
    "localeAvailability",
  );
  const reviewLocale =
    readOptionalSetValue(input.reviewLocale, reviewLocaleModes, "reviewLocale") ?? "displayed";
  const cursorValue = readOptionalString(input.cursor, "cursor");

  return {
    q: readOptionalString(input.q, "q") ?? undefined,
    kind: readList(input.kind, "kind").map((value) =>
      readEnumValue(value, isNodeKind, "kind"),
    ),
    geography: readList(input.geography, "geography"),
    countryCode: readList(input.countryCode, "countryCode"),
    disciplines: readList(input.disciplines, "disciplines").map(value =>
      readEnumValue(value, isDiscipline, "disciplines")),
    dataFormat: readList(input.dataFormat, "dataFormat"),
    dataStandard: readList(input.dataStandard, "dataStandard"),

    dataType: readList(input.dataType, "dataType").map(value => readEnumValue(value, isDataType, "dataType")),
    recordDepth: readList(input.recordDepth, "recordDepth").map((value) =>
      readEnumValue(value, isRecordDepth, "recordDepth"),
    ),
    reviewState: readList(input.reviewState, "reviewState").map((value) =>
      readEnumValue(value, isReviewState, "reviewState"),
    ),
    locale,
    localeMode,
    localeAvailability,
    reviewLocale,
    routeStatus: readList(input.routeStatus, "routeStatus"),
    routeCapability: readList(input.routeCapability, "routeCapability"),
    accessType: readList(input.accessType, "accessType"),
    accessMethod: readList(input.accessMethod, "accessMethod"),
    include: readList(input.include, "include").map((value) =>
      readSetValue(value, recordIncludes, "include"),
    ),
    limit: readLimit(input.limit),
    cursor: cursorValue ? decodeRecordCursor(cursorValue) : undefined,
  };
}

export function readRecordReviewInput(input: unknown): RecordReviewInput {
  const body = readObject(input, "body");
  assertAllowedFields(body, new Set(["locale", "reviewState", "reviewerNote"]), "body");

  const hasReviewState = hasOwn(body, "reviewState");
  const hasReviewerNote = hasOwn(body, "reviewerNote");
  if (!hasReviewState && !hasReviewerNote) {
    throw new ApiRequestError(400, "reviewState or reviewerNote is required");
  }

  return {
    locale: readRequiredEnum(body.locale, isSupportedLocale, "locale"),
    ...(hasReviewState
      ? { reviewState: readRequiredEnum(body.reviewState, isReviewState, "reviewState") }
      : {}),
    ...(hasReviewerNote
      ? { reviewerNote: readNullableString(body.reviewerNote, "reviewerNote") }
      : {}),
  };
}

export function toNodeLocalizationReviewInput(
  input: RecordReviewInput | Omit<RecordReviewInput, "locale">,
): NodeLocalizationReviewInput {
  return {
    ...(hasOwn(input, "reviewState") ? { reviewState: input.reviewState as ReviewState } : {}),
    ...(hasOwn(input, "reviewerNote") ? { reviewerNote: input.reviewerNote ?? null } : {}),
  };
}

export function readRecordAggregateContentInput(
  recordId: string,
  input: unknown,
): RecordAggregateContentInput {
  const body = readObject(input, "body");
  assertAllowedFields(
    body,
    new Set(["id", "record", "localizations", "edges", "routes", "incomplete"]),
    "body",
  );
  if (hasOwn(body, "id") && readRequiredString(body.id, "id") !== recordId) {
    throw new ApiRequestError(400, "body id must match path id");
  }

  const record = readRecordNeutralContentInput(body.record, "record");
  const localizations = hasOwn(body, "localizations")
    ? readLocalizationContentMap(body.localizations, "localizations")
    : undefined;
  const incomplete = hasOwn(body, "incomplete")
    ? readRequiredBoolean(body.incomplete, "incomplete")
    : undefined;

  if (record.recordDepth === "rich" && incomplete === true) {
    throw new ApiRequestError(
      400,
      "incomplete records must use stub or thin recordDepth",
    );
  }

  return {
    ...(hasOwn(body, "id") ? { id: recordId } : {}),
    record,
    ...(localizations ? { localizations } : {}),
    ...(hasOwn(body, "edges") ? { edges: readEdgeInputs(body.edges, recordId, "edges") } : {}),
    ...(hasOwn(body, "routes") ? { routes: readRouteInputs(body.routes, recordId, "routes") } : {}),
    ...(hasOwn(body, "incomplete") ? { incomplete } : {}),
  };
}

export function readRecordPatchInput(recordId: string, input: unknown): RecordPatchInput {
  const body = readObject(input, "body");
  assertAllowedFields(body, new Set(["record", "localizations", "edges", "routes"]), "body");

  if (Object.keys(body).length === 0) {
    throw new ApiRequestError(400, "patch body must include at least one section");
  }

  return {
    ...(hasOwn(body, "record") ? { record: readRecordNeutralPatchInput(body.record, "record") } : {}),
    ...(hasOwn(body, "localizations")
      ? { localizations: readLocalizationPatchMap(body.localizations, "localizations") }
      : {}),
    ...(hasOwn(body, "edges") ? { edges: readEdgePatchSection(body.edges, recordId, "edges") } : {}),
    ...(hasOwn(body, "routes")
      ? { routes: readRoutePatchSection(body.routes, recordId, "routes") }
      : {}),
  };
}

export function readBulkRecordValidationInput(input: unknown): BulkRecordValidationInput {
  const body = readObject(input, "body");
  assertAllowedFields(body, new Set(["validateOnly", "records"]), "body");
  if (body.validateOnly !== true) {
    throw new ApiRequestError(400, "bulk records only supports validateOnly=true");
  }
  if (!Array.isArray(body.records)) {
    throw new ApiRequestError(400, "records must be an array");
  }

  const issues: RecordValidationIssue[] = [];
  const records = body.records.flatMap((record, index) => {
    const id = isRecord(record) && typeof record.id === "string" ? record.id : undefined;
    try {
      if (!id) {
        throw new ApiRequestError(400, "record id is required");
      }
      return [readRecordAggregateContentInput(id, record)];
    } catch (error) {
      issues.push({
        index,
        recordId: id,
        message: error instanceof Error ? error.message : "invalid record",
      });
      return [];
    }
  });

  if (issues.length > 0) {
    throw new ApiRequestError(400, "invalid bulk records", "invalid_bulk_records");
  }

  return {
    validateOnly: true,
    records,
  };
}

export function validateRecordAggregateContentInput(
  recordId: string,
  input: unknown,
): RecordValidationResult {
  try {
    readRecordAggregateContentInput(recordId, input);
    return { valid: true, recordId, issues: [] };
  } catch (error) {
    return {
      valid: false,
      recordId,
      issues: [{ recordId, message: error instanceof Error ? error.message : "invalid record" }],
    };
  }
}

// Validate the merged, stored shape; PUT/PATCH request fragments are not records.
export type RecordQualityInput = RecordAggregateContentInput;

export function validateRecordQuality(id: string, input: RecordQualityInput): RecordValidationResult {
  const issues: RecordValidationIssue[] = [];
  const sourceIssues: RecordValidationIssue[] = [];
  const warnings: string[] = [];
  const rich = input.record.recordDepth === "rich";
  const sources = input.record.sources ?? {};
  const refs = collectSourceIds(input.record.properties);
  const add = (field: string, message: string, evidence = false) => {
    const issue = { recordId: id, path: field, message };
    if (evidence) sourceIssues.push(issue);
    if (rich) issues.push(issue);
  };
  const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
  const object = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
  const array = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(object) : [];
  const requireText = (value: unknown, field: string) => {
    if (!text(value)) add(field, "non-empty text is required");
  };
  const httpUrl = (value: unknown) => {
    try { return text(value) && ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  };
  const date = (value: unknown) => text(value) && /^\d{4}(-\d{2})?(-\d{2})?$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value);
  const citation = (value: unknown, field: string) => {
    if (!text(value)) add(field, "a source ID is required", true);
    else refs.add(value);
  };
  const citedProfile = (value: unknown, field: string) => {
    const ids = object(value).sourceRefs;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(ref => !text(ref))) {
      add(`${field}.sourceRefs`, "profile source references are required", true);
    }
  };
  const p = object(input.record.properties);
  if (input.record.kind !== "country" && input.record.countryCode != null) {
    issues.push({ recordId: id, path: "record.countryCode", message: "countryCode identifies country nodes only; organization and system country affiliations must use evidenced relationships" });
  }
  for (const key of ["role", "disciplineFamily", "geographicScope"]) {
    if (hasOwn(p, key)) issues.push({ recordId: id, path: `record.properties.${key}`, message: "field removed" });
  }
  if (p.disciplines !== undefined && (!Array.isArray(p.disciplines) || p.disciplines.some(value => !isDiscipline(value)) || new Set(p.disciplines).size !== p.disciplines.length)) {
    issues.push({ recordId: id, path: "record.properties.disciplines", message: "must be an array of unique approved discipline IDs; new disciplines require human approval in the authoring chat and an update to the shared vocabulary" });
  }
  const data = object(p.data);
  const descriptors = array(data.descriptors);
  const access = array(p.access);
  const gallery = array(p.gallery);
  const usage = array(p.usage);
  for (const [field, value] of [["access", p.access], ["gallery", p.gallery], ["usage", p.usage], ["data.descriptors", data.descriptors]] as const) {
    if (value != null && (!Array.isArray(value) || value.some(item => !isRecord(item)))) add(`record.properties.${field}`, "must be an array of objects");
  }
  for (const key of ["recordCount", "storageSize"]) {
    if (data[key] != null && !isRecord(data[key])) add(`record.properties.data.${key}`, "must be a metric object or null");
  }
  const metric = (item: Record<string, unknown>, field: string) => {
    for (const key of ["id", "key", "unit"]) requireText(item[key], `${field}.${key}`);
    if (typeof item.value !== "number" || !Number.isFinite(item.value) || item.value < 0) add(`${field}.value`, "a finite non-negative value is required");
    if (!date(item.observedAt)) add(`${field}.observedAt`, "an observation date (YYYY, YYYY-MM, or YYYY-MM-DD) is required", true);
    citation(item.source, `${field}.source`);
  };
  const asset = (value: unknown, field: string) => {
    if (text(value) && value.startsWith("/gallery/")) {
      const root = fileURLToPath(new URL("../../client/public/gallery/", import.meta.url));
      const target = path.resolve(root, value.slice("/gallery/".length));
      if (!target.startsWith(root) || !fs.existsSync(target)) add(field, "gallery asset must exist under client/public/gallery");
    } else if (!httpUrl(value)) add(field, "a usable HTTP(S) URL or local gallery asset is required");
  };

  if (rich && !httpUrl(input.record.url)) add("record.url", "a canonical HTTP(S) URL is required");
  if (input.record.kind === "system") {
    if (!descriptors.some(item => item.category === "format")) add("record.properties.data.descriptors", "at least one format descriptor is required");
    if (!access.some(item => item.type === "read")) add("record.properties.access", "at least one actual read access path is required");
    if (!input.edges?.some(edge => edge.kind === "operates" && edge.targetNodeId === id)) add("edges", "an incoming operates relationship is required");
  }
  const assignedDataTypes = new Set<unknown>();
  descriptors.forEach((item, i) => {
    if (item.category === "type") {
      if (!isDataType(item.label) || assignedDataTypes.has(item.label)) {
        issues.push({ recordId: id, path: `record.properties.data.descriptors[${i}].label`, message: "must be a unique approved data type ID; additions require human approval in the authoring chat and an update to the shared vocabulary" });
      }
      assignedDataTypes.add(item.label);
    }
    requireText(item.label, `record.properties.data.descriptors[${i}].label`);
    if (!["type", "format", "standard"].includes(String(item.category))) add(`record.properties.data.descriptors[${i}].category`, "invalid descriptor category");
    citation(item.source, `record.properties.data.descriptors[${i}].source`);
  });
  access.forEach((item, i) => {
    const field = `record.properties.access[${i}]`;
    if (!["read", "submit", "partner_sync"].includes(String(item.type))) add(`${field}.type`, "invalid access type");
    if (!text(item.method) || !/^[a-z][a-z0-9_]*$/.test(item.method)) add(`${field}.method`, "a lower_snake_case method is required");
    if (!httpUrl(item.url)) add(`${field}.url`, "an HTTP(S) URL is required");
    citation(item.source, `${field}.source`);
  });
  gallery.forEach((item, i) => {
    const field = `record.properties.gallery[${i}]`;
    if (!["image", "embed"].includes(String(item.type))) add(`${field}.type`, "invalid gallery type");
    asset(item.url, `${field}.url`);
    if (item.type === "image" || item.thumbnailUrl != null) asset(item.thumbnailUrl, `${field}.thumbnailUrl`);
    citation(item.source, `${field}.source`);
  });
  for (const key of ["recordCount", "storageSize"]) {
    if (data[key] != null) metric(object(data[key]), `record.properties.data.${key}`);
  }
  if (data.storageSize != null && object(data.storageSize).unit !== "bytes") add("record.properties.data.storageSize.unit", "storage size must be stored in bytes");
  usage.forEach((item, i) => metric(item, `record.properties.usage[${i}]`));

  const locales = rich ? supportedLocales : Object.keys(input.localizations ?? {}) as SupportedLocale[];
  for (const locale of locales) {
    const l = input.localizations?.[locale];
    const field = `localizations.${locale}`;
    if (!l) { add(field, "a complete localization is required"); continue; }
    requireText(l.title, `${field}.title`);
    if (input.record.kind === "system") {
      requireText(l.summary, `${field}.summary`);
      requireText(l.description, `${field}.description`);
    }
    if (l.translatedFromLocale === locale || (l.translatedFromLocale && !input.localizations?.[l.translatedFromLocale])) add(`${field}.translatedFromLocale`, "must refer to a different existing localization");
    const details = object(l.details);
    for (const key of ["role", "disciplineFamily", "geographicScope", "disciplines"]) {
      if (hasOwn(details, key)) issues.push({ recordId: id, path: `${field}.details.${key}`, message: "field removed or misplaced; disciplines belong in record.properties.disciplines" });
    }
    collectSourceIds(details, refs);
    citedProfile(details.profile, `${field}.details.profile`);
    const relationshipReview = object(details.relationshipReview);
    if (rich || details.relationshipReview != null) {
      citedProfile(relationshipReview, `${field}.details.relationshipReview`);
      for (const kind of edgeKinds) {
        requireText(object(relationshipReview.findings)[kind], `${field}.details.relationshipReview.findings.${kind}`);
      }
      for (const kind of Object.keys(object(relationshipReview.findings))) {
        if (!edgeKinds.includes(kind as typeof edgeKinds[number])) issues.push({ recordId: id, path: `${field}.details.relationshipReview.findings.${kind}`, message: "unknown relationship type" });
      }
    }
    const localizedData = object(details.data);
    const sections: [string, Record<string, unknown>[], unknown, string[]][] = [
      ["data.descriptors", descriptors, localizedData.descriptors, ["label", "description"]],
      ["access", access, details.access, ["label", "description"]],
      ["gallery", gallery, details.gallery, ["title", "caption"]],
      ["usage", usage, details.usage, ["description"]],
    ];
    for (const [section, neutral, localized, fields] of sections) {
      const rows = array(localized);
      const ids = new Set(neutral.map(item => item.id));
      if (ids.size !== neutral.length || neutral.some(item => !text(item.id))) add(`record.properties.${section}`, "item IDs must be present and unique");
      if (rows.length !== neutral.length || new Set(rows.map(item => item.id)).size !== rows.length || rows.some(item => !ids.has(item.id))) add(`${field}.details.${section}`, "localized item IDs must exactly match neutral item IDs");
      for (const item of neutral) {
        const translated = rows.find(row => row.id === item.id) ?? {};
        for (const key of fields) {
          if (section === "data.descriptors" && item.category === "type" && key === "label") {
            if (translated.label != null) issues.push({ recordId: id, path: `${field}.details.${section}.${item.id}.label`, message: "data type labels come from the shared vocabulary; use description for record-specific detail" });
          } else requireText(translated[key], `${field}.details.${section}.${item.id}.${key}`);
        }
      }
    }
    for (const key of ["recordCount", "storageSize"]) {
      if (data[key] != null) {
        const translated = object(localizedData[key]);
        if (translated.id !== object(data[key]).id) add(`${field}.details.data.${key}.id`, "must match the neutral metric ID");
        requireText(translated.description, `${field}.details.data.${key}.description`);
      } else if (localizedData[key] != null) add(`${field}.details.data.${key}`, "localized metric has no neutral metric");
    }
    if (input.record.kind === "system") {
      for (const [key, present] of [["recordCount", data.recordCount != null], ["storageSize", data.storageSize != null], ["usage", usage.length > 0], ["standards", descriptors.some(item => item.category === "standard")]] as const) {
        if (!present && !text(object(details.researchGaps)[key])) add(`${field}.details.researchGaps.${key}`, "document the research gap when this information is unavailable");
      }
    }
  }
  for (const edge of input.edges ?? []) {
    if (!isEdgeKind(edge.kind)) issues.push({ recordId: id, path: `edges.${edge.id}.kind`, message: "unknown or retired relationship type" });
    if (collectSourceIds(edge.properties).size === 0) add(`edges.${edge.id}.properties.sourceRefs`, "relationship evidence is required", true);
  }
  for (const route of input.routes ?? []) {
    collectSourceIds(route.properties, refs);
    if (collectSourceIds(route.properties).size === 0) add(`routes.${route.id}.properties.sourceRefs`, "route evidence is required", true);
    if (!["active", "planned", "deprecated", "blocked"].includes(route.status)) add(`routes.${route.id}.status`, "invalid route status");
    if (route.status === "active") {
      requireText(route.target, `routes.${route.id}.target`);
      if (!route.capabilities?.length) add(`routes.${route.id}.capabilities`, "active routes require capabilities");
      requireText(route.contractRef, `routes.${route.id}.contractRef`);
    }
    if (route.contractRef && !httpUrl(route.contractRef)) {
      const root = fileURLToPath(new URL("../../documentation/contracts/", import.meta.url));
      const target = path.resolve(root, route.contractRef.replace(/^documentation\/contracts\//, ""));
      if (!route.contractRef.startsWith("documentation/contracts/") || !target.startsWith(root) || !fs.existsSync(target)) add(`routes.${route.id}.contractRef`, "local contracts must resolve under documentation/contracts");
    }
  }
  let referencedSources = 0;
  let resolvedSources = 0;
  const validateSources = (collection: SourceCollection, content: unknown, field: string) => {
    try {
      readSourceCollection(collection, field);
      readJsonObject({ content }, field);
    } catch (error) {
      const issue = { recordId: id, path: field, message: error instanceof Error ? error.message : "invalid sources" };
      issues.push(issue); sourceIssues.push(issue);
      return;
    }
    for (const source of Object.values(collection)) for (const locale of locales) {
      if (!text(source.title[locale])) {
        const issue = { recordId: id, path: `${field}.${source.id}.title.${locale}`, message: "source title is required for this localization" };
        issues.push(issue); sourceIssues.push(issue);
      }
    }
    for (const ref of collectSourceIds(content)) {
      referencedSources++;
      if (hasOwn(collection, ref)) resolvedSources++;
      else {
        const issue = { recordId: id, path: `${field}.${ref}`, message: "referenced source does not exist on its owner" };
        issues.push(issue); sourceIssues.push(issue);
      }
    }
  };
  validateSources(sources, [input.record.properties, input.localizations, input.routes], "record.sources");
  for (const edge of input.edges ?? []) validateSources(edge.sources ?? {}, edge.properties, `edges.${edge.id}.sources`);
  if (rich && input.record.kind === "system") {
    if (!gallery.length) warnings.push("No gallery: acceptable when no useful, accessible capture is available.");
    if (!input.routes?.length) warnings.push("No approved machine route is recorded.");
    if (Object.values(input.localizations ?? {}).some(l => Object.keys(l?.details?.researchGaps ?? {}).length)) warnings.push("Documented research gaps remain; omitted values have not been invented.");
  }
  return {
    valid: issues.length === 0, recordId: id, issues, warnings,
    sourceCompleteness: {
      status: referencedSources === 0 ? "missing" : sourceIssues.length ? "partial" : "complete",
      referencedSources,
      resolvedSources,
      issues: sourceIssues,
    },
  };
}

export function validateBulkRecordPayload(input: BulkRecordValidationInput): BulkRecordValidationResult {
  return {
    valid: true,
    issues: [],
    checkedRecords: input.records.length,
  };
}

export function toRecordListDto(
  { records, nextCursor, total, matchingIds }: RecordListResult,
  scope: RecordDtoScope,
  include: RecordInclude[],
  locale: SupportedLocale,
): RecordListDto {
  const expanded = include.some((item) =>
    item === "localizations" ||
    item === "edges" ||
    item === "sources" ||
    item === "reviewHistory" ||
    item === "routes",
  );

  return {
    records: records.map((record) =>
      expanded
        ? toRecordDetailDto(record, scope, include, locale)
        : toRecordSummaryDto(record, include, locale),
    ),
    nextCursor,
    total,
    ...(matchingIds ? { matchingIds } : {}),
  };
}

export function toRecordDetailDto(
  aggregate: RecordAggregate,
  scope: RecordDtoScope,
  include: RecordInclude[],
  locale: SupportedLocale,
): RecordDetailDto {
  const node = aggregate.node;
  const includeSet = new Set(include);

  return {
    ...toRecordSummaryDto(aggregate, include, locale),
    ...(includeSet.has("sources") ? { sourceCompleteness: validateRecordQuality(node.id, recordContent(aggregate)).sourceCompleteness } : {}),
    record: {
      id: node.id,
      kind: node.kind,
      countryCode: node.countryCode,
      url: node.url,
      recordDepth: node.recordDepth,
      ...(includeSet.has("sources") ? { sources: node.sources } : {}),
      ...(scope === "private" ? { properties: node.properties } : {}),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    },
    ...((includeSet.has("localizations") || includeSet.has("reviewHistory"))
      ? { localizations: mapLocalizations(node.localizations, scope, includeSet.has("reviewHistory")) }
      : {}),
    ...(includeSet.has("edges") ? { edges: aggregate.edges.map(mapEdgeDto) } : {}),
    ...(includeSet.has("routes")
      ? { routes: aggregate.routes.map((route) => mapRouteDto(route, scope)) }
      : {}),
  };
}

export function recordContent(aggregate: RecordAggregate): RecordQualityInput {
  return {
    id: aggregate.node.id,
    record: aggregate.node,
    localizations: aggregate.node.localizations,
    edges: aggregate.edges,
    routes: aggregate.routes,
  };
}

export function toDefaultRecordDetailDto(
  aggregate: RecordAggregate,
  scope: RecordDtoScope,
  include: RecordInclude[],
  locale: SupportedLocale,
): RecordDetailDto {
  const defaultIncludes: RecordInclude[] = ["localizations", "edges", "sources", "routes"];
  return toRecordDetailDto(
    aggregate,
    scope,
    [...new Set([...defaultIncludes, ...include])],
    locale,
  );
}

export function toRecordSummaryDto(
  aggregate: RecordAggregate,
  include: RecordInclude[],
  locale: SupportedLocale,
): RecordSummaryDto {
  const node = aggregate.node;
  const localization = resolveNodeLocalization(node, locale);
  const recordUpdatedAt = buildRecordUpdatedAt(aggregate);
  const reviewStatesByLocale = Object.fromEntries(
    Object.entries(node.localizations).map(([key, value]) => [
      key,
      value?.review.state,
    ]),
  ) as RecordSummaryDto["reviewStatesByLocale"];

  return {
    id: node.id,
    kind: node.kind,
    countryCode: node.countryCode,
    url: node.url,
    recordDepth: node.recordDepth,
    title: localization.title,
    summary: localization.summary,
    availableLocales: node.availableLocales,
    missingLocales: supportedLocales.filter((candidate) => !node.availableLocales.includes(candidate)),
    reviewStatesByLocale,
    requestedLocale: localization.requestedLocale,
    displayLocale: localization.displayLocale,
    isLocaleFallback: localization.isLocaleFallback,
    updatedAt: node.updatedAt,
    recordUpdatedAt,
    ...(aggregate.score !== undefined ? { score: aggregate.score, matchedLocale: aggregate.matchedLocale } : {}),
    ...(include.includes("matchReasons") ? { matchReasons: aggregate.matchReasons } : {}),
  };
}

export function buildRecordUpdatedAt(aggregate: RecordAggregate): string {
  return [
    aggregate.node.updatedAt,
    ...Object.values(aggregate.node.localizations)
      .map((localization) => localization?.updatedAt)
      .filter((value): value is string => Boolean(value)),
    ...aggregate.edges.map((edge) => edge.updatedAt),
    ...aggregate.routes.map((route) => route.updatedAt),
  ].sort().at(-1) ?? aggregate.node.updatedAt;
}

export function buildDeleteImpactHash(input: Omit<RecordDeleteImpact, "impactHash">): string {
  return hashJson(input);
}

function mapLocalizations(
  localizations: GraphNode["localizations"],
  scope: RecordDtoScope,
  includeHistory: boolean,
): RecordDetailDto["localizations"] {
  return Object.fromEntries(
    Object.entries(localizations).map(([locale, localization]) => [
      locale,
      localization ? mapLocalizationDto(localization, scope, includeHistory) : localization,
    ]),
  ) as RecordDetailDto["localizations"];
}

function mapLocalizationDto(
  localization: NodeLocalization,
  scope: RecordDtoScope,
  includeHistory: boolean,
): PublicRecordLocalizationDto | AdminRecordLocalizationDto | NodeLocalization {
  const { history, ...current } = localization.review;
  if (scope !== "public") {
    return { ...localization, review: { ...current, ...(includeHistory ? { history: history ?? [] } : {}) } };
  }

  return {
    locale: localization.locale,
    title: localization.title,
    summary: localization.summary,
    description: localization.description,
    details: localization.details,
    translatedFromLocale: localization.translatedFromLocale,
    contentUpdatedAt: localization.contentUpdatedAt,
    review: {
      state: current.state,
      date: current.date,
      ...(includeHistory ? { history: (history ?? []).map(({ state, date }) => ({ state, date })) } : {}),
    },
    createdAt: localization.createdAt,
    updatedAt: localization.updatedAt,
  };
}

function mapRouteDto(route: RyuRoute, scope: RecordDtoScope): PublicRouteDto | AdminRouteDto | PrivateRouteDto {
  if (scope === "private") {
    return route;
  }

  const publicRoute: PublicRouteDto = {
    id: route.id,
    nodeId: route.nodeId,
    status: route.status,
    mode: route.mode,
    priority: route.priority,
    capabilities: route.capabilities,
    format: route.format,
    contractRef: route.contractRef,
    caveat: route.caveat,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
  };

  if (scope === "public") {
    return publicRoute;
  }

  return {
    ...publicRoute,
    target: route.target,
    upstream: route.upstream,
  };
}

function mapEdgeDto(edge: GraphEdge): GraphEdge {
  return {
    id: edge.id,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    kind: edge.kind,
    note: edge.note,
    properties: edge.properties,
    sources: edge.sources,
    createdAt: edge.createdAt,
    updatedAt: edge.updatedAt,
  };
}

function readRecordNeutralContentInput(input: unknown, path: string): RecordNeutralContentInput {
  const body = readObject(input, path);
  assertAllowedFields(body, new Set(["kind", "countryCode", "url", "recordDepth", "properties", "sources"]), path);

  return {
    kind: readRequiredEnum(body.kind, isNodeKind, `${path}.kind`),
    countryCode: hasOwn(body, "countryCode") ? readNullableCountryCode(body.countryCode, `${path}.countryCode`) : undefined,
    url: hasOwn(body, "url") ? readNullableString(body.url, `${path}.url`) : undefined,
    recordDepth: hasOwn(body, "recordDepth")
      ? readRequiredEnum(body.recordDepth, isRecordDepth, `${path}.recordDepth`)
      : undefined,
    properties: hasOwn(body, "properties") ? readJsonObject(body.properties, `${path}.properties`) : undefined,
    sources: hasOwn(body, "sources") ? readSourceCollection(body.sources, `${path}.sources`) : undefined,
  };
}

function readRecordNeutralPatchInput(input: unknown, path: string): RecordNeutralPatchInput {
  const body = readObject(input, path);
  assertAllowedFields(
    body,
    new Set(["kind", "countryCode", "url", "recordDepth", "propertiesReplace", "sourcesReplace"]),
    path,
  );
  if (Object.keys(body).length === 0) {
    throw new ApiRequestError(400, `${path} must include at least one field`);
  }

  return {
    kind: hasOwn(body, "kind") ? readRequiredEnum(body.kind, isNodeKind, `${path}.kind`) : undefined,
    countryCode: hasOwn(body, "countryCode") ? readNullableCountryCode(body.countryCode, `${path}.countryCode`) : undefined,
    url: hasOwn(body, "url") ? readNullableString(body.url, `${path}.url`) : undefined,
    recordDepth: hasOwn(body, "recordDepth")
      ? readRequiredEnum(body.recordDepth, isRecordDepth, `${path}.recordDepth`)
      : undefined,
    sourcesReplace: hasOwn(body, "sourcesReplace") ? readSourceCollection(body.sourcesReplace, `${path}.sourcesReplace`) : undefined,
    propertiesReplace: hasOwn(body, "propertiesReplace")
      ? readJsonObject(body.propertiesReplace, `${path}.propertiesReplace`)
      : undefined,
  };
}

function readLocalizationContentMap(input: unknown, path: string): RecordAggregateContentInput["localizations"] {
  const body = readObject(input, path);
  const localizations: RecordAggregateContentInput["localizations"] = {};
  for (const [locale, value] of Object.entries(body)) {
    if (!isSupportedLocale(locale)) {
      throw new ApiRequestError(400, `unsupported locale: ${locale}`);
    }
    localizations[locale] = readLocalizationContentInput(value, `${path}.${locale}`);
  }

  return localizations;
}

function readLocalizationPatchMap(input: unknown, path: string): RecordPatchInput["localizations"] {
  const body = readObject(input, path);
  const localizations: RecordPatchInput["localizations"] = {};
  for (const [locale, value] of Object.entries(body)) {
    if (!isSupportedLocale(locale)) {
      throw new ApiRequestError(400, `unsupported locale: ${locale}`);
    }
    localizations[locale] = readLocalizationPatchInput(value, `${path}.${locale}`);
  }

  return localizations;
}

function readLocalizationContentInput(input: unknown, path: string): LocalizationContentInput {
  const body = readObject(input, path);
  assertNoReviewAuditFields(body, path);
  assertAllowedFields(
    body,
    new Set(["title", "summary", "description", "details", "translatedFromLocale"]),
    path,
  );

  return {
    title: readRequiredString(body.title, `${path}.title`),
    summary: hasOwn(body, "summary") ? readNullableString(body.summary, `${path}.summary`) : undefined,
    description: hasOwn(body, "description")
      ? readNullableString(body.description, `${path}.description`)
      : undefined,
    details: hasOwn(body, "details")
      ? readJsonObject(body.details, `${path}.details`) as NodeLocalizationDetails
      : undefined,
    translatedFromLocale: hasOwn(body, "translatedFromLocale")
      ? readOptionalEnum(body.translatedFromLocale, isSupportedLocale, `${path}.translatedFromLocale`) ?? null
      : undefined,
  };
}

function readLocalizationPatchInput(input: unknown, path: string): LocalizationPatchInput {
  const body = readObject(input, path);
  assertNoReviewAuditFields(body, path);
  const mode = readRequiredSetValue(
    body.mode,
    new Set<"patch" | "replace">(["patch", "replace"]),
    `${path}.mode`,
  );
  if (mode === "replace") {
    assertAllowedFields(
      body,
      new Set(["mode", "title", "summary", "description", "details", "translatedFromLocale"]),
      path,
    );
    const content = readLocalizationContentInput(
      Object.fromEntries(Object.entries(body).filter(([key]) => key !== "mode")),
      path,
    );
    return { mode, ...content };
  }

  assertAllowedFields(
    body,
    new Set(["mode", "title", "summary", "description", "detailsReplace", "translatedFromLocale"]),
    path,
  );
  if (Object.keys(body).length === 1) {
    throw new ApiRequestError(400, `${path} must include at least one content field`);
  }

  return {
    mode,
    title: hasOwn(body, "title") ? readRequiredString(body.title, `${path}.title`) : undefined,
    summary: hasOwn(body, "summary") ? readNullableString(body.summary, `${path}.summary`) : undefined,
    description: hasOwn(body, "description")
      ? readNullableString(body.description, `${path}.description`)
      : undefined,
    detailsReplace: hasOwn(body, "detailsReplace")
      ? readJsonObject(body.detailsReplace, `${path}.detailsReplace`) as NodeLocalizationDetails
      : undefined,
    translatedFromLocale: hasOwn(body, "translatedFromLocale")
      ? readOptionalEnum(body.translatedFromLocale, isSupportedLocale, `${path}.translatedFromLocale`) ?? null
      : undefined,
  };
}

function readEdgePatchSection(input: unknown, recordId: string, path: string): NonNullable<RecordPatchInput["edges"]> {
  const body = readObject(input, path);
  assertAllowedFields(body, new Set(["upsert", "delete"]), path);
  return {
    upsert: hasOwn(body, "upsert") ? readEdgeInputs(body.upsert, recordId, `${path}.upsert`) : undefined,
    delete: hasOwn(body, "delete") ? readIdList(body.delete, `${path}.delete`) : undefined,
  };
}

function readRoutePatchSection(input: unknown, recordId: string, path: string): NonNullable<RecordPatchInput["routes"]> {
  const body = readObject(input, path);
  assertAllowedFields(body, new Set(["upsert", "delete"]), path);
  return {
    upsert: hasOwn(body, "upsert") ? readRouteInputs(body.upsert, recordId, `${path}.upsert`) : undefined,
    delete: hasOwn(body, "delete") ? readIdList(body.delete, `${path}.delete`) : undefined,
  };
}

function readEdgeInputs(input: unknown, recordId: string, path: string): RecordEdgeInput[] {
  if (!Array.isArray(input)) {
    throw new ApiRequestError(400, `${path} must be an array`);
  }

  return input.map((item, index) => readEdgeInput(item, recordId, `${path}[${index}]`));
}

function readEdgeInput(input: unknown, recordId: string, path: string): RecordEdgeInput {
  const body = readObject(input, path);
  assertAllowedFields(body, new Set(["id", "sourceNodeId", "targetNodeId", "kind", "note", "properties", "sources"]), path);
  const edge = {
    id: readRequiredId(body.id, `${path}.id`),
    sourceNodeId: readRequiredId(body.sourceNodeId, `${path}.sourceNodeId`),
    targetNodeId: readRequiredId(body.targetNodeId, `${path}.targetNodeId`),
    kind: readRequiredEnum(body.kind, isEdgeKind, `${path}.kind`),
    note: hasOwn(body, "note") ? readNullableString(body.note, `${path}.note`) : undefined,
    properties: hasOwn(body, "properties") ? readJsonObject(body.properties, `${path}.properties`) : undefined,
    sources: hasOwn(body, "sources") ? readSourceCollection(body.sources, `${path}.sources`) : undefined,
  };

  if (edge.sourceNodeId !== recordId && edge.targetNodeId !== recordId) {
    throw new ApiRequestError(400, `${path} must be incident to ${recordId}`);
  }

  return edge;
}

function readSourceCollection(input: unknown, path: string): SourceCollection {
  const collection = readObject(input, path);
  for (const [key, value] of Object.entries(collection)) {
    const field = `${path}.${key}`;
    const source = readObject(value, field);
    assertAllowedFields(source, new Set(["id", "url", "title", "accessedAt"]), field);
    if (readRequiredId(source.id, `${field}.id`) !== key || source.id !== key) throw new ApiRequestError(400, `${field}.id must match its object key`);
    const url = readRequiredString(source.url, `${field}.url`);
    try {
      if (url !== source.url || !/^https?:\/\/[^\s/?#]+[^\s]*$/.test(url) || !new URL(url).hostname) throw new Error();
    } catch { throw new ApiRequestError(400, `${field}.url must be an absolute HTTP(S) URL`); }
    const date = readRequiredString(source.accessedAt, `${field}.accessedAt`);
    if (date !== source.accessedAt || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date.startsWith("0000")) {
      throw new ApiRequestError(400, `${field}.accessedAt must be a valid YYYY-MM-DD date`);
    }
    const title = readObject(source.title, `${field}.title`);
    if (!Object.keys(title).length) throw new ApiRequestError(400, `${field}.title requires at least one translation`);
    for (const [locale, text] of Object.entries(title)) {
      if (!isSupportedLocale(locale)) throw new ApiRequestError(400, `${field}.title: unsupported locale ${locale}`);
      readRequiredString(text, `${field}.title.${locale}`);
    }
  }
  return collection as SourceCollection;
}

function readRouteInputs(input: unknown, recordId: string, path: string): RecordRouteInput[] {
  if (!Array.isArray(input)) {
    throw new ApiRequestError(400, `${path} must be an array`);
  }

  return input.map((item, index) => {
    const body = readObject(item, `${path}[${index}]`);
    assertAllowedFields(
      body,
      new Set([
        "id",
        "nodeId",
        "status",
        "mode",
        "priority",
        "capabilities",
        "target",
        "upstream",
        "format",
        "contractRef",
        "caveat",
        "properties",
      ]),
      `${path}[${index}]`,
    );
    const nodeId = hasOwn(body, "nodeId")
      ? readRequiredId(body.nodeId, `${path}[${index}].nodeId`)
      : recordId;
    if (nodeId !== recordId) {
      throw new ApiRequestError(400, `${path}[${index}].nodeId must match path id`);
    }

    return {
      id: readRequiredId(body.id, `${path}[${index}].id`),
      nodeId,
      status: readRequiredString(body.status, `${path}[${index}].status`),
      mode: readRequiredString(body.mode, `${path}[${index}].mode`),
      priority: hasOwn(body, "priority")
        ? readRequiredInteger(body.priority, `${path}[${index}].priority`)
        : undefined,
      capabilities: hasOwn(body, "capabilities")
        ? readStringArray(body.capabilities, `${path}[${index}].capabilities`)
        : undefined,
      target: hasOwn(body, "target") ? readNullableString(body.target, `${path}[${index}].target`) : undefined,
      upstream: hasOwn(body, "upstream")
        ? readNullableString(body.upstream, `${path}[${index}].upstream`)
        : undefined,
      format: hasOwn(body, "format") ? readNullableString(body.format, `${path}[${index}].format`) : undefined,
      contractRef: hasOwn(body, "contractRef")
        ? readNullableString(body.contractRef, `${path}[${index}].contractRef`)
        : undefined,
      caveat: hasOwn(body, "caveat") ? readNullableString(body.caveat, `${path}[${index}].caveat`) : undefined,
      properties: hasOwn(body, "properties")
        ? readJsonObject(body.properties, `${path}[${index}].properties`)
        : undefined,
    };
  });
}

function readIdList(input: unknown, path: string): string[] {
  if (!Array.isArray(input)) {
    throw new ApiRequestError(400, `${path} must be an array`);
  }

  return input.map((item, index) => readRequiredId(item, `${path}[${index}]`));
}

function readObject(input: unknown, path: string): Record<string, unknown> {
  if (!isRecord(input)) {
    throw new ApiRequestError(400, `${path} must be an object`);
  }

  return input;
}

function assertAllowedFields(input: Record<string, unknown>, allowed: Set<string>, path: string) {
  const unsupported = Object.keys(input).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new ApiRequestError(400, `unsupported ${path} fields: ${unsupported.join(", ")}`);
  }
}

function assertNoReviewAuditFields(input: Record<string, unknown>, path: string) {
  const unsupported = Object.keys(input).filter((key) => reviewAuditFields.has(key));
  if (unsupported.length > 0) {
    throw new ApiRequestError(400, `review/audit fields are not allowed in ${path}: ${unsupported.join(", ")}`);
  }
}

function hasOwn(input: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function readList(value: unknown, path: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => readList(item, path));
  }
  if (typeof value !== "string") {
    throw new ApiRequestError(400, `${path} must be a string`);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readLimit(value: unknown): number {
  if (value === undefined) {
    return defaultRecordLimit;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : raw;
  if (!Number.isInteger(parsed) || Number(parsed) <= 0) {
    throw new ApiRequestError(400, "limit must be a positive integer");
  }

  return Math.min(Number(parsed), maxRecordLimit);
}

function readOptionalString(value: unknown, path: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new ApiRequestError(400, `${path} must be a single string`);
    }
    return readOptionalString(value[0], path);
  }
  if (typeof value !== "string") {
    throw new ApiRequestError(400, `${path} must be a string`);
  }

  return normalizeString(value);
}

function readRequiredString(value: unknown, path: string): string {
  const normalized = readOptionalString(value, path);
  if (!normalized) {
    throw new ApiRequestError(400, `${path} is required`);
  }

  return normalized;
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return readRequiredString(value, path);
}

function readNullableCountryCode(value: unknown, path: string): string | null {
  const code = readNullableString(value, path);
  if (code !== null && code.length !== 3) {
    throw new ApiRequestError(400, `${path} must be a 3-character country code`);
  }

  return code;
}

function readRequiredId(value: unknown, path: string): string {
  const id = readRequiredString(value, path);
  if (!/^[a-z0-9][a-z0-9._:-]*$/.test(id)) {
    throw new ApiRequestError(400, `${path} must be a deterministic slug id`);
  }

  return id;
}

function readJsonObject(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ApiRequestError(400, `${path} must be a JSON object`);
  }

  const checkSourceRefs = (item: unknown, itemPath: string) => {
    if (Array.isArray(item)) item.forEach((child, index) => checkSourceRefs(child, `${itemPath}[${index}]`));
    else if (isRecord(item)) for (const [key, child] of Object.entries(item)) {
      const field = `${itemPath}.${key}`;
      if (key === "sources") throw new ApiRequestError(400, `${field}: sources belong in the dedicated owner field`);
      if (key === "source" && child !== null) readRequiredId(child, field);
      else if (key === "sourceRefs") readIdList(child, field);
      else checkSourceRefs(child, field);
    }
  };
  checkSourceRefs(value, path);
  return value;
}

function readStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new ApiRequestError(400, `${path} must be an array`);
  }

  return value.map((item, index) => readRequiredString(item, `${path}[${index}]`));
}

function readRequiredInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value)) {
    throw new ApiRequestError(400, `${path} must be an integer`);
  }

  return Number(value);
}

function readRequiredBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new ApiRequestError(400, `${path} must be a boolean`);
  }

  return value;
}

function readEnumValue<T extends string>(
  value: string,
  predicate: (value: unknown) => value is T,
  path: string,
): T {
  if (!predicate(value)) {
    throw new ApiRequestError(400, `invalid ${path}`);
  }

  return value;
}

function readRequiredEnum<T extends string>(
  value: unknown,
  predicate: (value: unknown) => value is T,
  path: string,
): T {
  if (!predicate(value)) {
    throw new ApiRequestError(400, `invalid ${path}`);
  }

  return value;
}

function readOptionalEnum<T extends string>(
  value: unknown,
  predicate: (value: unknown) => value is T,
  path: string,
): T | null {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = readRequiredString(value, path);
  return readRequiredEnum(normalized, predicate, path);
}

function readSetValue<T extends string>(value: string, allowed: Set<T>, path: string): T {
  if (!allowed.has(value as T)) {
    throw new ApiRequestError(400, `invalid ${path}`);
  }

  return value as T;
}

function readRequiredSetValue<T extends string>(
  value: unknown,
  allowed: Set<T>,
  path: string,
): T {
  const normalized = readRequiredString(value, path);
  return readSetValue(normalized, allowed, path);
}

function readOptionalSetValue<T extends string>(
  value: unknown,
  allowed: Set<T>,
  path: string,
): T | undefined {
  const normalized = readOptionalString(value, path);
  return normalized ? readSetValue(normalized, allowed, path) : undefined;
}
