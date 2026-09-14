import { isOrganizationMetricKey, organizationOfficeKinds } from "../../../shared/domain";
import type { RecordValidationIssue } from "../../../shared/recordApi";
import type { RecordQualityInput } from "../recordContracts";
import { isRecord } from "../graphRepositorySupport";

export function validateOrganizationStructure(id: string, input: RecordQualityInput): RecordValidationIssue[] {
  if (input.record.kind !== "organization") return [];
  const issues: RecordValidationIssue[] = [];
  const issue = (path: string, message: string) => issues.push({ recordId: id, path, message });
  const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const slug = (value: unknown) => typeof value === "string" && /^[a-z0-9][a-z0-9._:-]*$/.test(value);
  const date = (value: unknown) => typeof value === "string" && /^\d{4}(-\d{2})?(-\d{2})?$/.test(value)
    && !value.startsWith("0000") && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value);
  const closed = (value: unknown, path: string, fields: string[], required: string[] = []) => {
    if (!isRecord(value)) { issue(path, "must be an object"); return {}; }
    for (const key of Object.keys(value)) if (!fields.includes(key)) issue(`${path}.${key}`, "unknown organization record field");
    for (const key of required) if (!Object.hasOwn(value, key)) issue(`${path}.${key}`, "field is required");
    return value;
  };
  const strings = (value: unknown, path: string, ids = false) => {
    if (!Array.isArray(value) || value.some(item => !(ids ? slug(item) : text(item))) || new Set(value).size !== value.length) {
      issue(path, ids ? "must be an array of unique source IDs" : "must be an array of unique non-empty strings");
    }
  };
  const rows = (value: unknown, path: string) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) { issue(path, "must be an array of objects"); return []; }
    const seen = new Set<unknown>();
    return value.map((item, index) => {
      const field = `${path}[${index}]`;
      const row = isRecord(item) ? item : {};
      if (!isRecord(item)) issue(field, "must be an object");
      if (!slug(row.id) || seen.has(row.id)) issue(`${field}.id`, "item IDs must be deterministic slugs and unique within the section");
      seen.add(row.id);
      return row;
    });
  };
  const rich = input.record.recordDepth === "rich";
  if (rich && !input.edges?.length) issue("edges", "at least one evidenced incident relationship is required");
  if (rich) for (const edge of input.edges ?? []) if (!text(edge.note)) issue(`edges.${edge.id}.note`, "a relationship explanation is required");
  const properties = closed(input.record.properties ?? {}, "record.properties", ["established", "metrics", "offices"], rich ? ["established", "metrics", "offices"] : []);
  if (properties.established !== undefined && properties.established !== null) {
    const established = closed(properties.established, "record.properties.established", ["date", "source"], ["date", "source"]);
    if (!date(established.date)) issue("record.properties.established.date", "use YYYY, YYYY-MM, or YYYY-MM-DD");
    if (!slug(established.source)) issue("record.properties.established.source", "a source ID is required");
  }
  rows(properties.metrics, "record.properties.metrics").forEach((item, index) => {
    const field = `record.properties.metrics[${index}]`;
    closed(item, field, ["id", "key", "value", "observedAt", "source"], ["id", "key", "value", "observedAt", "source"]);
    if (!isOrganizationMetricKey(item.key)) issue(`${field}.key`, "must be an approved organization metric key");
    if (typeof item.value !== "number" || !Number.isFinite(item.value) || item.value < 0 || item.value > Number.MAX_SAFE_INTEGER) issue(`${field}.value`, "a finite non-negative safe numeric value is required");
    if (item.observedAt !== null && !date(item.observedAt)) issue(`${field}.observedAt`, "use YYYY, YYYY-MM, YYYY-MM-DD, or null");
    if (!slug(item.source)) issue(`${field}.source`, "a source ID is required");
  });
  const offices = rows(properties.offices, "record.properties.offices");
  const officeIds = new Set(offices.map(office => office.id));
  offices.forEach((item, index) => {
    const field = `record.properties.offices[${index}]`;
    const office = closed(item, field, ["id", "kind", "source"], ["id", "kind", "source"]);
    if (!organizationOfficeKinds.some(kind => kind === office.kind)) issue(`${field}.kind`, "must be headquarters or office");
    if (!slug(office.source)) issue(`${field}.source`, "a source ID is required");
  });

  for (const [locale, localization] of Object.entries(input.localizations ?? {})) {
    if (!localization) continue;
    const field = `localizations.${locale}.details`;
    const details = closed(localization.details ?? {}, field, ["aliases", "profile", "offices", "researchGaps"], rich ? ["aliases", "profile", "offices"] : []);
    if (details.aliases !== undefined) strings(details.aliases, `${field}.aliases`);
    if (details.profile !== undefined) {
      const profile = closed(details.profile, `${field}.profile`, ["mission", "sourceRefs"], rich ? ["mission", "sourceRefs"] : ["sourceRefs"]);
      if (profile.mission !== undefined && !text(profile.mission)) issue(`${field}.profile.mission`, "must be non-empty localized text");
      strings(profile.sourceRefs, `${field}.profile.sourceRefs`, true);
    }
    if (details.researchGaps !== undefined) {
      const gaps = closed(details.researchGaps, `${field}.researchGaps`, ["established", "scale", "officeLocations"]);
      for (const [key, value] of Object.entries(gaps)) if (!text(value)) issue(`${field}.researchGaps.${key}`, "a non-empty research explanation is required");
    }
    if (rich) for (const [key, present] of [
      ["established", properties.established != null],
      ["scale", Array.isArray(properties.metrics) && properties.metrics.length > 0],
      ["officeLocations", offices.length > 0],
    ] as const) {
      if (!present && (!isRecord(details.researchGaps) || !text(details.researchGaps[key]))) issue(`${field}.researchGaps.${key}`, "document the research gap when this information is unavailable");
    }
    const localizedOffices = rows(details.offices, `${field}.offices`);
    if ((rich && localizedOffices.length !== offices.length)
      || new Set(localizedOffices.map(office => office.id)).size !== localizedOffices.length
      || localizedOffices.some(office => !officeIds.has(office.id))) {
      issue(`${field}.offices`, rich ? "localized office IDs must exactly match neutral office IDs" : "localized office IDs must be unique and resolve to neutral items");
    }
    localizedOffices.forEach((item, index) => {
      const office = closed(item, `${field}.offices[${index}]`, ["id", "location"], ["id", "location"]);
      if (!text(office.location)) issue(`${field}.offices[${index}].location`, "a non-empty localized office location is required");
    });
  }
  return issues;
}
