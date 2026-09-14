import type { SearchMatchReason } from "./searchPresentation";
import type {
  AccessMethod,
  SystemAccessType,
  DataFormat,
  DataStandard,
  DataType,
  Discipline,
  GraphEdge,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
  LocalizationByKind,
  LocalizationDetailsByKind,
  LocalizationMetadata,
  NodeByKind,
  ReviewSnapshot,
  RecordDepth,
  ReviewState,
  RyuRoute,
  SourceCollection,
  SupportedLocale,
} from "./domain";

export type RecordDtoScope = "public" | "admin" | "private";

export type RecordInclude =
  | "localizationSummary"
  | "localizations"
  | "edges"
  | "sources"
  | "routes"
  | "reviewHistory"
  | "matchReasons"
  | "matchingIds";

export type LocaleMode =
  | "locale_only"
  | "locale_with_fallbacks"
  | "display_locale"
  | "all_locales";

export type LocaleAvailability =
  | "available"
  | "missing"
  | "partial"
  | "complete";

export type ReviewLocaleMode = "requested" | "displayed" | "any";

export interface RecordSearchCursor {
  score?: number;
  title: string;
  id: string;
}

export interface RecordSearchQuery {
  q?: string;
  scope?: RecordDtoScope;
  countryCode: string[];
  disciplines: Discipline[];
  dataFormat: DataFormat[];
  dataStandard: DataStandard[];
  kind: GraphNodeKind[];
  geography: string[];
  dataType: DataType[];
  recordDepth: RecordDepth[];
  reviewState: ReviewState[];
  locale: SupportedLocale;
  localeMode: LocaleMode;
  localeAvailability?: LocaleAvailability;
  reviewLocale: ReviewLocaleMode;
  routeStatus: string[];
  routeCapability: string[];
  accessType: SystemAccessType[];
  accessMethod: AccessMethod[];
  include: RecordInclude[];
  limit: number;
  cursor?: RecordSearchCursor;
}

export type RecordAggregate<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: {
    node: GraphNode<Kind>;
    edges: GraphEdge[];
    matchReasons: SearchMatchReason[];
    score?: number;
    matchedLocale?: SupportedLocale | null;
  } & (Kind extends "system" ? { routes: RyuRoute[] } : {});
}[K];

export interface RecordListResult {
  records: RecordAggregate[];
  nextCursor: string | null;
  total: number;
  matchingIds?: string[];
}

type NeutralContent<K extends GraphNodeKind> = Pick<NodeByKind[K], "kind" | "recordDepth" | "properties" | "sources">
  & Pick<NodeByKind[K], Extract<"url" | "countryCode", keyof NodeByKind[K]>>;

export type RecordNeutralDto<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: Omit<NeutralContent<Kind>, "sources" | "properties"> & Partial<Pick<NeutralContent<Kind>, "sources" | "properties">>
    & Pick<GraphNode<Kind>, "id" | "createdAt" | "updatedAt">;
}[K];

interface RecordSummaryMetadata {
  title: string;
  summary: string | null;
  availableLocales: SupportedLocale[];
  missingLocales: SupportedLocale[];
  reviewStatesByLocale: Partial<Record<SupportedLocale, ReviewState>>;
  requestedLocale: SupportedLocale;
  displayLocale: SupportedLocale | null;
  isLocaleFallback: boolean;
  updatedAt: string;
  recordUpdatedAt: string;
  matchReasons?: SearchMatchReason[];
  score?: number;
  matchedLocale?: SupportedLocale | null;
}

export type RecordSummaryDto<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: RecordSummaryMetadata & Pick<GraphNode<Kind>, "id" | "kind" | "recordDepth">
    & Pick<GraphNode<Kind>, Extract<"countryCode" | "url", keyof GraphNode<Kind>>>;
}[K];

export type PublicRecordLocalizationDto<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: Omit<LocalizationByKind[Kind], "review"> & {
    review: Pick<ReviewSnapshot, "state" | "date"> & { history?: Pick<ReviewSnapshot, "state" | "date">[] };
  };
}[K];
export type AdminRecordLocalizationDto<K extends GraphNodeKind = GraphNodeKind> = LocalizationByKind[K];
export type PrivateRecordLocalizationDto<K extends GraphNodeKind = GraphNodeKind> = LocalizationByKind[K];

