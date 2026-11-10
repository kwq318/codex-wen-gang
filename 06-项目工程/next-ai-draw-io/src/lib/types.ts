import type { Edge, Node } from "@xyflow/react";

export type NodeKind =
  | "rectangle"
  | "rounded"
  | "decision"
  | "ellipse"
  | "database"
  | "note"
  | "parallelogram"
  | "hexagon";

export type DiagramNodeData = {
  label: string;
  kind: NodeKind;
  color?: string;
  detail?: string;
  [key: string]: unknown;
};

export type DiagramNode = Node<DiagramNodeData, "diagram">;
export type DiagramEdge = Edge;

export interface DiagramDoc {
  version: 1;
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface ParsedNode {
  id: string;
  label: string;
  kind: NodeKind;
  color?: string;
  detail?: string;
}

export interface ParsedEdge {
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface ParsedDiagram {
  title: string;
  nodes: ParsedNode[];
  edges: ParsedEdge[];
}

export interface AiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AiGenerateResponse {
  title?: string;
  nodes: Array<{
    id: string;
    label: string;
    kind?: NodeKind;
    color?: string;
    detail?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
}
