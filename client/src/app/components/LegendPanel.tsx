import { Card, Flex, Tag, Typography } from "antd";

import { edgeKinds, type GraphNodeKind } from "../../../../shared/domain";
import { nodeMapEdgeColors } from "../graph/cytoscapeStyles";
import { vocabularyLabel, t } from "../i18n";
import { useGraphStore } from "../state/graphStore";

const nodeItems: GraphNodeKind[] = ["country", "organization", "system"];

export function LegendPanel() {
  const locale = useGraphStore((state) => state.locale);
  const hiddenNodeKinds = useGraphStore((state) => state.hiddenNodeKinds);
  const toggleNodeKindVisibility = useGraphStore(
    (state) => state.toggleNodeKindVisibility,
  );
  const resetNodeKindFilters = useGraphStore((state) => state.resetNodeKindFilters);
  const hiddenKindSet = new Set(hiddenNodeKinds);
  const hasHiddenNodeKinds = hiddenNodeKinds.length > 0;

  return (
    <Card
      size="small"
      title={t(locale, "graph.legend")}
      extra={
        hasHiddenNodeKinds ? (
          <button
            className="legend-reset"
            type="button"
            onClick={resetNodeKindFilters}
          >
            {t(locale, "directory.reset")}
          </button>
        ) : null
      }
    >
      <Flex vertical gap={10} align="stretch">
        <Flex vertical gap={8} className="legend-column">
          <Typography.Text strong>{t(locale, "graph.nodes")}</Typography.Text>
          {nodeItems.map((kind) => (
            <button
              aria-pressed={!hiddenKindSet.has(kind)}
              className={[
                "legend-node-filter",
                hiddenKindSet.has(kind) ? "is-inactive" : "",
              ].filter(Boolean).join(" ")}
              key={kind}
              title={t(
                locale,
                hiddenKindSet.has(kind)
                  ? "graph.showNodeKind"
                  : "graph.hideNodeKind",
                { kind: vocabularyLabel(locale, "nodeKinds", kind) },
              )}
              type="button"
              onClick={() => toggleNodeKindVisibility(kind)}
            >
              <span className={`legend-chip ${kind}`} />
              <span className="legend-node-filter-label">
                {vocabularyLabel(locale, "nodeKinds", kind)}
              </span>
            </button>
          ))}
        </Flex>
        <Flex vertical gap={8} className="legend-column">
          <Typography.Text strong>{t(locale, "graph.edges")}</Typography.Text>
          {edgeKinds.map((kind) => (
            <Flex key={kind} align="center" gap={8} className="legend-edge">
              <span className="legend-edge-line" style={{ background: nodeMapEdgeColors[kind] }} />
              <span>{vocabularyLabel(locale, "edgeKinds", kind)}</span>
            </Flex>
          ))}
        </Flex>
        <Tag bordered={false} color="default" className="legend-note">
          {t(locale, "graph.legendNote")}
        </Tag>
      </Flex>
    </Card>
  );
}
