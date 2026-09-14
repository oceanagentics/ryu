import { useEffect, useMemo, useState } from "react";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Flex,
  Form,
  Input,
  List,
  Popconfirm,
  Select,
  Space,
  Typography,
} from "antd";

import type {
  GraphEdge,
  GraphNode,
  GraphNodeKind,
  SupportedLocale,
} from "../../../../shared/domain";
import { fetchBootstrap } from "../api";
import { edgeKinds } from "../../../../shared/domain";
import { nodeTitle } from "../localization";
import { useGraphStore } from "../state/graphStore";

type EditorMode = "entity" | "relationship";

type MessageState = {
  kind: "success" | "error";
  text: string;
};

type PropertyDraft = {
  key: string;
  value: string;
};

type EntityDraft = {
  kind: GraphNodeKind;
  name: string;
  countryCode: string;
  properties: PropertyDraft[];
};

type RelationshipDraft = {
  sourceNodeId: string;
  targetNodeId: string;
  kind: GraphEdge["kind"];
  description: string;
};

const entityKindOptions = ["country", "organization", "system"] as const;

const blankEntityDraft = (): EntityDraft => ({
  kind: "organization",
  name: "",
  countryCode: "",
  properties: [],
});

const blankRelationshipDraft = (): RelationshipDraft => ({
  sourceNodeId: "",
  targetNodeId: "",
  kind: "contributes",
  description: "",
});

function toPropertyDrafts(properties: object): PropertyDraft[] {
  return Object.entries(properties).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

function parsePropertyValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "") {
    return "";
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function toPropertiesObject(drafts: PropertyDraft[], label: string): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const draft of drafts) {
    const key = draft.key.trim();
    if (!key) {
      if (draft.value.trim()) {
        throw new Error(`${label} property keys cannot be blank`);
      }
      continue;
    }

    properties[key] = parsePropertyValue(draft.value);
  }

  return properties;
}

function entityToDraft(entity: GraphNode, locale: SupportedLocale): EntityDraft {
  return {
    kind: entity.kind,
    name: nodeTitle(entity, locale),
    countryCode: entity.kind === "country" ? entity.countryCode ?? "" : "",
    properties: toPropertyDrafts(entity.properties ?? {}),
  };
}

function relationshipToDraft(relationship: GraphEdge): RelationshipDraft {
  return {
    sourceNodeId: relationship.sourceNodeId,
    targetNodeId: relationship.targetNodeId,
    kind: relationship.kind,
    description: relationship.description,
  };
}

interface EditorPanelProps {
  readOnly?: boolean;
}

