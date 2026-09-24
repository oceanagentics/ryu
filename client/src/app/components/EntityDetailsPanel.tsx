import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CloseOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Collapse,
  ConfigProvider,
  Drawer,
  Flex,
  Input,
  List,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
  theme,
} from "antd";

import { metricDefinitions } from "../../../../shared/domain";
import type {
  GraphEdge,
  GraphNode,
  ReviewState,
  RyuRoute,
  SourceRef,
  SourceCollection,
  SupportedLocale,
  SystemDataDescriptorCategory,
} from "../../../../shared/domain";
import type { RecordDetailDto, RecordLocalizationDto } from "../../../../shared/recordApi";
import { fetchRecord, updateNodeLocalizationReview } from "../api";
import { appPath, canReviewNodes, isPublicApp, isStaticApp } from "../config";
import {
  vocabularyLabel,
  formatDateTime,
  formatMetricValue,
  humanizeCode,
  localeName,
  t,
} from "../i18n";
import { operatorNodesForSystem } from "../graph/indexGraph";
import {
  countryTreatyParticipation,
  nodeTitle,
  organizationMetrics,
  organizationOffices,
  systemMetrics,
  resolveNodeDisplay,
  systemAccessPaths,
  systemDataDescriptors,
  systemGallery,
  type ResolvedSourcedMetric,
  type ResolvedCountryTreatyParticipation,
  type ResolvedOrganizationOffice,
  type ResolvedSystemAccessPath,
  type ResolvedSystemDataDescriptor,
  type ResolvedSystemGalleryItem,
} from "../localization";
import { useGraphStore } from "../state/graphStore";

function tagColor(value: string): string | undefined {
  if (value === "rich" || value === "human_reviewed") {
    return "green";
  }
  if (value === "thin" || value === "agent_researched") {
    return "blue";
  }
  if (value === "needs_revision") {
    return "red";
  }

  return undefined;
}

function resolveGalleryUrl(url: string): string {
  if (/^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(url)) {
    return url;
  }

  return url.startsWith("/") ? appPath(url) : url;
}

const reviewStates: ReviewState[] = [
  "agent_researched",
  "human_reviewed",
  "needs_revision",
];

function InlineField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="entity-detail-item">
      <Typography.Text className="entity-detail-label">{label}</Typography.Text>
      <div className="entity-detail-value">{children}</div>
    </div>
  );
}

function EmptyValue({ children }: { children?: ReactNode }) {
  const locale = useGraphStore((state) => state.locale);
  return <Typography.Text type="secondary">{children ?? t(locale, "common.notRecorded")}</Typography.Text>;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="entity-detail-section">
      <Typography.Text className="entity-detail-section-title" strong>{title}</Typography.Text>
      {children}
    </section>
  );
}

function SourceLink({ source, sources }: { source: SourceRef; sources?: SourceCollection }) {
  const locale = useGraphStore((state) => state.locale);
  const nodeSource = useGraphStore((state) => state.selectedEntityId ? state.graph?.nodeById[state.selectedEntityId]?.sources[source] : undefined);
  const fullSource = sources ? sources[source] : nodeSource;
  const sourceTitle = fullSource?.title[locale] ?? fullSource?.title.en ?? source;
  const sourceDescription = fullSource?.description?.[locale] ?? fullSource?.description?.en;
  const tooltip = fullSource ? (
    <Flex className="source-record-tooltip" vertical gap={2}>
      <Typography.Text strong>{sourceTitle}</Typography.Text>
      {sourceDescription ? <Typography.Text>{sourceDescription}</Typography.Text> : null}
      <Typography.Text>{t(locale, "source.id")}: {fullSource.id}</Typography.Text>
      <Typography.Text>{t(locale, "source.accessed")}: {fullSource.accessedAt}</Typography.Text>
      <Typography.Text>{t(locale, "source.url")}: {fullSource.url}</Typography.Text>
    </Flex>
  ) : t(locale, "source.notLoaded", { id: source });
  return (
    <span className="source-record-link">
      <Typography.Link href={fullSource?.url} target="_blank" rel="noreferrer">{sourceTitle}</Typography.Link>
      <Tooltip title={tooltip}><InfoCircleOutlined className="source-record-info-icon" /></Tooltip>
    </span>
  );
}

function descriptorList(
  descriptors: ResolvedSystemDataDescriptor[],
  category: SystemDataDescriptorCategory,
) {
  return descriptors.filter((descriptor) => descriptor.category === category);
}

