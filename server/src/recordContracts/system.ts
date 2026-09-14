import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accessCosts, accessRequirements, isAccessUrl, isReadAccessMethod, isWriteAccessMethod, isSystemMetricKey, metricDefinitions, metricPeriods } from "../../../shared/domain";
import { supportedLocales } from "../../../shared/localization";
import type { SupportedLocale } from "../../../shared/domain";
import type { RecordValidationIssue } from "../../../shared/recordApi";
import type { RecordQualityInput, AddValidationIssue } from "../recordContracts";
import { isRecord, isDiscipline, isDataType, isDataFormat, isDataStandard, collectSourceIds } from "../graphRepositorySupport";

export function validateSystemStructure(id: string, input: RecordQualityInput): RecordValidationIssue[] {
  if (input.record.kind !== "system") return [];
  const issues: RecordValidationIssue[] = [];
  const issue = (path: string, message: string) => issues.push({ recordId: id, path, message });
  const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const slug = (value: unknown) => typeof value === "string" && /^[a-z0-9][a-z0-9._:-]*$/.test(value);
  const closed = (value: unknown, path: string, fields: string[], required = fields) => {
    if (!isRecord(value)) { issue(path, "must be an object"); return {}; }
    for (const key of Object.keys(value)) if (!fields.includes(key)) issue(`${path}.${key}`, "unknown system record field");
    for (const key of required) if (!Object.hasOwn(value, key)) issue(`${path}.${key}`, "field is required");
    return value;
  };
  const strings = (value: unknown, path: string, ids = false) => {
    if (!Array.isArray(value) || value.some(item => !(ids ? slug(item) : text(item))) || new Set(value).size !== value.length) {
      issue(path, ids ? "must be an array of unique source IDs" : "must be an array of unique non-empty strings");
    }
  };
  const rows = (value: unknown, path: string, fields: string[], required = fields) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) { issue(path, "must be an array of objects"); return []; }
    const ids = new Set<unknown>();
    return value.map((item, index) => {
      const field = `${path}[${index}]`;
      const row = closed(item, field, fields, required);
      if (!slug(row.id) || ids.has(row.id)) issue(`${field}.id`, "item IDs must be deterministic slugs and unique within the section");
      ids.add(row.id);
      return row;
    });
  };
  const rich = input.record.recordDepth === "rich";
  const keys = ["disciplines", "data", "access", "gallery", "metrics"];
  const p = closed(input.record.properties === undefined ? {} : input.record.properties, "record.properties", keys, rich ? keys : []);
  if (p.disciplines !== undefined && (!Array.isArray(p.disciplines) || p.disciplines.some(value => !isDiscipline(value)) || new Set(p.disciplines).size !== p.disciplines.length)) issue("record.properties.disciplines", "must be an array of unique approved discipline IDs");
  const data = p.data === undefined ? {} : closed(p.data, "record.properties.data", ["descriptors"]);
  rows(data.descriptors, "record.properties.data.descriptors", ["id", "category", "label", "source"]).forEach((row, i) => {
    const field = `record.properties.data.descriptors[${i}]`;
    if (!["type", "format", "standard"].some(category => category === row.category)) issue(`${field}.category`, "invalid descriptor category");
    if (!(row.category === "type" ? isDataType(row.label) : row.category === "format" ? isDataFormat(row.label) : isDataStandard(row.label))) issue(`${field}.label`, "an approved vocabulary ID is required");
    if (row.source !== null && !slug(row.source)) issue(`${field}.source`, "must be a source ID or null while research is incomplete");
  });
  rows(p.access, "record.properties.access", ["id", "type", "methods", "url", "requirements", "cost", "sourceRefs"]);
  rows(p.metrics, "record.properties.metrics", ["id", "key", "value", "observedAt", "period", "source"], ["id", "key", "value", "observedAt", "source"]).forEach((row, index) => {
    const field = `record.properties.metrics[${index}]`;
    if (!isSystemMetricKey(row.key)) issue(`${field}.key`, "must be an approved system metric key");
    if (typeof row.value !== "number" || !Number.isFinite(row.value) || row.value < 0 || row.value > Number.MAX_SAFE_INTEGER) issue(`${field}.value`, "a finite non-negative safe numeric value is required");
    if (!slug(row.source)) issue(`${field}.source`, "a source ID is required");
    if (row.observedAt !== null && typeof row.observedAt !== "string") issue(`${field}.observedAt`, "must be a date string or null");
    if (row.period != null && !metricPeriods.some(period => period === row.period)) issue(`${field}.period`, "must be day, month, year, cumulative, or null");
    if (row.period != null && isSystemMetricKey(row.key) && metricDefinitions[row.key].group === "data") issue(`${field}.period`, "data metrics describe holdings or size; reporting periods apply to usage metrics");
  });
  rows(p.gallery, "record.properties.gallery", ["id", "type", "url", "thumbnailUrl", "source", "sortOrder"]).forEach((row, i) => {
    const field = `record.properties.gallery[${i}]`;
    if (row.type !== "image" && row.type !== "embed") issue(`${field}.type`, "invalid gallery type");
    if (!text(row.url)) issue(`${field}.url`, "non-empty text is required");
    if (row.thumbnailUrl !== null && !text(row.thumbnailUrl)) issue(`${field}.thumbnailUrl`, "must be non-empty text or null");
    if (!slug(row.source)) issue(`${field}.source`, "a source ID is required");
    if (!Number.isSafeInteger(row.sortOrder) || Number(row.sortOrder) < 0) issue(`${field}.sortOrder`, "must be a non-negative safe integer");
  });
  for (const [locale, l] of Object.entries(input.localizations ?? {})) {
    if (!l) continue;
    const field = `localizations.${locale}.details`;
    const keys = ["aliases", "profile", "data", "access", "gallery", "metrics", "researchGaps"];
    const d = closed(l.details === undefined ? {} : l.details, field, keys, rich ? keys.filter(key => key !== "researchGaps") : []);
    if (d.aliases !== undefined) strings(d.aliases, `${field}.aliases`);
    if (d.profile !== undefined) {
      const profile = closed(d.profile, `${field}.profile`, ["sourceRefs"]);
      strings(profile.sourceRefs, `${field}.profile.sourceRefs`, true);
    }
    if (d.researchGaps !== undefined) {
      const gaps = closed(d.researchGaps, `${field}.researchGaps`, ["data", "usage", "standards", "access"], []);
      for (const [key, value] of Object.entries(gaps)) if (!text(value)) issue(`${field}.researchGaps.${key}`, "a non-empty research explanation is required");
    }
    const localizedData = d.data === undefined ? {} : closed(d.data, `${field}.data`, ["descriptors"]);
    for (const [section, value, fields, required] of [
      ["data.descriptors", localizedData.descriptors, ["id", "description"], ["id", "description"]],
      ["access", d.access, ["id", "label", "description"], ["id", "label", "description"]],
      ["gallery", d.gallery, ["id", "title", "caption", "altText"], ["id", "title", "caption"]],
      ["metrics", d.metrics, ["id", "description"], ["id", "description"]],
    ] as const) {
      rows(value, `${field}.${section}`, [...fields], [...required]).forEach((row, i) => {
        for (const key of fields) if (key !== "id" && row[key] !== undefined && row[key] !== null && typeof row[key] !== "string") {
          issue(`${field}.${section}[${i}].${key}`, "must be text or null");
        }
      });
    }
  }
  return issues;
}

