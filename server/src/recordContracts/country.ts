import { treatyConsentMethods, treatyParticipationStatuses } from "../../../shared/domain";
import type { RecordValidationIssue } from "../../../shared/recordApi";
import type { RecordQualityInput } from "../recordContracts";
import { isRecord } from "../graphRepositorySupport";

export function validateCountryStructure(id: string, input: RecordQualityInput): RecordValidationIssue[] {
  if (input.record.kind !== "country") return [];
  const issues: RecordValidationIssue[] = [];
  const issue = (path: string, message: string) => issues.push({ recordId: id, path, message });
  const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const slug = (value: unknown) => typeof value === "string" && /^[a-z0-9][a-z0-9._:-]*$/.test(value);
  const date = (value: unknown) => value === null || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !value.startsWith("0000") && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
  const httpUrl = (value: unknown) => {
    try { return typeof value === "string" && ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  };
  const closed = (value: unknown, path: string, fields: string[], required: string[] = []) => {
    if (!isRecord(value)) { issue(path, "must be an object"); return {}; }
    for (const key of Object.keys(value)) if (!fields.includes(key)) issue(`${path}.${key}`, "unknown country record field");
    for (const key of required) if (!Object.hasOwn(value, key)) issue(`${path}.${key}`, "field is required");
    return value;
  };
  const ids = (value: unknown, path: string, allowEmpty = true) => {
    if (!Array.isArray(value) || (!allowEmpty && value.length === 0)
      || value.some(item => !slug(item)) || new Set(value).size !== value.length) {
      issue(path, `must be a${allowEmpty ? "n" : " nonempty"} array of unique source IDs`);
      return [];
    }
    return value;
  };
  const rows = (value: unknown, path: string, required: boolean) => {
    if (value === undefined && !required) return [];
    if (!Array.isArray(value) || (required && value.length === 0)) {
      issue(path, required ? "at least one researched treaty participation item is required" : "must be an array");
      return [];
    }
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
  if (input.record.countryCode != null && (typeof input.record.countryCode !== "string" || !/^[A-Z]{3}$/.test(input.record.countryCode))) issue("record.countryCode", "use an uppercase ISO alpha-3 identity code");
  if (rich && !input.record.countryCode) issue("record.countryCode", "a rich country requires an uppercase ISO alpha-3 identity code");
  const properties = closed(input.record.properties ?? {}, "record.properties", ["treatyParticipation"], rich ? ["treatyParticipation"] : []);
  const treaties = rows(properties.treatyParticipation, "record.properties.treatyParticipation", rich);
  const treatyIds = new Set(treaties.map(row => row.id));
  treaties.forEach((item, index) => {
    const field = `record.properties.treatyParticipation[${index}]`;
    const row = closed(item, field, ["id", "status", "signatureDate", "consentMethod", "depositDate", "effectiveDate", "focalPointUrl", "sourceRefs"],
      ["id", "status", "signatureDate", "consentMethod", "depositDate", "effectiveDate", "focalPointUrl", "sourceRefs"]);
    if (!treatyParticipationStatuses.some(status => status === row.status)) issue(`${field}.status`, "must be an approved treaty participation status");
    if (row.consentMethod !== null && !treatyConsentMethods.some(method => method === row.consentMethod)) issue(`${field}.consentMethod`, "must be an approved consent method or null");
    for (const key of ["signatureDate", "depositDate", "effectiveDate"] as const) {
      if (!date(row[key])) issue(`${field}.${key}`, "must be a valid YYYY-MM-DD date or null");
    }
    if (row.focalPointUrl !== null && !httpUrl(row.focalPointUrl)) issue(`${field}.focalPointUrl`, "must be an absolute HTTP(S) URL or null");
    ids(row.sourceRefs, `${field}.sourceRefs`, false);
  });

  for (const [locale, localization] of Object.entries(input.localizations ?? {})) {
    if (!localization) continue;
    const field = `localizations.${locale}.details`;
    const details = closed(localization.details ?? {}, field, ["aliases", "profile", "treatyParticipation"], rich ? ["aliases", "profile", "treatyParticipation"] : []);
    if (details.aliases !== undefined && (!Array.isArray(details.aliases) || details.aliases.some(alias => !text(alias)) || new Set(details.aliases).size !== details.aliases.length)) {
      issue(`${field}.aliases`, "must be an array of unique non-empty strings");
    }
    if (details.profile !== undefined) {
      const profile = closed(details.profile, `${field}.profile`, ["sourceRefs"], ["sourceRefs"]);
      ids(profile.sourceRefs, `${field}.profile.sourceRefs`, !rich);
    }
    const localizedTreaties = rows(details.treatyParticipation, `${field}.treatyParticipation`, rich);
    if ((rich && localizedTreaties.length !== treaties.length)
      || new Set(localizedTreaties.map(row => row.id)).size !== localizedTreaties.length
      || localizedTreaties.some(row => !treatyIds.has(row.id))) {
      issue(`${field}.treatyParticipation`, rich
        ? "localized treaty IDs must exactly match neutral treaty IDs"
        : "localized treaty IDs must be unique and resolve to neutral items");
    }
    localizedTreaties.forEach((item, index) => {
      const itemField = `${field}.treatyParticipation[${index}]`;
      const row = closed(item, itemField, ["id", "title", "description", "focalPoint"], ["id", "title", "description", "focalPoint"]);
      if (!text(row.title)) issue(`${itemField}.title`, "a non-empty localized treaty title is required");
      if (row.description !== null && !text(row.description)) issue(`${itemField}.description`, "must be non-empty text or null");
      if (rich && !text(row.description)) issue(`${itemField}.description`, "a non-empty localized description is required");
      if (row.focalPoint !== null && !text(row.focalPoint)) issue(`${itemField}.focalPoint`, "must be non-empty text or null");
    });
  }
  return issues;
}
