import type { CountryNode, CountryLocalization, CountryLocalizationDetails } from "./records/country";
import type { OrganizationNode, OrganizationLocalization, OrganizationLocalizationDetails, OrganizationMetric } from "./records/organization";
import type { SystemNode, SystemLocalization, SystemLocalizationDetails, SystemMetric } from "./records/system";
import { countryRecordFields, countryLocalizationFields } from "./records/country";
import { organizationRecordFields, organizationLocalizationFields } from "./records/organization";
import { systemRecordFields, systemLocalizationFields } from "./records/system";
export type * from "./records/country";
export type * from "./records/organization";
export type * from "./records/system";

export type GraphNodeKind =
  | "country"
  | "organization"
  | "system";

export const edgeEndpointKinds = {
  governs: ["country/organization", "country/system", "organization/organization", "organization/system"],
  operates: ["organization/system"],
  funds: ["country/organization", "country/system", "organization/organization", "organization/system"],
  member: ["country/organization", "organization/organization", "system/system"],
  contributes: ["organization/system"],
  transfers: ["system/system"],
} as const satisfies Record<string, readonly `${GraphNodeKind}/${GraphNodeKind}`[]>;

export type GraphEdgeKind = keyof typeof edgeEndpointKinds;
export const edgeKinds = Object.keys(edgeEndpointKinds) as GraphEdgeKind[];

export function validEdgeEndpoints(kind: GraphEdgeKind, source: string | undefined, target: string | undefined): boolean {
  return edgeEndpointKinds[kind]?.some(pair => pair === `${source}/${target}`) ?? false;
}

export type RecordDepth = "stub" | "thin" | "rich";

export type ReviewState =
  | "agent_researched"
  | "human_reviewed"
  | "needs_revision";

export type SupportedLocale = "ar" | "zh" | "en" | "fr" | "ru" | "es";

export const treatyParticipationStatuses = [
  "party",
  "signatory_not_party",
  "not_party",
  "withdrawn",
] as const;

export type TreatyParticipationStatus = (typeof treatyParticipationStatuses)[number];

export const treatyConsentMethods = [
  "ratification",
  "acceptance",
  "approval",
  "accession",
  "definitive_signature",
] as const;

export type TreatyConsentMethod = (typeof treatyConsentMethods)[number];

// Additions require explicit human approval in the record-authoring chat.
export const disciplines = [
  "agronomy", "botany", "chemistry", "climatology", "ecology", "economics",
  "fisheries_science", "genetics", "geography", "geology", "geophysics",
  "glaciology", "hydrology", "law", "marine_biology", "meteorology",
  "microbiology", "mycology", "oceanography", "paleontology", "spatial_planning",
  "taxonomy", "zoology",
] as const;

export type Discipline = (typeof disciplines)[number];

// Additions require explicit human approval in the record-authoring chat.
export const dataTypes = [
  "taxonomic_records", "occurrence_records", "survey_records", "biological_traits",
  "biological_interactions", "sample_records", "sequence_data", "environmental_measurements",
  "model_outputs", "fisheries_statistics", "geographic_reference_data", "bathymetry",
  "platform_records", "media", "bibliographic_records", "catalogue_records", "documents", "software",
] as const;

export type DataType = (typeof dataTypes)[number];

// Additions require explicit human approval in the record-authoring chat.
export const dataFormats = [
  "csv", "tsv", "parquet", "json", "xml", "html", "pdf", "netcdf", "zarr", "bufr",
  "geojson", "shapefile", "geopackage", "kml", "esri_file_geodatabase", "pmtiles", "pbf",
  "png", "darwin_core_archive", "fasta", "fastq", "genbank_flatfile", "embl_flatfile",
] as const;

export type DataFormat = (typeof dataFormats)[number];

// Additions require explicit human approval in the record-authoring chat.
export const dataStandards = [
  "darwin_core", "emof", "dna_derived_data", "humboldt_extension", "eml", "ggbn", "abcd", "mixs", "bcdm", "insdc",
  "cf", "acdd", "argo", "oceansites", "ioos_metadata", "sgrid", "ugrid", "seadatanet", "nerc_vocabularies", "qartod",
  "iso_19115", "iso_19139", "iso_19115_3", "seadatanet_cdi", "cioos_metadata", "dublin_core", "datacite",
  "dcat", "dcat_ap", "schema_org", "re3data", "dif", "fgdc_csdgm", "datras", "intercatch", "rdbes",
  "ices_vocabularies", "asfis", "isscaap", "isscfg", "fao_fishing_areas",
] as const;