export function EditorPanel({ readOnly = false }: EditorPanelProps) {
  const graph = useGraphStore((state) => state.graph);
  const locale = useGraphStore((state) => state.locale);
  const selectedEntityId = useGraphStore((state) => state.selectedEntityId);
  const selectedRelationshipId = useGraphStore((state) => state.selectedRelationshipId);
  const setSelectedEntityId = useGraphStore((state) => state.setSelectedEntityId);
  const setSelectedRelationshipId = useGraphStore((state) => state.setSelectedRelationshipId);
  const setBootstrap = useGraphStore((state) => state.setBootstrap);

  const [entityForm] = Form.useForm<EntityDraft>();
  const [relationshipForm] = Form.useForm<RelationshipDraft>();

  const [mode, setMode] = useState<EditorMode>("entity");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  const entityOptions = useMemo(
    () =>
      graph
        ? [...graph.nodes]
            .sort((a, b) => nodeTitle(a, locale).localeCompare(nodeTitle(b, locale)))
            .map((entity) => ({ label: nodeTitle(entity, locale), value: entity.id, kind: entity.kind }))
        : [],
    [graph, locale],
  );

  useEffect(() => {
    if (!graph || !selectedEntityId) {
      return;
    }

    const entity = graph.nodeById[selectedEntityId];
    if (!entity) {
      return;
    }

    setMode("entity");
    setIsEditing(false);
    entityForm.setFieldsValue(entityToDraft(entity, locale));
    setMessage(null);
  }, [entityForm, graph, locale, selectedEntityId]);

  useEffect(() => {
    if (!graph || !selectedRelationshipId) {
      return;
    }

    const relationship = graph.edgeById[selectedRelationshipId];
    if (!relationship) {
      return;
    }

    setMode("relationship");
    setIsEditing(false);
    relationshipForm.setFieldsValue(relationshipToDraft(relationship));
    setMessage(null);
  }, [graph, relationshipForm, selectedRelationshipId]);

  if (!graph) {
    return null;
  }

  const selectedEntity = selectedEntityId ? graph.nodeById[selectedEntityId] : null;
  const selectedRelationship = selectedRelationshipId
    ? graph.edgeById[selectedRelationshipId]
    : null;

  const viewingEntity = mode === "entity" ? selectedEntity : null;
  const viewingRelationship = mode === "relationship" ? selectedRelationship : null;

  const entityProperties = viewingEntity ? toPropertyDrafts(viewingEntity.properties ?? {}) : [];
  const hasSelection = Boolean(viewingEntity || viewingRelationship);

  async function refreshGraph() {
    const payload = await fetchBootstrap();
    setBootstrap(payload);
  }

  function beginEdit() {
    setIsEditing(true);
    setMessage(null);
  }

  function cancelEdit() {
    setIsEditing(false);
    setMessage(null);

    if (viewingEntity) {
      entityForm.setFieldsValue(entityToDraft(viewingEntity, locale));
      return;
    }

    if (viewingRelationship) {
      relationshipForm.setFieldsValue(relationshipToDraft(viewingRelationship));
      return;
    }

    entityForm.setFieldsValue(blankEntityDraft());
    relationshipForm.setFieldsValue(blankRelationshipDraft());
  }

  function startNewEntity() {
    setMode("entity");
    setIsEditing(true);
    setSelectedEntityId(null);
    setSelectedRelationshipId(null);
    entityForm.setFieldsValue(blankEntityDraft());
    setMessage(null);
  }

  function startNewRelationship() {
    setMode("relationship");
    setIsEditing(true);
    setSelectedEntityId(null);
    setSelectedRelationshipId(null);
    relationshipForm.setFieldsValue(blankRelationshipDraft());
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      await Promise.reject(new Error("Legacy editor writes are disabled until this panel uses the record API."));
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setMessage(null);

    try {
      await Promise.reject(new Error("Legacy editor deletes are disabled until this panel uses the record API."));
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Delete failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  const contextMessage = viewingEntity
    ? `${isEditing ? "Editing" : "Viewing"} node: ${nodeTitle(viewingEntity, locale)}`
    : viewingRelationship
      ? `${isEditing ? "Editing" : "Viewing"} edge: ${viewingRelationship.kind}`
        : isEditing
          ? mode === "relationship"
            ? "Creating a new edge."
              : "Creating a new node."
          : readOnly
            ? "Click a node or edge in the graph to inspect it here."
            : "Click a node or edge in the graph to inspect it here.";

  const emptyStateMessage = readOnly
    ? "Select a node or edge to inspect it here."
    : "Select a node or edge, or create a new record.";

  const canDelete =
    (mode === "entity" && Boolean(selectedEntityId)) ||
    (mode === "relationship" && Boolean(selectedRelationshipId));

  return (
    <Card
      size="small"
      title="Editor"
      extra={
        <Space size={6}>
          {!readOnly && !isEditing && hasSelection ? (
            <Button size="small" type="primary" icon={<EditOutlined />} onClick={beginEdit}>
              Edit
            </Button>
          ) : null}
          {!readOnly ? (
            <>
              <Button size="small" icon={<PlusOutlined />} onClick={startNewEntity}>
                New node
              </Button>
              <Button size="small" onClick={startNewRelationship}>
                New edge
              </Button>
            </>
          ) : null}
        </Space>
      }
    >
      <Flex vertical gap={12}>
        <Typography.Text type="secondary">{contextMessage}</Typography.Text>

        {message ? (
          <Alert
            showIcon
            type={message.kind}
            message={message.text}
          />
        ) : null}

        {!isEditing && !hasSelection ? (
          <Typography.Text type="secondary">
            {emptyStateMessage}
          </Typography.Text>
        ) : null}

        {!isEditing && viewingEntity ? (
          <Flex vertical gap={12}>
            <Descriptions
              bordered
              column={1}
              size="small"
              items={[
                { key: "kind", label: "Kind", children: viewingEntity.kind },
                viewingEntity.kind === "country" && viewingEntity.countryCode
                  ? { key: "country", label: "Country", children: viewingEntity.countryCode }
                  : null,
              ].filter(Boolean) as NonNullable<
                Parameters<typeof Descriptions>[0]["items"]
              >}
            />
            <PropertyList properties={entityProperties} emptyText="No properties for this node." />
          </Flex>
        ) : null}

        {!isEditing && viewingRelationship ? (
          <Flex vertical gap={12}>
            <Descriptions
              bordered
              column={1}
              size="small"
              items={[
                {
                  key: "source",
                  label: "Source",
                  children:
                    (graph.nodeById[viewingRelationship.sourceNodeId]
                      ? nodeTitle(graph.nodeById[viewingRelationship.sourceNodeId], locale)
                      : null) ??
                    viewingRelationship.sourceNodeId,
                },
                {
                  key: "target",
                  label: "Target",
                  children:
                    (graph.nodeById[viewingRelationship.targetNodeId]
                      ? nodeTitle(graph.nodeById[viewingRelationship.targetNodeId], locale)
                      : null) ??
                    viewingRelationship.targetNodeId,
                },
                { key: "type", label: "Type", children: viewingRelationship.kind },
              ]}
            />
            {viewingRelationship.description ? (
              <Typography.Paragraph className="summary-copy">
                {viewingRelationship.description}
              </Typography.Paragraph>
            ) : null}
          </Flex>
        ) : null}

        {!readOnly && isEditing && mode === "entity" ? (
          <Form form={entityForm} layout="vertical">
            <Form.Item label="Kind" name="kind" rules={[{ required: true }]}>
              <Select
                options={entityKindOptions.map((kind) => ({ label: kind, value: kind }))}
              />
            </Form.Item>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, whitespace: true, message: "Enter a name." }]}
            >
              <Input />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(before, after) => before.kind !== after.kind}>
              {({ getFieldValue }) => getFieldValue("kind") === "country" ? (
                <Form.Item label="Country code" name="countryCode" preserve={false}>
                  <Input />
                </Form.Item>
              ) : null}
            </Form.Item>
            <PropertyEditor name="properties" emptyText="No properties for this node." />
          </Form>
        ) : null}

        {!readOnly && isEditing && mode === "relationship" ? (
          <Form form={relationshipForm} layout="vertical">
            <Form.Item
              label="Source node"
              name="sourceNodeId"
              rules={[{ required: true, message: "Select a source node." }]}
            >
              <Select allowClear options={entityOptions} />
            </Form.Item>
            <Form.Item
              label="Target node"
              name="targetNodeId"
              rules={[{ required: true, message: "Select a target node." }]}
            >
              <Select allowClear options={entityOptions} />
            </Form.Item>
            <Form.Item label="Type" name="kind" rules={[{ required: true }]}>
              <Select
                options={edgeKinds.map((type) => ({
                  label: type,
                  value: type,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="Description"
              name="description"
              rules={[{ required: true, whitespace: true, message: "Enter a relationship description." }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        ) : null}

        {!readOnly && isEditing ? (
          <Flex justify="space-between" align="center" gap={12} wrap>
            <Space>
              <Button icon={<SaveOutlined />} loading={saving} type="primary" onClick={() => void handleSave()}>
                Save
              </Button>
              <Button onClick={cancelEdit}>Cancel</Button>
            </Space>
            <Popconfirm
              title="Delete this record?"
              disabled={!canDelete}
              onConfirm={() => void handleDelete()}
            >
              <Button danger disabled={!canDelete || saving} icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Flex>
        ) : null}
      </Flex>
    </Card>
  );
}

function PropertyList({
  properties,
  emptyText,
}: {
  properties: PropertyDraft[];
  emptyText: string;
}) {
  return (
    <Collapse
      size="small"
      items={[
        {
          key: "properties",
          label: `Properties (${properties.length})`,
          children:
            properties.length > 0 ? (
              <List
                size="small"
                dataSource={properties}
                renderItem={(property) => (
                  <List.Item>
                    <Flex vertical gap={2}>
                      <Typography.Text strong>{property.key}</Typography.Text>
                      <Typography.Text type="secondary">
                        {property.value}
                      </Typography.Text>
                    </Flex>
                  </List.Item>
                )}
              />
            ) : (
              <Typography.Text type="secondary">{emptyText}</Typography.Text>
            ),
        },
      ]}
    />
  );
}

function PropertyEditor({
  name,
  emptyText,
}: {
  name: string;
  emptyText: string;
}) {
  return (
    <Collapse
      size="small"
      items={[
        {
          key: "properties",
          label: "Properties",
          children: (
            <Form.List name={name}>
              {(fields, { add, remove }) => (
                <Flex vertical gap={10}>
                  <Button
                    size="small"
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ key: "", value: "" })}
                  >
                    Add property
                  </Button>
                  {fields.length === 0 ? (
                    <Typography.Text type="secondary">{emptyText}</Typography.Text>
                  ) : null}
                  {fields.map((field) => (
                    <Card key={field.key} size="small" className="editor-subcard">
                      <Form.Item
                        label="Key"
                        name={[field.name, "key"]}
                        style={{ marginBottom: 10 }}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item label="Value" name={[field.name, "value"]}>
                        <Input.TextArea rows={2} />
                      </Form.Item>
                      <Button danger size="small" type="text" onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    </Card>
                  ))}
                </Flex>
              )}
            </Form.List>
          ),
        },
      ]}
    />
  );
}
