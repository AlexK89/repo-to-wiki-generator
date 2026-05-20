import { useMemo } from "react";
import {
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { cn } from "@/lib/utils";
import type {
  FeatureDiagram,
  FlowEdge,
  FlowNode,
  FlowNodeKind,
} from "@/types/wiki";

type Props = {
  diagram: FeatureDiagram;
};

const COLUMN_SPACING = 210;
const ROW_SPACING = 64;
const NODE_WIDTH = 150;
const NODE_HEIGHT = 38;
const PADDING_X = 32;
const PADDING_Y = 32;

const KIND_CLASSES: Record<FlowNodeKind, string> = {
  input: "bg-bg-elev border-border-strong text-fg",
  core: "bg-accent-soft border-accent text-accent-soft-fg",
  branch: "bg-bg-elev border-border text-fg-muted",
};

type FlowNodeData = { label: string; kind: FlowNodeKind };

const nodeTypes = { feature: FlowNodeView };

export function FeatureFlow({ diagram }: Props) {
  const { nodes, edges, height } = useMemo(
    () => buildGraph(diagram.nodes, diagram.edges),
    [diagram.nodes, diagram.edges],
  );

  return (
    <div className="rounded-md border border-border bg-bg-subtle px-3 py-4">
      <div
        className="w-full"
        style={{ height }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        />
      </div>
      {diagram.caption && (
        <div className="mt-2.5 text-center text-[11.5px] text-fg-subtle">
          {diagram.caption}
        </div>
      )}
    </div>
  );
}

function FlowNodeView({ data }: { data: FlowNodeData }) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-0 !w-0 !min-w-0 !border-0 !bg-transparent"
      />
      <div
        className={cn(
          KIND_CLASSES[data.kind],
          "flex items-center justify-center rounded-md border px-3 font-mono text-xs",
        )}
        style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      >
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-0 !w-0 !min-w-0 !border-0 !bg-transparent"
      />
    </>
  );
}

type GraphResult = {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  height: number;
};

function buildGraph(flowNodes: FlowNode[], flowEdges: FlowEdge[]): GraphResult {
  const incoming = new Map<string, string[]>();
  for (const node of flowNodes) incoming.set(node.id, []);
  for (const edge of flowEdges) {
    incoming.get(edge.to)?.push(edge.from);
  }

  const levels = new Map<string, number>();
  const computeLevel = (id: string): number => {
    const cached = levels.get(id);
    if (cached !== undefined) return cached;
    const parents = incoming.get(id) ?? [];
    const level =
      parents.length === 0 ? 0 : Math.max(...parents.map(computeLevel)) + 1;
    levels.set(id, level);
    return level;
  };
  for (const node of flowNodes) computeLevel(node.id);

  const columns = new Map<number, FlowNode[]>();
  for (const node of flowNodes) {
    const column = levels.get(node.id) ?? 0;
    const bucket = columns.get(column) ?? [];
    bucket.push(node);
    columns.set(column, bucket);
  }

  const maxColumnSize = Math.max(
    ...Array.from(columns.values()).map((column) => column.length),
  );
  const height = maxColumnSize * ROW_SPACING + PADDING_Y * 2;

  const nodes: Node<FlowNodeData>[] = [];
  for (const [columnIndex, columnNodes] of columns.entries()) {
    columnNodes.forEach((node, indexInColumn) => {
      const offsetFromCenter = indexInColumn - (columnNodes.length - 1) / 2;
      nodes.push({
        id: node.id,
        type: "feature",
        position: {
          x: columnIndex * COLUMN_SPACING + PADDING_X,
          y: offsetFromCenter * ROW_SPACING + height / 2 - NODE_HEIGHT / 2,
        },
        data: { label: node.label, kind: node.kind },
        draggable: false,
        selectable: false,
      });
    });
  }

  const edges: Edge[] = flowEdges.map((edge, index) => ({
    id: `${edge.from}->${edge.to}-${index}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: "smoothstep",
    style: { stroke: "var(--color-fg-subtle)", strokeWidth: 1.2 },
    markerEnd: { type: "arrowclosed", color: "var(--color-fg-subtle)" } as Edge["markerEnd"],
  }));

  return { nodes, edges, height };
}
