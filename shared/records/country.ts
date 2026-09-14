import type { GraphNodeBase, LocalizationMetadata, SourceRef, SupportedLocale, TreatyConsentMethod, TreatyParticipationStatus } from "../domain";

export interface CountryTreatyParticipation {
  id: string;
  status: TreatyParticipationStatus;
  signatureDate: string | null;
  consentMethod: TreatyConsentMethod | null;
  depositDate: string | null;
  effectiveDate: string | null;
  focalPointUrl: string | null;
  sourceRefs: SourceRef[];
}

export interface LocalizedCountryTreatyParticipation {
  id: string;
  title: string;
  description: string | null;
  focalPoint: string | null;
}

export type CountryLocalizationDetails = {
  aliases: string[];
  profile?: { sourceRefs: string[] };
  treatyParticipation?: LocalizedCountryTreatyParticipation[];
};

export interface CountryProperties {
  treatyParticipation?: CountryTreatyParticipation[];
}

export type CountryLocalization = LocalizationMetadata & {
  title: string;
  summary: string | null;
  details: CountryLocalizationDetails;
};

export interface CountryNode extends GraphNodeBase {
  kind: "country";
  countryCode: string | null;
  properties: CountryProperties;
  localizations: Partial<Record<SupportedLocale, CountryLocalization>>;
}

export const countryRecordFields = ["kind", "countryCode", "recordDepth", "properties", "sources"] as const satisfies readonly (keyof CountryNode)[];
export const countryLocalizationFields = ["title", "summary", "details", "translatedFromLocale"] as const satisfies readonly (keyof CountryLocalization)[];
