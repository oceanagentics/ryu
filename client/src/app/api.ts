import type { GraphSearchIntent } from "../../../shared/searchPresentation";
import type {
  GraphBootstrapPayload,
  GraphNode,
  GraphNodeKind,
  NodeLocalizationReviewInput,
  SupportedLocale,
} from "../../../shared/domain";
import type {
  RecordAggregateContentInput,
  RecordDeleteImpact,
  RecordDetailDto,
  RecordListDto,
  RecordPatchInput,
  RecordReviewInput,
  RecordValidationResult,
} from "../../../shared/recordApi";
import { appPath, bootstrapPath } from "./config";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(errorBody?.error ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchBootstrap(): Promise<GraphBootstrapPayload> {
  return request<GraphBootstrapPayload>(bootstrapPath);
}

export function fetchRecords(params = new URLSearchParams(), signal?: AbortSignal): Promise<RecordListDto> {
  const query = params.toString();
  return request<RecordListDto>(appPath(`/api/records${query ? `?${query}` : ""}`), { signal });
}

// The directory paginates these ordered records locally. Matching IDs are returned
// for the entire query, independently of the API's record-page limit.
export async function fetchGraphSearch(
  intent: GraphSearchIntent,
  locale: SupportedLocale,
  signal: AbortSignal,
): Promise<RecordListDto> {
  const filters = intent.filters;
  const params = new URLSearchParams({
    q: intent.query, locale,
    localeMode: intent.searchAllLanguages ? "all_locales" : "display_locale",
    reviewLocale: "requested", include: "matchReasons,matchingIds", limit: "100",
  });
  for (const [key, values] of Object.entries({
    recordDepth: filters.recordDepth,
    disciplines: filters.disciplines,
    dataType: filters.dataClaims.type, dataFormat: filters.dataClaims.format, dataStandard: filters.dataClaims.standard,
    accessType: filters.accessTypes, accessMethod: filters.accessMethods, reviewState: filters.reviewState,
  })) values.forEach(value => params.append(key, value));
  if (filters.localizationCoverage.length === 1) {
    params.set("localeAvailability", filters.localizationCoverage[0] === "current_locale" ? "available" : "missing");
  }
  const result = await fetchRecords(params, signal);
  let cursor = result.nextCursor;
  while (cursor) {
    params.set("cursor", cursor);
    params.set("include", "matchReasons");
    const page = await fetchRecords(params, signal);
    result.records.push(...page.records);
    cursor = page.nextCursor;
  }
  return { ...result, nextCursor: null };
}

export function fetchRecord(
  id: string,
  params = new URLSearchParams(),
): Promise<RecordDetailDto> {
  const query = params.toString();
  return request<RecordDetailDto>(
    appPath(`/api/records/${encodeURIComponent(id)}${query ? `?${query}` : ""}`),
  );
}

export function upsertRecord<I extends RecordAggregateContentInput>(
  id: string,
  input: I,
  options: { validateOnly?: boolean; recordUpdatedAt?: string; createOnly?: boolean } = {},
): Promise<RecordDetailDto<I["record"]["kind"]> | RecordValidationResult> {
  return request<RecordDetailDto<I["record"]["kind"]> | RecordValidationResult>(
    appPath(`/api/records/${encodeURIComponent(id)}${options.validateOnly ? "?validateOnly=true" : ""}`),
    {
      method: "PUT",
      headers: {
        ...(options.recordUpdatedAt ? { "x-ryu-record-updated-at": options.recordUpdatedAt } : {}),
        ...(options.createOnly ? { "x-ryu-create-only": "true" } : {}),
      },
      body: JSON.stringify(input),
    },
  );
}

export function patchRecord<K extends GraphNodeKind>(
  node: { id: string; kind: K },
  input: RecordPatchInput<NoInfer<K>>,
  options: { validateOnly?: boolean; recordUpdatedAt?: string } = {},
): Promise<RecordDetailDto<K> | RecordValidationResult> {
  return request<RecordDetailDto<K> | RecordValidationResult>(
    appPath(`/api/records/${encodeURIComponent(node.id)}${options.validateOnly ? "?validateOnly=true" : ""}`),
    {
      method: "PATCH",
      headers: options.recordUpdatedAt
        ? { "x-ryu-record-updated-at": options.recordUpdatedAt }
        : undefined,
      body: JSON.stringify(input),
    },
  );
}

export function deleteRecord(
  id: string,
  options: { validateOnly?: boolean; impactHash?: string; recordUpdatedAt?: string } = {},
): Promise<RecordDeleteImpact> {
  const params = new URLSearchParams();
  if (options.validateOnly) {
    params.set("validateOnly", "true");
  }
  if (options.impactHash) {
    params.set("impactHash", options.impactHash);
  }

  return request<RecordDeleteImpact>(
    appPath(`/api/records/${encodeURIComponent(id)}${params.size > 0 ? `?${params}` : ""}`),
    {
      method: "DELETE",
      headers: options.recordUpdatedAt
        ? { "x-ryu-record-updated-at": options.recordUpdatedAt }
        : undefined,
    },
  );
}

export function updateRecordReview(
  id: string,
  input: RecordReviewInput,
  recordUpdatedAt?: string,
): Promise<RecordDetailDto> {
  return request<RecordDetailDto>(appPath(`/api/records/${encodeURIComponent(id)}/review`), {
    method: "PATCH",
    headers: recordUpdatedAt
      ? { "x-ryu-record-updated-at": recordUpdatedAt }
      : undefined,
    body: JSON.stringify({
      locale: input.locale,
      reviewState: input.reviewState,
      reviewerNote: input.reviewerNote,
    }),
  });
}

export async function updateNodeLocalizationReview(
  id: string,
  locale: SupportedLocale,
  input: NodeLocalizationReviewInput,
): Promise<GraphNode> {
  const current = await fetchRecord(id);
  await updateRecordReview(id, { locale, ...input }, current.recordUpdatedAt);
  // Detail DTOs may omit neutral properties. Refresh the complete typed node
  // instead of replacing its facts with an empty object after a review edit.
  const node = (await fetchBootstrap()).nodes.find(node => node.id === id);
  if (!node) throw new Error(`Record no longer exists: ${id}`);
  return node;
}