export type DataStandard = (typeof dataStandards)[number];

export interface Source {
  id: string;
  url: string;
  title: Partial<Record<SupportedLocale, string>>;
  description?: Partial<Record<SupportedLocale, string>>;
  accessedAt: string;
}

export type SourceCollection = Record<string, Source>;
export type SourceRef = string;

export type SystemAccessType = "read" | "write";

// Additions require human approval and a complete translation release.
export const readAccessMethods = ["browse", "download", "api", "software", "request"] as const;
export type ReadAccessMethod = (typeof readAccessMethods)[number];
export const writeAccessMethods = ["form", "upload", "api", "software", "request", "harvest"] as const;
export type WriteAccessMethod = (typeof writeAccessMethods)[number];
export type AccessMethod = ReadAccessMethod | WriteAccessMethod;
export const accessRequirements = ["account", "api_key", "approval", "affiliation"] as const;
export type AccessRequirement = (typeof accessRequirements)[number];
export const accessCosts = ["free", "paid", "mixed", "unknown"] as const;
export type AccessCost = (typeof accessCosts)[number];

export function isReadAccessMethod(value: unknown): value is ReadAccessMethod {
  return readAccessMethods.some(method => method === value);
}

export function isWriteAccessMethod(value: unknown): value is WriteAccessMethod {
  return writeAccessMethods.some(method => method === value);
}