export interface PublicRouteDto {
  id: string;
  nodeId: string;
  status: string;
  mode: string;
  priority: number;
  capabilities: string[];
  format: string | null;
  contractRef: string | null;
  caveat: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRouteDto extends PublicRouteDto {
  target: string | null;
  upstream: string | null;
}

export type PrivateRouteDto = RyuRoute;

export type RecordLocalizationDto<K extends GraphNodeKind = GraphNodeKind> =
  | PublicRecordLocalizationDto<K>
  | AdminRecordLocalizationDto<K>
  | PrivateRecordLocalizationDto<K>;

export type RecordRouteDto = PublicRouteDto | AdminRouteDto | PrivateRouteDto;

export type RecordDetailDto<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: RecordSummaryDto<Kind> & {
    sourceCompleteness?: RecordSourceCompleteness;
    record: RecordNeutralDto<Kind>;
    localizations?: Partial<Record<SupportedLocale, RecordLocalizationDto<Kind>>>;
    edges?: GraphEdge[];
  } & (Kind extends "system" ? { routes?: RecordRouteDto[] } : {});
}[K];

export interface RecordListDto {
  records: RecordSummaryDto[];
  nextCursor: string | null;
  total: number;
  matchingIds?: string[];
}

export type LocalizationContentInput<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: Pick<LocalizationByKind[Kind], "title"> & Partial<Omit<LocalizationByKind[Kind], keyof LocalizationMetadata | "title" | "details">> & {
    details?: Partial<LocalizationDetailsByKind[Kind]>;
    translatedFromLocale?: SupportedLocale | null;
  };
}[K];

export type RecordNeutralContentInput<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: Pick<NeutralContent<Kind>, "kind"> & Partial<Omit<NeutralContent<Kind>, "kind">>;
}[K];

export interface RecordEdgeInput {
  sources?: SourceCollection;
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: GraphEdgeKind;
  note?: string | null;
  properties?: Record<string, unknown>;
}

export interface RecordRouteInput {
  id: string;
  nodeId?: string;
  status: string;
  mode: string;
  priority?: number;
  capabilities?: string[];
  target?: string | null;
  upstream?: string | null;
  format?: string | null;
  contractRef?: string | null;
  caveat?: string | null;
  properties?: Record<string, unknown>;
}

export type RecordAggregateContentInput<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: {
    id?: string;
    record: RecordNeutralContentInput<Kind>;
    localizations?: Partial<Record<SupportedLocale, LocalizationContentInput<Kind>>>;
    edges?: RecordEdgeInput[];
    incomplete?: boolean;
  } & (Kind extends "system" ? { routes?: RecordRouteInput[] } : {});
}[K];

export type RecordNeutralPatchInput<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: Partial<Omit<RecordNeutralContentInput<Kind>, "sources" | "properties">> & {
    sourcesReplace?: SourceCollection;
    propertiesReplace?: NodeByKind[Kind]["properties"];
  };
}[K];

export type LocalizationPatchInput<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]:
    | ({ mode: "patch" } & Partial<Omit<LocalizationContentInput<Kind>, "details">> & { detailsReplace?: Partial<LocalizationDetailsByKind[Kind]> })
    | ({ mode: "replace" } & LocalizationContentInput<Kind>);
}[K];

export type RecordPatchInput<K extends GraphNodeKind = GraphNodeKind> = {
  [Kind in K]: {
    record?: RecordNeutralPatchInput<Kind>;
    localizations?: Partial<Record<SupportedLocale, LocalizationPatchInput<Kind>>>;
    edges?: { upsert?: RecordEdgeInput[]; delete?: string[] };
  } & (Kind extends "system" ? { routes?: { upsert?: RecordRouteInput[]; delete?: string[] } } : {});
}[K];

export interface RecordReviewInput {
  locale: SupportedLocale;
  reviewState: ReviewState;
  reviewerNote?: string | null;
}

export interface RecordMutationOptions {
  validateOnly?: boolean;
  recordUpdatedAt?: string | null;
  createOnly?: boolean;
}

export interface RecordValidationIssue {
  path?: string;
  index?: number;
  recordId?: string;
  message: string;
}

export interface RecordSourceCompleteness {
  status: "complete" | "partial" | "missing";
  referencedSources: number;
  resolvedSources: number;
  issues: RecordValidationIssue[];
}

export interface RecordValidationResult {
  valid: boolean;
  recordId?: string;
  issues: RecordValidationIssue[];
  warnings?: string[];
  affectedSections?: string[];
  recordUpdatedAt?: string | null;
  sourceCompleteness?: RecordSourceCompleteness;
}

export interface BulkRecordValidationInput {
  validateOnly: true;
  records: RecordAggregateContentInput[];
}

export interface BulkRecordValidationResult {
  valid: boolean;
  issues: RecordValidationIssue[];
  checkedRecords: number;
}

export interface RecordDeleteImpact {
  recordId: string;
  recordUpdatedAt: string;
  nodeRows: number;
  localizationRows: number;
  inboundEdges: number;
  outboundEdges: number;
  routeRows: number;
  affectedSavedViews: string[];
  impactHash: string;
}
