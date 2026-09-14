import type { GraphNodeBase, LocalizationMetadata, MetricBase, OrganizationMetricKey, OrganizationOfficeKind, SourceRef, SupportedLocale } from "../domain";

export interface OrganizationEstablishedFact {
  date: string;
  source: SourceRef;
}

export interface OrganizationOffice {
  id: string;
  kind: OrganizationOfficeKind;
  source: SourceRef;
}

export interface LocalizedOrganizationOffice {
  id: string;
  location: string;
}

export type OrganizationLocalizationDetails = {
  aliases: string[];
  profile?: { sourceRefs: string[]; mission?: string };
  researchGaps?: Partial<Record<"established" | "scale" | "officeLocations", string>>;
  offices?: LocalizedOrganizationOffice[];
};

export interface OrganizationMetric extends MetricBase {
  key: OrganizationMetricKey;
}

export interface OrganizationProperties {
  established?: OrganizationEstablishedFact | null;
  metrics?: OrganizationMetric[];
  offices?: OrganizationOffice[];
}

export type OrganizationLocalization = LocalizationMetadata & {
  title: string;
  summary: string | null;
  description: string | null;
  details: OrganizationLocalizationDetails;
};

export interface OrganizationNode extends GraphNodeBase {
  kind: "organization";
  url: string | null;
  properties: OrganizationProperties;
  localizations: Partial<Record<SupportedLocale, OrganizationLocalization>>;
}

export const organizationRecordFields = ["kind", "url", "recordDepth", "properties", "sources"] as const satisfies readonly (keyof OrganizationNode)[];
export const organizationLocalizationFields = ["title", "summary", "description", "details", "translatedFromLocale"] as const satisfies readonly (keyof OrganizationLocalization)[];
