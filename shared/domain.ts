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
} & ({ category: "type"; label: DataType } | { category: "format" | "standard"; label: string });

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

export type SystemMetricKey =
  | "record_count"
  | "storage_size_bytes"
  | "publication_count"
  | "citation_count"
  | "view_count"
  | "download_count"
  | "registered_user_count"
  | "contributor_count"
  | string;

export interface SourcedMetric {
  id: string;
  key: SystemMetricKey;
  value: number;
  unit: string;
  observedAt: string | null;
  source: SourceRef;
}

export interface LocalizedSourcedMetric {
  id: string;
  label?: string | null;
  unit?: string | null;
  description: string | null;
}

export interface NodeDataDetails {
  descriptors: SystemDataDescriptor[];
  recordCount: SourcedMetric | null;
  storageSize: SourcedMetric | null;
}

export interface LocalizedNodeDataDetails {
  descriptors: LocalizedSystemDataDescriptor[];
  recordCount: LocalizedSourcedMetric | null;
  storageSize: LocalizedSourcedMetric | null;
}

export interface NodeLocalizationDetails extends Record<string, unknown> {
  profile?: { sourceRefs: string[] };
  relationshipReview?: { sourceRefs: string[]; findings: Record<GraphEdgeKind, string> };
  researchGaps?: Partial<Record<"recordCount" | "storageSize" | "usage" | "standards", string>>;
  aliases: string[];
  gallery: LocalizedSystemGalleryItem[];
  data: LocalizedNodeDataDetails;
  access: LocalizedSystemAccessPath[];
  usage: LocalizedSourcedMetric[];
}

export interface NodeProperties extends Record<string, unknown> {
  disciplines?: Discipline[];
  gallery?: SystemGalleryItem[];
  data?: NodeDataDetails;
  access?: SystemAccessPath[];
  usage?: SourcedMetric[];
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