function DescriptorTags({ descriptors, emptyDescription }: { descriptors: ResolvedSystemDataDescriptor[]; emptyDescription?: string }) {
  const locale = useGraphStore((state) => state.locale);
  const sources = useGraphStore((state) => state.selectedEntityId ? state.graph?.nodeById[state.selectedEntityId]?.sources : undefined);

  if (descriptors.length === 0) {
    return emptyDescription ? (
      <Tooltip title={<Flex className="source-record-tooltip"><Typography.Text>{emptyDescription}</Typography.Text></Flex>} trigger={["hover", "focus"]}>
        <Tag bordered={false} tabIndex={0}>{t(locale, "common.notRecorded")}</Tag>
      </Tooltip>
    ) : <EmptyValue />;
  }

  return (
    <Flex gap={4} wrap>
      {descriptors.map((descriptor) => {
        const source = descriptor.source ? sources?.[descriptor.source] : undefined;
        const sourceTitle = descriptor.source ? source?.title[locale] ?? descriptor.source : null;
        return (
          <Tooltip
            key={descriptor.id}
            trigger={["hover", "focus"]}
            title={(descriptor.description || sourceTitle) ? (
              <Flex className="source-record-tooltip" vertical gap={2}>
                {descriptor.description ? <Typography.Text>{descriptor.description}</Typography.Text> : null}
                {sourceTitle ? (
                  <Typography.Text>
                    {t(locale, "common.source")}: {source ? (
                      <Typography.Link href={source.url} target="_blank" rel="noreferrer" underline>{sourceTitle}</Typography.Link>
                    ) : sourceTitle}
                  </Typography.Text>
                ) : null}
                {source ? <Typography.Text>{t(locale, "source.accessed")}: {source.accessedAt}</Typography.Text> : null}
              </Flex>
            ) : null}
          >
            <Tag bordered={false} tabIndex={0}>
              {descriptor.localizedLabel}
            </Tag>
          </Tooltip>
        );
      })}
    </Flex>
  );
}

function MetricValue({ metric }: { metric: ResolvedSourcedMetric | null }) {
  const locale = useGraphStore((state) => state.locale);
  if (!metric) {
    return <EmptyValue />;
  }

  return (
    <Flex vertical gap={2}>
      <Typography.Text>{formatMetricValue(metric, locale)}</Typography.Text>
      {metric.description ? (
        <Typography.Text type="secondary">{metric.description}</Typography.Text>
      ) : null}
      <Typography.Text className="entity-detail-caption" type="secondary">
        {t(locale, "common.source")}: <SourceLink source={metric.source} />
        {metric.observedAt
          ? ` · ${t(locale, "common.observed", { date: metric.observedAt })}`
          : ""}
      </Typography.Text>
    </Flex>
  );
}

function AccessDescription({ path }: { path: ResolvedSystemAccessPath }) {
  const locale = useGraphStore((state) => state.locale);
  const browserUrl = /^https?:\/\//i.test(path.url) && !/\{[^}]+\}/.test(path.url);

  return (
    <Flex vertical gap={4}>
      <Flex align="center" gap={6} wrap>
        {browserUrl
          ? <Typography.Link href={path.url} target="_blank" rel="noreferrer">{path.label}</Typography.Link>
          : <Typography.Text>{path.label}</Typography.Text>}
        {path.methods.map(method => <Tag key={method} bordered={false}>{vocabularyLabel(locale, "accessMethods", method)}</Tag>)}
        <Tag bordered={false}>{vocabularyLabel(locale, "accessCosts", path.cost)}</Tag>
        {path.requirements === null
          ? <Tag bordered={false}>{t(locale, "details.accessRequirementsUnknown")}</Tag>
          : path.requirements.length === 0
            ? <Tag bordered={false}>{t(locale, "details.accessNoRequirements")}</Tag>
            : path.requirements.map(requirement => <Tag key={requirement} bordered={false}>{vocabularyLabel(locale, "accessRequirements", requirement)}</Tag>)}
      </Flex>
      <Typography.Text type="secondary">{path.description}</Typography.Text>
      {!browserUrl && <Typography.Text code copyable>{path.url}</Typography.Text>}
      <Typography.Text className="entity-detail-caption" type="secondary">
        {t(locale, "common.source")}: {path.sourceRefs.map(source => <span key={source}><SourceLink source={source} />{" "}</span>)}
      </Typography.Text>
    </Flex>
  );
}

function RyuRouteDescription({ route }: { route: RyuRoute }) {
  const locale = useGraphStore((state) => state.locale);

  return (
    <Flex vertical gap={4}>
      <Flex align="center" gap={6} wrap>
        <Typography.Text>{route.id}</Typography.Text>
        <Tag bordered={false}>{humanizeCode(route.status)}</Tag>
        <Tag bordered={false}>{humanizeCode(route.mode)}</Tag>
        <Tag bordered={false}>{t(locale, "details.priority", { priority: route.priority })}</Tag>
        {route.capabilities.map((capability) => (
          <Tag key={capability} bordered={false}>{humanizeCode(capability)}</Tag>
        ))}
      </Flex>
      {route.target ? (
        <InlineField label={t(locale, "details.target")}>{route.target}</InlineField>
      ) : null}
      {route.upstream ? (
        <InlineField label={t(locale, "details.upstream")}>{route.upstream}</InlineField>
      ) : null}
      {route.format ? (
        <InlineField label={t(locale, "details.format")}>{route.format}</InlineField>
      ) : null}
      {route.contractRef ? (
        <InlineField label={t(locale, "details.contract")}>{route.contractRef}</InlineField>
      ) : null}
      {route.caveat ? (
        <Typography.Text type="secondary">{route.caveat}</Typography.Text>
      ) : null}
    </Flex>
  );
}

