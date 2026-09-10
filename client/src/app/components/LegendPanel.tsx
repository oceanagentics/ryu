import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Tag, Typography } from "antd";
import { useState } from "react";

import { edgeKinds, type GraphNodeKind } from "../../../../shared/domain";
import { nodeMapEdgeColors } from "../graph/cytoscapeStyles";
import { vocabularyLabel, t } from "../i18n";
import { useGraphStore } from "../state/graphStore";

const nodeItems: GraphNodeKind[] = ["country", "organization", "system"];

export function LegendPanel() {
  const [minimized, setMinimized] = useState(false);
  const locale = useGraphStore((state) => state.locale);
  const hiddenNodeKinds = useGraphStore((state) => state.hiddenNodeKinds);
  const hiddenEdgeKinds = useGraphStore((state) => state.hiddenEdgeKinds);
  const toggleNodeKindVisibility = useGraphStore(
    (state) => state.toggleNodeKindVisibility,
  );
  const toggleEdgeKindVisibility = useGraphStore((state) => state.toggleEdgeKindVisibility);
  const resetKindFilters = useGraphStore((state) => state.resetKindFilters);
  const hiddenKindSet = new Set(hiddenNodeKinds);
  const hiddenEdgeKindSet = new Set(hiddenEdgeKinds);
  const hasHiddenKinds = hiddenNodeKinds.length > 0 || hiddenEdgeKinds.length > 0;
  const toggleLabel = t(locale, minimized ? "graph.expandLegend" : "graph.minimizeLegend");

  return (
    <Card
      size="small"
      title={t(locale, "graph.legend")}
      styles={{ body: { display: minimized ? "none" : undefined } }}
      extra={
        <Flex align="center" gap={8}>
          {hasHiddenKinds && (
            <button
              className="legend-reset"
              type="button"
              onClick={resetKindFilters}
            >
              {t(locale, "directory.reset")}
            </button>
          )}
          <Button
            aria-expanded={!minimized}
            aria-label={toggleLabel}
            title={toggleLabel}
            type="text"
            size="small"
            icon={minimized ? <PlusOutlined /> : <MinusOutlined />}
            onClick={() => setMinimized((value) => !value)}
          />
        </Flex>
      }
    >
      <Flex vertical gap={10} align="stretch">
        <Flex vertical gap={8} className="legend-column">
          <Typography.Text strong>{t(locale, "graph.nodes")}</Typography.Text>
          {nodeItems.map((kind) => (
            <button
              aria-pressed={!hiddenKindSet.has(kind)}
              className={[
                "legend-filter",
                hiddenKindSet.has(kind) ? "is-inactive" : "",
              ].filter(Boolean).join(" ")}
              key={kind}
              title={t(
                locale,
                hiddenKindSet.has(kind)
                  ? "graph.showKind"
                  : "graph.hideKind",
                { kind: vocabularyLabel(locale, "nodeKinds", kind) },
              )}
              type="button"
              onClick={() => toggleNodeKindVisibility(kind)}
            >
              <span className={`legend-chip ${kind}`} />
              <span className="legend-filter-label">
                {vocabularyLabel(locale, "nodeKinds", kind)}
              </span>
            </button>
          ))}
        </Flex>
        <Flex vertical gap={8} className="legend-column">
          <Typography.Text strong>{t(locale, "graph.edges")}</Typography.Text>
          {edgeKinds.map((kind) => (
            <button
              aria-pressed={!hiddenEdgeKindSet.has(kind)}
              className={["legend-filter", hiddenEdgeKindSet.has(kind) ? "is-inactive" : ""].filter(Boolean).join(" ")}
              key={kind}
              title={t(locale, hiddenEdgeKindSet.has(kind) ? "graph.showKind" : "graph.hideKind", {
                kind: vocabularyLabel(locale, "edgeKinds", kind),
              })}
              type="button"
              onClick={() => toggleEdgeKindVisibility(kind)}
            >
              <span className="legend-edge-line" style={{ background: nodeMapEdgeColors[kind] }} />
              <span className="legend-filter-label">{vocabularyLabel(locale, "edgeKinds", kind)}</span>
            </button>
          ))}
        </Flex>
        <Tag bordered={false} color="default" className="legend-note">
          {t(locale, "graph.legendNote")}
        </Tag>
      </Flex>
    </Card>
  );
}
