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
  NodeLocalization,
  LocalizationReview,
  ReviewSnapshot,
  NodeLocalizationDetails,
  NodeProperties,
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

export interface RecordAggregate {
  node: GraphNode;
  edges: GraphEdge[];
  routes: RyuRoute[];
  matchReasons: SearchMatchReason[];
  score?: number;
  matchedLocale?: SupportedLocale | null;
}

export interface RecordListResult {
  records: RecordAggregate[];
  nextCursor: string | null;
  total: number;
  matchingIds?: string[];
}

export interface RecordNeutralDto {
  sources?: SourceCollection;
  id: string;
  kind: GraphNodeKind;
  countryCode: string | null;
  url: string | null;
  recordDepth: RecordDepth;
  properties?: NodeProperties;
  createdAt: string;
  updatedAt: string;
}

export interface RecordSummaryDto {
  id: string;
  kind: GraphNodeKind;
  countryCode: string | null;
  url: string | null;
  recordDepth: RecordDepth;
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

export interface PublicRecordLocalizationDto {
  locale: SupportedLocale;
  title: string;
  summary: string | null;
  description: string | null;
  details: NodeLocalizationDetails;
  translatedFromLocale: SupportedLocale | null;
  contentUpdatedAt: string;
  review: Pick<ReviewSnapshot, "state" | "date"> & { history?: Pick<ReviewSnapshot, "state" | "date">[] };
  createdAt: string;
  updatedAt: string;
}

export interface AdminRecordLocalizationDto extends PublicRecordLocalizationDto {
  review: LocalizationReview;
}

export type PrivateRecordLocalizationDto = NodeLocalization;

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

export type RecordLocalizationDto =
  | PublicRecordLocalizationDto
  | AdminRecordLocalizationDto
  | PrivateRecordLocalizationDto;

export type RecordRouteDto = PublicRouteDto | AdminRouteDto | PrivateRouteDto;

export interface RecordDetailDto extends RecordSummaryDto {
  sourceCompleteness?: RecordSourceCompleteness;
  record: RecordNeutralDto;
  localizations?: Partial<Record<SupportedLocale, RecordLocalizationDto>>;
  edges?: GraphEdge[];
  routes?: RecordRouteDto[];
}

export interface RecordListDto {
  records: RecordSummaryDto[];
  nextCursor: string | null;
  total: number;
  matchingIds?: string[];
}

export interface LocalizationContentInput {
  title: string;
  summary?: string | null;
  description?: string | null;
  details?: Partial<NodeLocalizationDetails>;
  translatedFromLocale?: SupportedLocale | null;
}

export interface RecordNeutralContentInput {
  sources?: SourceCollection;
  kind: GraphNodeKind;
  countryCode?: string | null;
  url?: string | null;
  recordDepth?: RecordDepth;
  properties?: NodeProperties;
}

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

export interface RecordAggregateContentInput {
  id?: string;
  record: RecordNeutralContentInput;
  localizations?: Partial<Record<SupportedLocale, LocalizationContentInput>>;
  edges?: RecordEdgeInput[];
  routes?: RecordRouteInput[];
  incomplete?: boolean;
}

export interface RecordNeutralPatchInput {
  sourcesReplace?: SourceCollection;
  kind?: GraphNodeKind;
  countryCode?: string | null;
  url?: string | null;
  recordDepth?: RecordDepth;
  propertiesReplace?: NodeProperties;
}

export type LocalizationPatchInput =
  | ({
      mode: "patch";
    } & Partial<Omit<LocalizationContentInput, "details">> & {
      detailsReplace?: Partial<NodeLocalizationDetails>;
    })
  | ({
      mode: "replace";
    } & LocalizationContentInput);

export interface RecordPatchInput {
  record?: RecordNeutralPatchInput;
  localizations?: Partial<Record<SupportedLocale, LocalizationPatchInput>>;
  edges?: {
    upsert?: RecordEdgeInput[];
    delete?: string[];
  };
  routes?: {
    upsert?: RecordRouteInput[];
    delete?: string[];
  };
}

export interface RecordReviewInput {
  locale: SupportedLocale;
  reviewState?: ReviewState;
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