function Gallery({ items }: { items: ResolvedSystemGalleryItem[] }) {
  const locale = useGraphStore((state) => state.locale);
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) {
    return <EmptyValue>{t(locale, "details.noGalleryItem")}</EmptyValue>;
  }

  const activeItem = items[Math.min(activeIndex, items.length - 1)];
  const activeItemUrl = resolveGalleryUrl(activeItem.url);
  const activeItemThumbnailUrl = resolveGalleryUrl(activeItem.thumbnailUrl ?? activeItem.url);
  const hasMultipleItems = items.length > 1;
  const previousItem = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? items.length - 1 : currentIndex - 1,
    );
  };
  const nextItem = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
  };

  return (
    <div className="entity-gallery-slider">
      <figure className="entity-gallery-item" key={activeItem.id}>
        {activeItem.type === "image" ? (
          <a
            className="entity-gallery-image-link"
            href={activeItemUrl}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={activeItemThumbnailUrl}
              alt={activeItem.altText ?? activeItem.title ?? activeItem.caption ?? t(locale, "details.galleryImageAlt")}
              loading="lazy"
            />
          </a>
        ) : (
          <iframe
            src={activeItemUrl}
            title={activeItem.title ?? activeItem.id}
            loading="lazy"
          />
        )}
        <figcaption>
          {activeItem.title ? <Typography.Text>{activeItem.title}</Typography.Text> : null}
          {activeItem.caption ? (
            <Typography.Text className="entity-detail-caption" type="secondary">{activeItem.caption}</Typography.Text>
          ) : null}
          <Typography.Text className="entity-detail-caption" type="secondary">
            {t(locale, "common.source")}: <SourceLink source={activeItem.source} />
          </Typography.Text>
        </figcaption>
      </figure>
      {hasMultipleItems ? (
        <Flex className="entity-gallery-controls" align="center" justify="space-between">
          <Button
            aria-label={t(locale, "details.previousGalleryImage")}
            icon={<LeftOutlined />}
            size="small"
            type="text"
            onClick={previousItem}
          />
          <Typography.Text className="entity-detail-caption" type="secondary">
            {Math.min(activeIndex, items.length - 1) + 1} / {items.length}
          </Typography.Text>
          <Button
            aria-label={t(locale, "details.nextGalleryImage")}
            icon={<RightOutlined />}
            size="small"
            type="text"
            onClick={nextItem}
          />
        </Flex>
      ) : null}
    </div>
  );
}

function EntityIntro({
  entity,
  operatorNodes,
}: {
  entity: GraphNode;
  operatorNodes: GraphNode[];
}) {
  const locale = useGraphStore((state) => state.locale);
  const localization = resolveNodeDisplay(entity, locale);
  const isSystem = entity.kind === "system";
  const operatorNames = operatorNodes.map((operator) => nodeTitle(operator, locale));

  return (
    <section className="entity-system-intro">
      <Flex className="entity-system-heading" vertical gap={4}>
        <Typography.Title className="entity-system-name" level={3}>
          {localization.title}
        </Typography.Title>
        {isSystem ? (
          <Typography.Text className="entity-system-operator">
            {operatorNames.length > 0
              ? t(locale, "details.operatedBy", { operator: operatorNames.join(", ") })
              : t(locale, "details.operatorNotRecorded")}
          </Typography.Text>
        ) : null}
        {localization.isLocaleFallback ? (
          <Tag bordered={false}>
            {localization.displayLocale
              ? t(locale, "common.showingLocale", {
                  locale: localeName(localization.displayLocale, locale),
                })
              : t(locale, "common.noLocalization")}
          </Tag>
        ) : null}
        {entity.kind !== "country" && (entity.url ? (
          <Typography.Link
            className="entity-system-url"
            href={entity.url}
            target="_blank"
            rel="noreferrer"
          >
            {entity.url}
          </Typography.Link>
        ) : (
          <Typography.Text className="entity-system-url" type="secondary">
            {t(locale, "details.mainUrlNotRecorded")}
          </Typography.Text>
        ))}
      </Flex>
      {localization.summary ? (
        <Typography.Paragraph className="entity-detail-note">
          {localization.summary}
        </Typography.Paragraph>
      ) : null}
      {isSystem ? <Gallery items={systemGallery(entity, resolveNodeDisplay(entity, locale))} /> : null}
      {localization.kind !== "country" && localization.description ? (
        <Typography.Paragraph className="entity-detail-note">
          {localization.description}
        </Typography.Paragraph>
      ) : null}
    </section>
  );
}

