import type { AccessCost, AccessRequirement, DataFormat, DataStandard, DataType, Discipline, GraphNodeBase, LocalizationMetadata, MetricBase, MetricGroup, MetricPeriod, ReadAccessMethod, SourceRef, SupportedLocale, SystemMetricKey, WriteAccessMethod } from "../domain";

export type SystemDataDescriptorCategory = "type" | "format" | "standard";

export type SystemDataDescriptor = {
  id: string;
  source: SourceRef | null;
} & ({ category: "type"; label: DataType } | { category: "format"; label: DataFormat } | { category: "standard"; label: DataStandard });

export interface LocalizedSystemDataDescriptor {
  id: string;
  description: string | null;
}

interface AccessPathBase {
  id: string;
  url: string;
  requirements: AccessRequirement[] | null;
  cost: AccessCost;
  sourceRefs: SourceRef[];
}

export interface ReadAccessPath extends AccessPathBase {
  type: "read";
  methods: ReadAccessMethod[];
}

export interface WriteAccessPath extends AccessPathBase {
  type: "write";
  methods: WriteAccessMethod[];
}

export type SystemAccessPath = ReadAccessPath | WriteAccessPath;

export interface LocalizedSystemAccessPath {
  id: string;
  label: string;
  description: string;
}

export interface SystemGalleryItem {
  id: string;
  type: "image" | "embed";
  url: string;
  thumbnailUrl: string | null;
  source: SourceRef;
  sortOrder: number;
}

export interface LocalizedSystemGalleryItem {
  id: string;
  title: string | null;
  caption: string | null;
  altText?: string | null;
}

export interface LocalizedSourcedMetric {
  id: string;
  description: string | null;
}

export interface NodeDataDetails {
  descriptors: SystemDataDescriptor[];
}

export interface LocalizedNodeDataDetails {
  descriptors: LocalizedSystemDataDescriptor[];
}

export type SystemLocalizationDetails = {
  aliases: string[];
  profile?: { sourceRefs: string[] };
  researchGaps?: Partial<Record<MetricGroup | "standards" | "access", string>>;
  gallery?: LocalizedSystemGalleryItem[];
  data?: LocalizedNodeDataDetails;
  access?: LocalizedSystemAccessPath[];
  metrics?: LocalizedSourcedMetric[];
};

export interface SystemMetric extends MetricBase {
  key: SystemMetricKey;
  // Reporting basis; exact windows belong in the localized description.
  period?: MetricPeriod | null;
}

export interface SystemProperties {
  disciplines?: Discipline[];
  data?: NodeDataDetails;
  access?: SystemAccessPath[];
  gallery?: SystemGalleryItem[];
  metrics?: SystemMetric[];
}

export type SystemLocalization = LocalizationMetadata & {
  title: string;
  summary: string | null;
  description: string | null;
  details: SystemLocalizationDetails;
};

export interface SystemNode extends GraphNodeBase {
  kind: "system";
  url: string | null;
  properties: SystemProperties;
  localizations: Partial<Record<SupportedLocale, SystemLocalization>>;
}

export const systemRecordFields = ["kind", "url", "recordDepth", "properties", "sources"] as const satisfies readonly (keyof SystemNode)[];
export const systemLocalizationFields = ["title", "summary", "description", "details", "translatedFromLocale"] as const satisfies readonly (keyof SystemLocalization)[];