export function isAccessUrl(value: unknown): value is string {
  if (typeof value !== "string" || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:", "ftp:", "ftps:", "sftp:", "rsync:", "s3:", "gs:"].includes(url.protocol)
      && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

// New keys, units, or changes of meaning require human approval and a catalog release.
export const systemMetricDefinitions = {
  record_count: { group: "data", unit: "records" },
  occurrence_count: { group: "data", unit: "occurrences" },
  sample_count: { group: "data", unit: "samples" },
  sequence_count: { group: "data", unit: "sequences" },
  species_count: { group: "data", unit: "species" },
  storage_size_bytes: { group: "data", unit: "bytes" },
  session_count: { group: "usage", unit: "sessions" },
  download_count: { group: "usage", unit: "downloads" },
  contributor_count: { group: "usage", unit: "contributors" },
  citation_count: { group: "usage", unit: "citations" },
} as const;

export const organizationMetricDefinitions = {
  staff_count: { group: "organization", unit: "people" },
  member_organization_count: { group: "organization", unit: "organizations" },
  member_country_count: { group: "organization", unit: "countries" },
} as const;

export const metricDefinitions = {
  ...systemMetricDefinitions,
  ...organizationMetricDefinitions,
} as const;

export type SystemMetricKey = keyof typeof systemMetricDefinitions;
export type OrganizationMetricKey = keyof typeof organizationMetricDefinitions;
export type MetricKey = keyof typeof metricDefinitions;
export type MetricUnit = (typeof metricDefinitions)[MetricKey]["unit"];
export type MetricGroup = (typeof systemMetricDefinitions)[SystemMetricKey]["group"];
export const metricPeriods = ["day", "month", "year", "cumulative"] as const;
export type MetricPeriod = (typeof metricPeriods)[number];

export function isSystemMetricKey(value: unknown): value is SystemMetricKey {
  return typeof value === "string" && Object.hasOwn(systemMetricDefinitions, value);
}

export function isOrganizationMetricKey(value: unknown): value is OrganizationMetricKey {
  return typeof value === "string" && Object.hasOwn(organizationMetricDefinitions, value);
}

export interface MetricBase {
  id: string;
  value: number;
  observedAt: string | null;
  source: SourceRef;
}
export type SourcedMetric = SystemMetric | OrganizationMetric;

export const organizationOfficeKinds = ["headquarters", "office"] as const;
export type OrganizationOfficeKind = (typeof organizationOfficeKinds)[number];

export type LocalizationDetailsByKind = {
  country: CountryLocalizationDetails;
  system: SystemLocalizationDetails;
  organization: OrganizationLocalizationDetails;
};
export type NodeLocalizationDetails = LocalizationDetailsByKind[GraphNodeKind];

// Positive authoring contracts, selected using the owning node's kind.
export const recordContentFields = {
  country: countryRecordFields,
  organization: organizationRecordFields,
  system: systemRecordFields,
} as const;
export const localizationContentFields = {
  country: countryLocalizationFields,
  organization: organizationLocalizationFields,
  system: systemLocalizationFields,
} as const;

export type NodeProperties<K extends GraphNodeKind = GraphNodeKind> = NodeByKind[K]["properties"];

export interface ReviewSnapshot {
  state: ReviewState;
  reviewer: string | null;
  date: string | null;
  note: string | null;
}

export interface LocalizationReview extends ReviewSnapshot {
  history?: ReviewSnapshot[];
}

export interface LocalizationMetadata {
  locale: SupportedLocale;
  translatedFromLocale: SupportedLocale | null;
  contentUpdatedAt: string;
  review: LocalizationReview;
  createdAt: string;
  updatedAt: string;
}

export type LocalizationByKind = {
  country: CountryLocalization;
  system: SystemLocalization;
  organization: OrganizationLocalization;
};
export type NodeLocalization<K extends GraphNodeKind = GraphNodeKind> = LocalizationByKind[K];

export type NodeLocalizationMap<K extends GraphNodeKind = GraphNodeKind> = Partial<Record<SupportedLocale, NodeLocalization<K>>>;

export type ResolvedNodeLocalization<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: {
    kind: Kind;
    requestedLocale: SupportedLocale;
    displayLocale: SupportedLocale | null;
    isLocaleFallback: boolean;
    hasLocalization: boolean;
    title: string;
    summary: string | null;
    details: LocalizationDetailsByKind[Kind];
    translatedFromLocale: SupportedLocale | null;
    contentUpdatedAt: string | null;
    review: LocalizationReview | null;
    createdAt: string | null;
    updatedAt: string | null;
  } & Pick<LocalizationByKind[Kind], Extract<"description", keyof LocalizationByKind[Kind]>>
}[K];

export interface GraphNodeBase {
  id: string;
  recordDepth: RecordDepth;
  sources: SourceCollection;
  createdAt: string;
  updatedAt: string;
  availableLocales: SupportedLocale[];
  requestedLocale: SupportedLocale;
  displayLocale: SupportedLocale | null;
  isLocaleFallback: boolean;
}

export interface NodeByKind {
  country: CountryNode;
  organization: OrganizationNode;
  system: SystemNode;
}
export type GraphNode<K extends GraphNodeKind = GraphNodeKind> = NodeByKind[K];

export interface GraphEdge {
  sources: SourceCollection;
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: GraphEdgeKind;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface RyuRoute {
  id: string;
  nodeId: string;
  status: string;
  mode: string;
  priority: number;
  capabilities: string[];
  target: string | null;
  upstream: string | null;
  format: string | null;
  contractRef: string | null;
  caveat: string | null;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RyuPortalRoute {
  routeId: string;
  status: string;
  mode: string;
  priority: number;
  connectorRef: string | null;
  connectorTarget: string | null;
  upstream: string | null;
  supportedTools: string[];
  capabilities: string[];
  deliveryFormats: string[];
  auth: {
    required: boolean;
  };
  contractRef: string | null;
  caveats: string[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RyuSystemOperator {
  id: string;
  name: string;
}

export interface RyuSystemRecord {
  ryuSystemId: string;
  title: string;
  operator: RyuSystemOperator | null;
  summary: string | null;
  description: string | null;
  requestedLocale: SupportedLocale;
  displayLocale: SupportedLocale | null;
  isLocaleFallback: boolean;
  url: string | null;
  domains: string[];
  geographies: string[];
  capabilities: string[];
  routes: RyuPortalRoute[];
  sources: SourceCollection;
  caveats: string[];
  recordDepth: RecordDepth;
  reviewState: ReviewState | null;
  updatedAt: string;
}

export interface RyuSystemQuery {
  query?: string;
  domains?: string[];
  geographies?: string[];
  capabilities?: string[];
  deliveryFormats?: string[];
  routeStatus?: string[];
  includeRoutes?: boolean;
  includeSources?: boolean;
}

export interface GraphBootstrapPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  ryuRoutes: RyuRoute[];
}

export interface NodeLocalizationReviewInput {
  reviewState: ReviewState;
  reviewerNote?: string | null;
}