function treatyDate(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function TreatyParticipationList({ items }: { items: ResolvedCountryTreatyParticipation[] }) {
  const locale = useGraphStore((state) => state.locale);
  if (!items.length) return null;

  return (
    <DetailSection title={t(locale, "details.treatyParticipation")}>
      <List<ResolvedCountryTreatyParticipation>
        className="entity-detail-list"
        dataSource={items}
        renderItem={(item) => (
          <List.Item>
            <Flex vertical gap={6} style={{ width: "100%" }}>
              <Flex gap={8} align="center" wrap>
                <Typography.Text strong>{item.title}</Typography.Text>
                <Tag bordered={false}>{vocabularyLabel(locale, "treatyParticipationStatuses", item.status)}</Tag>
              </Flex>
              {item.description ? <Typography.Text>{item.description}</Typography.Text> : null}
              <div className="entity-detail-grid">
                {item.signatureDate ? <InlineField label={t(locale, "details.signatureDate")}>{treatyDate(item.signatureDate, locale)}</InlineField> : null}
                {item.consentMethod ? <InlineField label={t(locale, "details.consentMethod")}>{vocabularyLabel(locale, "treatyConsentMethods", item.consentMethod)}</InlineField> : null}
                {item.depositDate ? <InlineField label={t(locale, "details.depositDate")}>{treatyDate(item.depositDate, locale)}</InlineField> : null}
                {item.effectiveDate ? <InlineField label={t(locale, "details.effectiveDate")}>{treatyDate(item.effectiveDate, locale)}</InlineField> : null}
                {item.focalPoint ? <InlineField label={t(locale, "details.focalPoint")}>{item.focalPoint}</InlineField> : null}
              </div>
              {item.focalPointUrl ? (
                <Typography.Link href={item.focalPointUrl} target="_blank" rel="noreferrer">
                  {t(locale, "details.officialDirectory")}
                </Typography.Link>
              ) : null}
              <Flex vertical gap={2}>
                {item.sourceRefs.map(source => <SourceLink key={source} source={source} />)}
              </Flex>
            </Flex>
          </List.Item>
        )}
        size="small"
      />
    </DetailSection>
  );
}

function partialDate(value: string, locale: SupportedLocale): string {
  if (/^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${value}-01T00:00:00Z`));
  }
  return treatyDate(value, locale);
}

function OrganizationProfile({ organization }: { organization: GraphNode<"organization"> }) {
  const locale = useGraphStore((state) => state.locale);
  const localization = resolveNodeDisplay(organization, locale);
  const metrics = organizationMetrics(organization, localization);
  const offices = organizationOffices(organization, localization);
  const established = organization.properties.established;
  const profile = localization.details.profile;
  const gaps = localization.details.researchGaps;

  return (
    <>
      <DetailSection title={t(locale, "details.organization")}>
        <div className="entity-detail-grid">
          <InlineField label={t(locale, "details.mission")}>
            {profile?.mission ? (
              <Flex vertical gap={2}>
                <Typography.Text>{profile.mission}</Typography.Text>
                {profile.sourceRefs.map(source => <SourceLink key={source} source={source} />)}
              </Flex>
            ) : <EmptyValue />}
          </InlineField>
          <InlineField label={t(locale, "details.established")}>
            {established ? (
              <Flex vertical gap={2}>
                <Typography.Text>{partialDate(established.date, locale)}</Typography.Text>
                <SourceLink source={established.source} />
              </Flex>
            ) : <EmptyValue>{gaps?.established}</EmptyValue>}
          </InlineField>
          <InlineField label={t(locale, "details.organizationScale")}>
            {metrics.length ? (
              <Flex vertical gap={8}>
                {metrics.map(metric => (
                  <Flex key={metric.id} vertical gap={2}>
                    <Typography.Text className="entity-detail-label">{metric.label}</Typography.Text>
                    <MetricValue metric={metric} />
                  </Flex>
                ))}
              </Flex>
            ) : <EmptyValue>{gaps?.scale}</EmptyValue>}
          </InlineField>
        </div>
      </DetailSection>
      <DetailSection title={t(locale, "details.offices")}>
        <List<ResolvedOrganizationOffice>
          className="entity-detail-list"
          dataSource={offices}
          locale={{ emptyText: gaps?.officeLocations || t(locale, "common.notRecorded") }}
          renderItem={(office) => (
            <List.Item>
              <Flex vertical gap={2}>
                <Flex align="center" gap={6} wrap>
                  <Tag bordered={false}>{vocabularyLabel(locale, "organizationOfficeKinds", office.kind)}</Tag>
                  <Typography.Text>{office.location}</Typography.Text>
                </Flex>
                <SourceLink source={office.source} />
              </Flex>
            </List.Item>
          )}
          size="small"
        />
      </DetailSection>
    </>
  );
}

function relationshipLabel(
  relationship: GraphEdge,
  currentEntityId: string,
  locale: SupportedLocale,
) {
  const direction =
    relationship.sourceNodeId === currentEntityId ? "outgoing" : "incoming";
  return `${vocabularyLabel(locale, "edgeKinds", relationship.kind)} (${vocabularyLabel(locale, "relationshipDirections", direction)})`;
}

function ReviewSection({ entity }: { entity: GraphNode }) {
  const updateNode = useGraphStore((state) => state.updateNode);
  const locale = useGraphStore((state) => state.locale);
  const localization = resolveNodeDisplay(entity, locale);
  const reviewLocale = localization.displayLocale;
  const currentReviewState = localization.review?.state ?? "agent_researched";
  const [reviewState, setReviewState] = useState<ReviewState>(currentReviewState);
  const [reviewerNote, setReviewerNote] = useState(localization.review?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<(RecordLocalizationDto["review"] & { locale: SupportedLocale })[]>();
  const [historyError, setHistoryError] = useState(false);
  const [showWholeHistory, setShowWholeHistory] = useState(false);
  const historyNewestFirst = (reviewHistory ?? []).slice().reverse().sort((a, b) =>
    (b.date ? Date.parse(b.date) : -Infinity) - (a.date ? Date.parse(a.date) : -Infinity));

  useEffect(() => { setShowWholeHistory(false); }, [entity.id]);

  useEffect(() => {
    let active = true;
    setReviewHistory(undefined);
    setHistoryError(false);
    if (isStaticApp) {
      setReviewHistory([]);
      return () => { active = false; };
    }
    fetchRecord(entity.id, new URLSearchParams({ include: "reviewHistory" }))
      .then((record) => {
        if (active) setReviewHistory(Object.values(record.localizations ?? {}).flatMap(localization =>
          localization?.review.history?.map((snapshot: NonNullable<RecordLocalizationDto["review"]["history"]>[number]) => ({ ...snapshot, locale: localization.locale })) ?? []));
      })
      .catch(() => {
        if (active) setHistoryError(true);
      });
    return () => { active = false; };
  }, [entity.id, entity.localizations]);

  useEffect(() => {
    setReviewState(currentReviewState);
    setReviewerNote(localization.review?.note ?? "");
    setError(null);
    setSaving(false);
  }, [currentReviewState, entity.id, localization.displayLocale, localization.review?.note]);

  const normalizedReviewerNote = reviewerNote.trim() || null;
  const reviewStateOptions = reviewStates.map((value) => ({
    label: vocabularyLabel(locale, "reviewStates", value),
    value,
  }));

  async function saveReview() {
    if (!reviewLocale) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updatedNode = await updateNodeLocalizationReview(
        entity.id,
        reviewLocale,
        {
          reviewState,
          reviewerNote: normalizedReviewerNote,
        },
      );
      updateNode(updatedNode);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t(locale, "details.reviewUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DetailSection title={t(locale, "details.review")}>
      {!canReviewNodes ? (
        <InlineField label={t(locale, "details.reviewState")}>
          {reviewLocale ? <Tag>{localeName(reviewLocale, locale)}</Tag> : null}
          {localization.review?.state ? (
            <Tag bordered={false} color={tagColor(localization.review?.state)}>
              {vocabularyLabel(locale, "reviewStates", localization.review?.state)}
            </Tag>
          ) : <EmptyValue />}
        </InlineField>
      ) : null}
      {!canReviewNodes ? (
        <InlineField label={t(locale, "details.reviewDate")}>
          {formatDateTime(localization.review?.date ?? null, locale) ?? <EmptyValue />}
        </InlineField>
      ) : null}
      {canReviewNodes ? <div className="entity-detail-grid">
        <InlineField label={t(locale, "details.displayedLocale")}>
          {reviewLocale ? (
            <Tag bordered={false}>{localeName(reviewLocale, locale)}</Tag>
          ) : (
            <EmptyValue>{t(locale, "common.noLocalization")}</EmptyValue>
          )}
        </InlineField>
        <InlineField label={t(locale, "details.reviewState")}>
          <Select
            className="entity-review-control"
            options={reviewStateOptions}
            size="small"
            value={reviewState}
            onChange={(value) => setReviewState(value)}
          />
        </InlineField>
        <InlineField label={t(locale, "details.reviewerNote")}>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 7 }}
            className="entity-review-note"
            value={reviewerNote}
            onChange={(event) => setReviewerNote(event.target.value)}
          />
        </InlineField>
        <InlineField label={t(locale, "details.reviewer")}>
          {localization.review?.reviewer ?? <EmptyValue />}
        </InlineField>
        <InlineField label={t(locale, "details.reviewDate")}>
          {formatDateTime(localization.review?.date ?? null, locale) ?? <EmptyValue />}
        </InlineField>
      </div> : null}
      {canReviewNodes ? (
        <Flex align="center" justify="space-between" gap={8}>
          {error ? (
            <Alert className="entity-review-error" message={error} showIcon type="error" />
          ) : <span />}
          <Button
            disabled={!reviewLocale}
            loading={saving}
            size="small"
            type="primary"
            onClick={saveReview}
          >
            {t(locale, "details.saveReview")}
          </Button>
        </Flex>
      ) : null}
      <Flex vertical gap={8}>
        <Button
          type="link"
          size="small"
          style={{ alignSelf: "flex-start", padding: 0 }}
          aria-expanded={showWholeHistory}
          onClick={() => setShowWholeHistory(!showWholeHistory)}
        >
          {t(locale, "details.reviewHistory")}
        </Button>
        {showWholeHistory && (historyError ? (
          <Alert message={t(locale, "details.reviewHistoryFailed")} type="error" showIcon />
        ) : (
          <List
            size="small"
            loading={reviewHistory === undefined}
            locale={{ emptyText: t(locale, "details.noReviewHistory") }}
            dataSource={historyNewestFirst}
            renderItem={(event) => (
              <List.Item>
                <Flex className="entity-review-history-entry full-width" vertical gap={12}>
                  <Flex wrap gap={16}>
                    <InlineField label={t(locale, "details.localization")}>
                      {localeName(event.locale, locale)}
                    </InlineField>
                    <InlineField label={t(locale, "details.state")}>
                      {vocabularyLabel(locale, "reviewStates", event.state)}
                    </InlineField>
                    {canReviewNodes ? (
                      <InlineField label={t(locale, "details.reviewer")}>
                        {"reviewer" in event && event.reviewer ? event.reviewer : <EmptyValue />}
                      </InlineField>
                    ) : null}
                    <InlineField label={t(locale, "details.reviewDate")}>
                      {formatDateTime(event.date, locale) ?? <EmptyValue />}
                    </InlineField>
                  </Flex>
                  {canReviewNodes ? (
                    <InlineField label={t(locale, "details.reviewerNote")}>
                      {"note" in event && event.note ? event.note : <EmptyValue />}
                    </InlineField>
                  ) : null}
                </Flex>
              </List.Item>
            )}
          />
        ))}
      </Flex>
    </DetailSection>
  );
}

function RawRecordFields({
  entity,
  relationships,
  ryuRoutes,
}: {
  entity: GraphNode;
  relationships: GraphEdge[];
  ryuRoutes: RyuRoute[];
}) {
  const locale = useGraphStore((state) => state.locale);
  const [record, setRecord] = useState<RecordDetailDto>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRecord(entity.id, new URLSearchParams({ include: "localizations,reviewHistory,edges,routes,sources" }))
      .then((result) => { if (active) setRecord(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [entity.id]);

  if (failed) return <Alert message={t(locale, "details.rawFieldsFailed")} type="error" showIcon />;
  if (!record) return <Spin />;

  const node = record.record;
  const tables = {
    nodes: [{
      id: node.id,
      kind: node.kind,
      ...(node.kind === "country" ? { country_code: node.countryCode } : { url: node.url }),
      record_depth: node.recordDepth,
      properties_json: node.properties ?? entity.properties,
      sources: node.sources,
      created_at: node.createdAt,
      updated_at: node.updatedAt,
    }],
    node_localizations: Object.values(record.localizations ?? {}).flatMap((localization) => localization ? [{
      node_id: node.id,
      locale: localization.locale,
      title: localization.title,
      summary: localization.summary,
      ...(node.kind === "country" ? {} : { description: "description" in localization ? localization.description : null }),
      details_json: localization.details,
      translated_from_locale: localization.translatedFromLocale,
      content_updated_at: localization.contentUpdatedAt,
      review_json: { history: localization.review.history },
      created_at: localization.createdAt,
      updated_at: localization.updatedAt,
    }] : []),
    ryu_routes: ("routes" in record ? record.routes ?? ryuRoutes : []).map((route) => ({
      id: route.id,
      node_id: route.nodeId,
      status: route.status,
      mode: route.mode,
      priority: route.priority,
      capabilities_json: route.capabilities,
      target: "target" in route ? route.target : undefined,
      upstream: "upstream" in route ? route.upstream : undefined,
      format: route.format,
      contract_ref: route.contractRef,
      caveat: route.caveat,
      properties_json: "properties" in route ? route.properties : ryuRoutes.find((row) => row.id === route.id)?.properties,
      created_at: route.createdAt,
      updated_at: route.updatedAt,
    })),
    edges: (record.edges ?? relationships).map((relationship) => ({
      id: relationship.id,
      source_node_id: relationship.sourceNodeId,
      target_node_id: relationship.targetNodeId,
      kind: relationship.kind,
      description: relationship.description,
      sources: relationship.sources,
      created_at: relationship.createdAt,
      updated_at: relationship.updatedAt,
    })),
  };

  return (
    <Collapse
      defaultActiveKey={[`nodes:${node.id}`]}
      items={Object.entries(tables).flatMap(([table, rows]) => rows.map((row) => {
        const id = "id" in row ? row.id : `${row.node_id} / ${row.locale}`;
        return {
          key: `${table}:${id}`,
          label: `${table} · ${id}`,
          children: <pre className="entity-raw-dump">{JSON.stringify(row, null, 2)}</pre>,
        };
      }))}
    />
  );
}

export function EntityDetailsPanel({
  extraActions,
  onClose,
  showCloseButton = true,
}: {
  extraActions?: ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
}) {
  const [rawFieldsOpen, setRawFieldsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const graph = useGraphStore((state) => state.graph);
  const locale = useGraphStore((state) => state.locale);
  const selectedEntityId = useGraphStore((state) => state.selectedEntityId);
  const selectedRelationshipId = useGraphStore((state) => state.selectedRelationshipId);
  const setSelectedEntityId = useGraphStore((state) => state.setSelectedEntityId);
  const setSelectedRelationshipId = useGraphStore((state) => state.setSelectedRelationshipId);
  const resetSelection = useGraphStore((state) => state.resetSelection);
  const entity = selectedEntityId && graph ? graph.nodeById[selectedEntityId] : null;
  const relationship = selectedRelationshipId && graph ? graph.edgeById[selectedRelationshipId] : null;

  useEffect(() => { setRawFieldsOpen(false); }, [selectedEntityId, selectedRelationshipId]);

  if (graph && relationship) {
    return (
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { fontSize: 14 } }}>
        <Card
          className="entity-details-panel"
          size="small"
          title={vocabularyLabel(locale, "edgeKinds", relationship.kind)}
          extra={extraActions ?? (showCloseButton ? (
            <Button
              aria-label={t(locale, "details.closeEntityDetails")}
              icon={<CloseOutlined />}
              size="small"
              type="text"
              onClick={onClose ?? resetSelection}
            />
          ) : null)}
        >
          <Flex vertical gap={16}>
            <DetailSection title={t(locale, "details.profile")}>
              {(["sourceNodeId", "targetNodeId"] as const).map((key) => {
                const node = graph.nodeById[relationship[key]];
                return (
                  <InlineField key={key} label={t(locale, key === "sourceNodeId" ? "details.from" : "details.to")}>
                    <Button type="link" size="small" style={{ padding: 0, height: "auto", whiteSpace: "normal" }}
                      onClick={() => setSelectedEntityId(relationship[key])}>
                      {node ? nodeTitle(node, locale) : relationship[key]}
                    </Button>
                  </InlineField>
                );
              })}
              <Typography.Paragraph className="summary-copy">
                {relationship.description || <EmptyValue />}
              </Typography.Paragraph>
            </DetailSection>
            <DetailSection title={t(locale, "common.source")}>
              {Object.keys(relationship.sources).length
                ? Object.keys(relationship.sources).map(id => <SourceLink key={id} source={id} sources={relationship.sources} />)
                : <EmptyValue />}
            </DetailSection>
          </Flex>
        </Card>
      </ConfigProvider>
    );
  }

  if (!graph || !entity) {
    return null;
  }

  const relationshipIds = [
    ...(graph.outgoingByNodeId[entity.id] ?? []),
    ...(graph.incomingByNodeId[entity.id] ?? []),
  ];
  const relationships = relationshipIds.map(
    (relationshipId) => graph.edgeById[relationshipId],
  );
  const system = entity.kind === "system" ? entity : null;
  const localization = resolveNodeDisplay(entity, locale);
  const systemLocalization = system ? resolveNodeDisplay(system, locale) : null;
  const metrics = system && systemLocalization ? systemMetrics(system, systemLocalization) : [];
  const dataMetrics = metrics.filter(metric => metricDefinitions[metric.key].group === "data");
  const usageMetrics = metrics.filter(metric => metricDefinitions[metric.key].group === "usage");
  const resolvedDescriptors = system && systemLocalization
    ? systemDataDescriptors(system, systemLocalization)
    : [];
  const resolvedAccessPaths = system && systemLocalization
    ? systemAccessPaths(system, systemLocalization)
    : [];
  const readAccessPaths = resolvedAccessPaths.filter((path) => path.type === "read");
  const writeAccessPaths = resolvedAccessPaths.filter((path) => path.type === "write");
  const ryuRoutes = system ? graph.ryuRoutesByNodeId[entity.id] ?? [] : [];
  const operatorNodes = system ? operatorNodesForSystem(graph, system.id) : [];
  const isSystem = Boolean(system);
  const treatyParticipation = entity.kind === "country"
    ? countryTreatyParticipation(entity, resolveNodeDisplay(entity, locale))
    : [];
  const userView = (
    <Flex vertical gap={16}>
      <EntityIntro entity={entity} operatorNodes={operatorNodes} />

      <DetailSection title={t(locale, "details.profile")}>
        <div className="entity-detail-grid">
          <InlineField label={t(locale, "details.entityType")}>
            <Tag bordered={false}>{vocabularyLabel(locale, "nodeKinds", entity.kind)}</Tag>
          </InlineField>
          <InlineField label={t(locale, "details.recordDepth")}>
            <Tag bordered={false} color={tagColor(entity.recordDepth)}>
              {vocabularyLabel(locale, "recordDepths", entity.recordDepth)}
            </Tag>
          </InlineField>
          {isSystem && system ? (
            <>
              <InlineField label={t(locale, "details.discipline")}>
                {system.properties.disciplines?.length ? (
                  <Flex gap={4} wrap>
                    {system.properties.disciplines.map(discipline => (
                      <Tag key={discipline}>{vocabularyLabel(locale, "disciplines", discipline)}</Tag>
                    ))}
                  </Flex>
                ) : (
                  <EmptyValue />
                )}
              </InlineField>
              <InlineField label={t(locale, "details.aliases")}>
                {systemLocalization?.details.aliases.length
                  ? systemLocalization.details.aliases.join(", ")
                  : <EmptyValue />}
              </InlineField>
            </>
          ) : (
            <>
              {entity.kind === "country" ? (
                <>
                  <InlineField label={t(locale, "details.country")}>
                    {entity.countryCode ?? <EmptyValue />}
                  </InlineField>
                  <InlineField label={t(locale, "details.aliases")}>
                    {localization.details.aliases.length ? localization.details.aliases.join(", ") : <EmptyValue />}
                  </InlineField>
                </>
              ) : entity.kind === "organization" ? (
                <InlineField label={t(locale, "details.aliases")}>
                  {localization.details.aliases.length ? localization.details.aliases.join(", ") : <EmptyValue />}
                </InlineField>
              ) : null}
            </>
          )}
        </div>
      </DetailSection>

      {isSystem && system ? (
        <>
          <DetailSection title={t(locale, "details.data")}>
            <div className="entity-detail-grid">
              <InlineField label={t(locale, "details.dataTypes")}>
                <DescriptorTags descriptors={descriptorList(resolvedDescriptors, "type")} />
              </InlineField>
              <InlineField label={t(locale, "details.formats")}>
                <DescriptorTags descriptors={descriptorList(resolvedDescriptors, "format")} />
              </InlineField>
              <InlineField label={t(locale, "details.standards")}>
                <DescriptorTags descriptors={descriptorList(resolvedDescriptors, "standard")} emptyDescription={systemLocalization?.details.researchGaps?.standards} />
              </InlineField>
              {dataMetrics.map(metric => (
                <InlineField key={metric.id} label={metric.label}>
                  <MetricValue metric={metric} />
                </InlineField>
              ))}
            </div>
            {systemLocalization?.details.researchGaps?.data || !dataMetrics.length ? (
              <Typography.Text type="secondary">{systemLocalization?.details.researchGaps?.data || t(locale, "details.noDataMetric")}</Typography.Text>
            ) : null}
          </DetailSection>

          <DetailSection title={t(locale, "details.usage")}>
            <List<ResolvedSourcedMetric>
              className="entity-detail-list"
              dataSource={usageMetrics}
              locale={{ emptyText: systemLocalization?.details.researchGaps?.usage || t(locale, "details.noUsageMetric") }}
              renderItem={(metric) => (
                <List.Item>
                  <Flex vertical gap={2}>
                    <Typography.Text className="entity-detail-label">
                      {metric.label}
                    </Typography.Text>
                    <MetricValue metric={metric} />
                  </Flex>
                </List.Item>
              )}
              size="small"
            />
          </DetailSection>

          <DetailSection title={t(locale, "details.readAccess")}>
            <List<ResolvedSystemAccessPath>
              className="entity-detail-list"
              dataSource={readAccessPaths}
              locale={{ emptyText: systemLocalization?.details.researchGaps?.access || t(locale, "details.noReadAccess") }}
              renderItem={(path) => (
                <List.Item><AccessDescription path={path} /></List.Item>
              )}
              size="small"
            />
          </DetailSection>

          <DetailSection title={t(locale, "details.writeAccess")}>
            <List<ResolvedSystemAccessPath>
              className="entity-detail-list"
              dataSource={writeAccessPaths}
              locale={{ emptyText: t(locale, "details.noWriteAccess") }}
              renderItem={(path) => (
                <List.Item><AccessDescription path={path} /></List.Item>
              )}
              size="small"
            />
          </DetailSection>

          {ryuRoutes.length > 0 ? (
            <DetailSection title={t(locale, "details.ryu")}>
              <List<RyuRoute>
                className="entity-detail-list"
                dataSource={ryuRoutes}
                renderItem={(route) => (
                  <List.Item><RyuRouteDescription route={route} /></List.Item>
                )}
                size="small"
              />
            </DetailSection>
          ) : null}
        </>
      ) : null}

      {entity.kind === "organization" ? <OrganizationProfile organization={entity} /> : null}

      <TreatyParticipationList items={treatyParticipation} />

      <DetailSection title={t(locale, "details.connections")}>
        <List<GraphEdge>
          className="entity-detail-list"
          dataSource={relationships}
          locale={{ emptyText: t(locale, "details.noRelationship") }}
          renderItem={(relationship) => {
            const otherEntityId =
              relationship.sourceNodeId === entity.id
                ? relationship.targetNodeId
                : relationship.sourceNodeId;
            const otherEntity = graph.nodeById[otherEntityId];
            return (
              <List.Item>
                <Flex vertical gap={2}>
                  <Typography.Text>
                    {otherEntity ? nodeTitle(otherEntity, locale) : otherEntityId}
                  </Typography.Text>
                  <Button type="link" size="small" style={{ alignSelf: "flex-start", padding: 0 }}
                    onClick={() => setSelectedRelationshipId(relationship.id)}>
                    {relationshipLabel(relationship, entity.id, locale)}
                  </Button>
                  {Object.keys(relationship.sources).map(id => <SourceLink key={id} source={id} sources={relationship.sources} />)}
                </Flex>
              </List.Item>
            );
          }}
          size="small"
        />
      </DetailSection>
      <ReviewSection entity={entity} />

      {!isPublicApp ? (
        <DetailSection title={t(locale, "details.rawFields")}>
          <Button
            type="link"
            size="small"
            style={{ alignSelf: "flex-start", padding: 0 }}
            onClick={() => setRawFieldsOpen(true)}
          >
            {t(locale, "details.rawFields")}
          </Button>
        </DetailSection>
      ) : null}
    </Flex>
  );

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { fontSize: 14 } }}>
      <Card
        ref={panelRef}
        className="entity-details-panel"
        size="small"
        title={localization.title}
        extra={
          extraActions ??
          (showCloseButton ? (
            <Button
              aria-label={t(locale, "details.closeEntityDetails")}
              icon={<CloseOutlined />}
              size="small"
              type="text"
              onClick={onClose ?? resetSelection}
            />
          ) : null)
        }
      >
        {userView}
      </Card>
      {!isPublicApp ? (
        <Drawer
          title={`${t(locale, "details.rawFields")} · ${localization.title}`}
          open={rawFieldsOpen}
          onClose={() => setRawFieldsOpen(false)}
          getContainer={() => panelRef.current?.closest<HTMLElement>(".workspace-pane") ?? document.body}
          rootStyle={{ position: "absolute" }}
          size="100%"
          closable={{ placement: "end" }}
          destroyOnHidden
        >
          <RawRecordFields
            key={entity.id}
            entity={entity}
            relationships={relationships}
            ryuRoutes={ryuRoutes}
          />
        </Drawer>
      ) : null}
    </ConfigProvider>
  );
}
