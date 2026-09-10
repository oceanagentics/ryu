export type GraphNodeKind =
  | "country"
  | "organization"
  | "system";

export const edgeEndpointKinds = {
  governs: ["country/organization", "country/system", "organization/organization", "organization/system"],
  operates: ["organization/system"],
  funds: ["country/organization", "country/system", "organization/organization", "organization/system"],
  member_of: ["country/organization", "organization/organization", "system/system"],
  publishes_to: ["organization/system"],
  syncs_to: ["system/system"],
} as const satisfies Record<string, readonly `${GraphNodeKind}/${GraphNodeKind}`[]>;

export type GraphEdgeKind = keyof typeof edgeEndpointKinds;
export const edgeKinds = Object.keys(edgeEndpointKinds) as GraphEdgeKind[];

export function validEdgeEndpoints(kind: GraphEdgeKind, source: string | undefined, target: string | undefined): boolean {
  return edgeEndpointKinds[kind]?.some(pair => pair === `${source}/${target}`) ?? false;
}

export type ViewMode = "governance" | "country" | "technical";

export type RecordDepth = "stub" | "thin" | "rich";

export type ReviewState =
  | "agent_researched"
  | "human_reviewed"
  | "needs_revision";

export type SupportedLocale = "ar" | "zh" | "en" | "fr" | "ru" | "es";

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
  accessedAt: string;
}

export type SourceCollection = Record<string, Source>;
export type SourceRef = string;

export type SystemDataDescriptorCategory = "type" | "format" | "standard";

export type SystemDataDescriptor = {
  id: string;
  source: SourceRef | null;
} & ({ category: "type"; label: DataType } | { category: "format"; label: DataFormat } | { category: "standard"; label: DataStandard });

export interface LocalizedSystemDataDescriptor {
  id: string;
  label?: string | null;
  description: string | null;
}

export type SystemAccessType = "read" | "submit" | "partner_sync";

export interface SystemAccessPath {
  id: string;
  type: SystemAccessType;
  method: string;
  url: string;
  source: SourceRef;
}

export interface LocalizedSystemAccessPath {
  id: string;
  label: string | null;
  description: string | null;
  instructions?: string | null;
  caveats?: string[];
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

// New keys, units, or changes of meaning require human approval and a catalog release.
export const metricDefinitions = {
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

export type SystemMetricKey = keyof typeof metricDefinitions;
export type MetricUnit = (typeof metricDefinitions)[SystemMetricKey]["unit"];
export type MetricGroup = (typeof metricDefinitions)[SystemMetricKey]["group"];
export const metricPeriods = ["day", "month", "year", "cumulative"] as const;
export type MetricPeriod = (typeof metricPeriods)[number];

export function isSystemMetricKey(value: unknown): value is SystemMetricKey {
  return typeof value === "string" && Object.hasOwn(metricDefinitions, value);
}

export interface SourcedMetric {
  id: string;
  key: SystemMetricKey;
  value: number;
  observedAt: string | null;
  // Reporting basis, not inferred from observedAt. Exact windows belong in the description.
  period?: MetricPeriod | null;
  source: SourceRef;
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

export interface NodeLocalizationDetails extends Record<string, unknown> {
  profile?: { sourceRefs: string[] };
  relationshipReview?: { sourceRefs: string[]; findings: Record<GraphEdgeKind, string> };
  researchGaps?: Partial<Record<MetricGroup | "standards", string>>;
  aliases: string[];
  gallery: LocalizedSystemGalleryItem[];
  data: LocalizedNodeDataDetails;
  access: LocalizedSystemAccessPath[];
  metrics: LocalizedSourcedMetric[];
}

export interface NodeProperties extends Record<string, unknown> {
  disciplines?: Discipline[];
  gallery?: SystemGalleryItem[];
  data?: NodeDataDetails;
  access?: SystemAccessPath[];
  metrics?: SourcedMetric[];
}

export interface ReviewSnapshot {
  state: ReviewState;
  reviewer: string | null;
  date: string | null;
  note: string | null;
}

export interface LocalizationReview extends ReviewSnapshot {
  history?: ReviewSnapshot[];
}

export interface NodeLocalization {
  locale: SupportedLocale;
  title: string;
  summary: string | null;
  description: string | null;
  details: NodeLocalizationDetails;
  translatedFromLocale: SupportedLocale | null;
  contentUpdatedAt: string;
  review: LocalizationReview;
  createdAt: string;
  updatedAt: string;
}

export type NodeLocalizationMap = Partial<Record<SupportedLocale, NodeLocalization>>;

export interface ResolvedNodeLocalization {
  requestedLocale: SupportedLocale;
  displayLocale: SupportedLocale | null;
  isLocaleFallback: boolean;
  hasLocalization: boolean;
  title: string;
  summary: string | null;
  description: string | null;
  details: NodeLocalizationDetails;
  translatedFromLocale: SupportedLocale | null;
  contentUpdatedAt: string | null;
  review: LocalizationReview | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  countryCode: string | null;
  url: string | null;
  recordDepth: RecordDepth;
  properties: NodeProperties;
  sources: SourceCollection;
  createdAt: string;
  updatedAt: string;
  localizations: NodeLocalizationMap;
  availableLocales: SupportedLocale[];
  requestedLocale: SupportedLocale;
  displayLocale: SupportedLocale | null;
  isLocaleFallback: boolean;
}

export interface GraphEdge {
  sources: SourceCollection;
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: GraphEdgeKind;
  note: string | null;
  properties: Record<string, unknown>;
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

export interface SavedView {
  id: string;
  name: string;
  scope: string;
  filter: Record<string, unknown>;
  layout: Record<string, unknown>;
  style: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphBootstrapPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  ryuRoutes: RyuRoute[];
  savedViews: SavedView[];
}

export interface SavedViewInput {
  name: string;
  scope: string;
  filter: Record<string, unknown>;
  layout: Record<string, unknown>;
  style: Record<string, unknown>;
}

export interface NodeLocalizationReviewInput {
  reviewState?: ReviewState;
  reviewerNote?: string | null;
}
