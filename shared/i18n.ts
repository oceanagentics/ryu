import type { SupportedLocale, SystemDataDescriptor, SourcedMetric } from "./domain";
import { metricDefinitions } from "./domain";
import { defaultLocale } from "./localization";
import { localeNames } from "./localeNames";
import { commonMessages } from "./uiMessages/common";
import { detailsMessages } from "./uiMessages/details";
import { directoryMessages } from "./uiMessages/directory";
import { graphMessages } from "./uiMessages/graph";
import { searchMessages } from "./uiMessages/search";
import { accessMethodLabels, accessTypeLabels, accessRequirementLabels, accessCostLabels } from "./vocabularyLabels/access";
import { dataFormatLabels } from "./vocabularyLabels/dataFormats";
import { dataStandardLabels } from "./vocabularyLabels/dataStandards";
import { dataTypeLabels } from "./vocabularyLabels/dataTypes";
import { disciplineLabels } from "./vocabularyLabels/disciplines";
import { edgeKindLabels, nodeKindLabels, relationshipDirectionLabels } from "./vocabularyLabels/graph";
import { metricKeyLabels, unitLabels, metricPeriodLabels } from "./vocabularyLabels/metrics";
import { organizationOfficeKindLabels } from "./vocabularyLabels/organizations";
import {
  recordDepthLabels,
  reviewStateLabels,
  treatyConsentMethodLabels,
  treatyParticipationStatusLabels,
} from "./vocabularyLabels/records";

export { localeNativeNames } from "./localeNames";

export const uiMessages = {
  ...commonMessages,
  ...detailsMessages,
  ...directoryMessages,
  ...searchMessages,
  ...graphMessages,
};
export type UiMessageKey = keyof typeof uiMessages;

export const vocabularyLabels = {
  dataTypes: dataTypeLabels,
  dataFormats: dataFormatLabels,
  dataStandards: dataStandardLabels,
  disciplines: disciplineLabels,
  nodeKinds: nodeKindLabels,
  edgeKinds: edgeKindLabels,
  relationshipDirections: relationshipDirectionLabels,
  accessTypes: accessTypeLabels,
  accessMethods: accessMethodLabels,
  accessRequirements: accessRequirementLabels,
  accessCosts: accessCostLabels,
  metricKeys: metricKeyLabels,
  metricPeriods: metricPeriodLabels,
  units: unitLabels,
  organizationOfficeKinds: organizationOfficeKindLabels,
  recordDepths: recordDepthLabels,
  reviewStates: reviewStateLabels,
  treatyParticipationStatuses: treatyParticipationStatusLabels,
  treatyConsentMethods: treatyConsentMethodLabels,
};
export type VocabularyGroup = keyof typeof vocabularyLabels;
export type VocabularyValue<Group extends VocabularyGroup> =
  keyof typeof vocabularyLabels[Group] & string;

export function humanizeCode(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function t(
  locale: SupportedLocale,
  key: UiMessageKey,
  values: Record<string, string | number> = {},
): string {
  return uiMessages[key][locale].replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = values[name];
    return value == null ? `{${name}}` : String(value);
  });
}

export function localeName(
  value: SupportedLocale,
  displayLocale: SupportedLocale = defaultLocale,
): string {
  return localeNames[value][displayLocale];
}

export function vocabularyLabel<Group extends VocabularyGroup>(
  locale: SupportedLocale,
  group: Group,
  value: VocabularyValue<NoInfer<Group>>,
): string {
  const catalog = vocabularyLabels[group] as Record<string, Record<SupportedLocale, string>>;
  if (!Object.hasOwn(catalog, value)) {
    throw new Error(`Unknown ${group} value: ${value}`);
  }
  const label = catalog[value][locale];
  if (!label?.trim()) throw new Error(`Missing ${locale} translation for ${group}.${value}`);
  return label;
}

export function dataDescriptorLabel(locale: SupportedLocale, descriptor: SystemDataDescriptor): string {
  switch (descriptor.category) {
    case "type": return vocabularyLabel(locale, "dataTypes", descriptor.label);
    case "format": return vocabularyLabel(locale, "dataFormats", descriptor.label);
    case "standard": return vocabularyLabel(locale, "dataStandards", descriptor.label);
  }
}

export function formatDateTime(value: string | null, locale: SupportedLocale): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatMetricValue(metric: SourcedMetric, locale: SupportedLocale): string {
  const unit = metricDefinitions[metric.key].unit;
  let value: string;
  if (unit === "bytes") {
    const units = ["B", "kB", "MB", "GB", "TB", "PB"];
    let size = metric.value;
    let index = 0;
    while (size >= 1000 && index < units.length - 1) { size /= 1000; index++; }
    value = `${new Intl.NumberFormat(locale, { maximumFractionDigits: index === 0 ? 0 : 1 }).format(size)} ${units[index]}`;
  } else {
    value = `${formatNumber(metric.value, locale)} ${vocabularyLabel(locale, "units", unit)}`;
  }
  return "period" in metric && metric.period ? `${value} · ${vocabularyLabel(locale, "metricPeriods", metric.period)}` : value;
}