// Research requirements are separate from the stored structural decoder.
export function validateSystemResearch(id: string, input: RecordQualityInput, add: AddValidationIssue): string[] {
  const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
  const object = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
  const array = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(object) : [];
  const rich = input.record.recordDepth === "rich";
  const sources = input.record.sources ?? {};
  const p = object(input.record.properties);
  const data = object(p.data);
  const descriptors = array(data.descriptors);
  const access = array(p.access);
  const gallery = array(p.gallery);
  const metrics = array(p.metrics);
  const metricIds = new Set(metrics.map(item => item.id));
  const warnings: string[] = [];
  const issue = (field: string, message: string) => add(field, message, false, true);
  const accessError = (field: string, message: string, evidence = false) => add(field, message, evidence, true);
  const metricError = accessError;
  const requireText = (value: unknown, field: string) => { if (!text(value)) add(field, "non-empty text is required"); };
  const citation = (value: unknown, field: string) => { if (!text(value)) add(field, "a source ID is required", true); };
  const httpUrl = (value: unknown) => {
    try { return text(value) && ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  };
  const asset = (value: unknown, field: string) => {
    if (text(value) && value.startsWith("/gallery/")) {
      const root = fileURLToPath(new URL("../../../client/public/gallery/", import.meta.url));
      const target = path.resolve(root, value.slice("/gallery/".length));
      if (!target.startsWith(root) || !fs.existsSync(target)) add(field, "gallery asset must exist under client/public/gallery", false, true);
    } else if (!httpUrl(value)) add(field, "a usable HTTP(S) URL or local gallery asset is required", false, true);
  };

  if (input.record.kind === "system") {
    if (!descriptors.some(item => item.category === "format")) add("record.properties.data.descriptors", "at least one format descriptor is required");
    if (!access.some(item => item.type === "read")) add("record.properties.access", "at least one actual read access path is required");
    if (!input.edges?.some(edge => edge.kind === "operates" && edge.targetNodeId === id)) add("edges", "an incoming operates relationship is required");
  }
  const assignedDataTypes = new Set<unknown>();
  const assignedDataFormats = new Set<unknown>();
  const assignedDataStandards = new Set<unknown>();
  descriptors.forEach((item, i) => {
    if (item.category === "type") {
      if (!isDataType(item.label) || assignedDataTypes.has(item.label)) {
        issue(`record.properties.data.descriptors[${i}].label`, "must be a unique approved data type ID; additions require human approval in the authoring chat and an update to the shared vocabulary");
      }
      assignedDataTypes.add(item.label);
    }
    if (item.category === "format") {
      if (!isDataFormat(item.label) || assignedDataFormats.has(item.label)) {
        issue(`record.properties.data.descriptors[${i}].label`, "must be a unique approved data format ID; additions require human approval in the authoring chat and an update to the shared vocabulary");
      }
      assignedDataFormats.add(item.label);
    }
    if (item.category === "standard") {
      const field = `record.properties.data.descriptors[${i}]`;
      if (!isDataStandard(item.label) || assignedDataStandards.has(item.label)) {
        issue(`${field}.label`, "must be a unique approved data standard ID; additions require human approval in the authoring chat and an update to the shared vocabulary");
      }
      assignedDataStandards.add(item.label);
      if (!text(item.source) || !Object.hasOwn(sources, item.source)) issue(`${field}.source`, "a standard requires a source ID resolving to a source on this system");
      for (const locale of supportedLocales) {
        const translated = array(object(object(input.localizations?.[locale]?.details).data).descriptors).find(row => row.id === item.id);
        if (!text(translated?.description)) issue(`localizations.${locale}.details.data.descriptors.${item.id}.description`, "a standard requires a localized description of its documented scope");
      }
    }
    requireText(item.label, `record.properties.data.descriptors[${i}].label`);
    if (!["type", "format", "standard"].includes(String(item.category))) add(`record.properties.data.descriptors[${i}].category`, "invalid descriptor category");
    citation(item.source, `record.properties.data.descriptors[${i}].source`);
  });
  const accessIds = new Set(access.map(item => item.id));
  if (accessIds.size !== access.length || access.some(item => !text(item.id))) accessError("record.properties.access", "access IDs must be present and unique");
  access.forEach((item, i) => {
    const field = `record.properties.access[${i}]`;
    if (item.type !== "read" && item.type !== "write") accessError(`${field}.type`, "use read or write; submit and partner_sync are retired");
    for (const key of Object.keys(item)) {
      if (!["id", "type", "methods", "url", "requirements", "cost", "sourceRefs"].includes(key)) accessError(`${field}.${key}`, "unknown access field; use methods, requirements, cost and sourceRefs");
    }
    const methodGuard = item.type === "write" ? isWriteAccessMethod : isReadAccessMethod;
    if (!Array.isArray(item.methods) || !item.methods.length || item.methods.some(method => !methodGuard(method)) || new Set(item.methods).size !== item.methods.length) accessError(`${field}.methods`, "use a nonempty array of unique approved methods for this direction; additions require human approval and a vocabulary/translation release");
    if (!isAccessUrl(item.url)) accessError(`${field}.url`, "a usable HTTP(S), FTP(S), SFTP, rsync, S3 or GS address without embedded credentials is required");
    if (item.requirements !== null && (!Array.isArray(item.requirements) || item.requirements.some(value => !accessRequirements.some(requirement => requirement === value)) || new Set(item.requirements).size !== item.requirements.length)) accessError(`${field}.requirements`, "use unique approved requirements, [] for verified absence, or null when unknown");
    if (!accessCosts.some(cost => cost === item.cost)) accessError(`${field}.cost`, "use free, paid, mixed or unknown");
    if (!Array.isArray(item.sourceRefs) || !item.sourceRefs.length || item.sourceRefs.some(ref => !text(ref) || !Object.hasOwn(sources, ref)) || new Set(item.sourceRefs).size !== item.sourceRefs.length) accessError(`${field}.sourceRefs`, "nonempty unique source IDs resolving against this system are required", true);
  });
  for (const locale of supportedLocales) {
    const localizedAccess = object(input.localizations?.[locale]?.details).access;
    if (localizedAccess !== undefined && (!Array.isArray(localizedAccess) || localizedAccess.some(row => !isRecord(row)))) accessError(`localizations.${locale}.details.access`, "must be an array of localized access objects");
    const rows = array(localizedAccess);
    for (const item of access) {
      const field = `localizations.${locale}.details.access.${item.id}`;
      const matches = rows.filter(row => row.id === item.id);
      if (matches.length !== 1) accessError(field, "each access ID requires exactly one localized entry in all six languages");
      const translated = matches[0] ?? {};
      for (const key of Object.keys(translated)) if (!["id", "label", "description"].includes(key)) accessError(`${field}.${key}`, "localized access contains only id, label and description; consolidate instructions and caveats into description");
      for (const key of ["label", "description"]) if (!text(translated[key])) accessError(`${field}.${key}`, "nonempty localized access guidance is required");
    }
    if (rows.some(row => !accessIds.has(row.id))) accessError(`localizations.${locale}.details.access`, "localized access IDs must resolve to neutral entries");
  }
  gallery.forEach((item, i) => {
    const field = `record.properties.gallery[${i}]`;
    if (!["image", "embed"].includes(String(item.type))) add(`${field}.type`, "invalid gallery type");
    asset(item.url, `${field}.url`);
    if (item.type === "image" || item.thumbnailUrl != null) asset(item.thumbnailUrl, `${field}.thumbnailUrl`);
    citation(item.source, `${field}.source`);
  });
  const locales = rich ? supportedLocales : Object.keys(input.localizations ?? {}) as SupportedLocale[];
  for (const locale of locales) {
    const l = input.localizations?.[locale];
    if (!l) continue;
    const field = `localizations.${locale}`;
    const details = object(l.details);
    const localizedData = object(details.data);
    const sections: [string, Record<string, unknown>[], unknown, string[]][] = input.record.kind === "system" ? [
      ["data.descriptors", descriptors, localizedData.descriptors, ["label", "description"]],
      ["access", access, details.access, ["label", "description"]],
      ["gallery", gallery, details.gallery, ["title", "caption"]],
      ["metrics", metrics, details.metrics, ["description"]],
    ] : [];
    for (const [section, neutral, localized, fields] of sections) {
      const rows = array(localized);
      const ids = new Set(neutral.map(item => item.id));
      if (ids.size !== neutral.length || neutral.some(item => !text(item.id))) add(`record.properties.${section}`, "item IDs must be present and unique", false, true);
      if ((rich && rows.length !== neutral.length) || new Set(rows.map(item => item.id)).size !== rows.length || rows.some(item => !ids.has(item.id))) add(`${field}.details.${section}`, rich ? "localized item IDs must exactly match neutral item IDs" : "localized item IDs must be unique and resolve to neutral items", false, true);
      for (const item of neutral) {
        const translated = rows.find(row => row.id === item.id) ?? {};
        for (const key of fields) {
          if (section === "data.descriptors" && key === "label") {
            if (translated.label != null) issue(`${field}.details.${section}.${item.id}.label`, `data ${item.category} labels come from the shared vocabulary; use description for record-specific detail`);
          } else requireText(translated[key], `${field}.details.${section}.${item.id}.${key}`);
        }
      }
    }
    if (input.record.kind === "system") {
      const localizedMetrics = array(details.metrics);
      if (details.metrics !== undefined && (!Array.isArray(details.metrics) || details.metrics.some(item => !isRecord(item)))) metricError(`${field}.details.metrics`, "must be an array of localized metric objects");
      if (localizedMetrics.length !== metrics.length || new Set(localizedMetrics.map(item => item.id)).size !== localizedMetrics.length || localizedMetrics.some(item => !text(item.id) || !metricIds.has(item.id))) metricError(`${field}.details.metrics`, "localized metric IDs must exactly match neutral metric IDs");
      localizedMetrics.forEach((item, i) => {
        for (const key of Object.keys(item)) if (!["id", "description"].includes(key)) metricError(`${field}.details.metrics[${i}].${key}`, "localized metrics contain only id and description; labels and units come from the shared vocabulary");
        if (item.description !== null && typeof item.description !== "string") metricError(`${field}.details.metrics[${i}].description`, "must be text or null");
      });
    }
    if (input.record.kind === "system") {
      for (const [key, present] of [["data", metrics.some(item => isSystemMetricKey(item.key) && metricDefinitions[item.key].group === "data")], ["usage", metrics.some(item => isSystemMetricKey(item.key) && metricDefinitions[item.key].group === "usage")], ["standards", descriptors.some(item => item.category === "standard")]] as const) {
        if (!present && !text(object(details.researchGaps)[key])) add(`${field}.details.researchGaps.${key}`, "document the research gap when this information is unavailable");
      }
    }
  }
  for (const route of input.routes ?? []) {
    if (collectSourceIds(route.properties).size === 0) add(`routes.${route.id}.properties.sourceRefs`, "route evidence is required", true);
    if (!["active", "planned", "deprecated", "blocked"].includes(route.status)) add(`routes.${route.id}.status`, "invalid route status");
    if (route.status === "active") {
      requireText(route.target, `routes.${route.id}.target`);
      if (!route.capabilities?.length) add(`routes.${route.id}.capabilities`, "active routes require capabilities");
      requireText(route.contractRef, `routes.${route.id}.contractRef`);
    }
    if (route.contractRef && !httpUrl(route.contractRef)) {
      const root = fileURLToPath(new URL("../../../documentation/contracts/", import.meta.url));
      const target = path.resolve(root, route.contractRef.replace(/^documentation\/contracts\//, ""));
      if (!route.contractRef.startsWith("documentation/contracts/") || !target.startsWith(root) || !fs.existsSync(target)) add(`routes.${route.id}.contractRef`, "local contracts must resolve under documentation/contracts");
    }
  }
  if (rich && input.record.kind === "system") {
    if (!gallery.length) warnings.push("No gallery: acceptable when no useful, accessible capture is available.");
    if (!input.routes?.length) warnings.push("No approved machine route is recorded.");
    if (Object.values(input.localizations ?? {}).some(l => Object.keys(object(l?.details).researchGaps ?? {}).length)) warnings.push("Documented research gaps remain; omitted values have not been invented.");
  }
  return warnings;
}
