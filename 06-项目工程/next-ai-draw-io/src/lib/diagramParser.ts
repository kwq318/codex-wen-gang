import type {
  DiagramDoc,
  DiagramEdge,
  DiagramNode,
  NodeKind,
  ParsedDiagram,
  ParsedEdge,
  ParsedNode,
} from "./types";

const KIND_TAGS: Array<[RegExp, NodeKind]> = [
  [/^\[开始\]/, "rounded"],
  [/^\[结束\]/, "rounded"],
  [/^\(决策\)|^\(判断\)/, "decision"],
  [/^\{数据库\}/, "database"],
  [/^\(注释\)|^\[注释\]/, "note"],
  [/^\(椭圆\)/, "ellipse"],
  [/^\(流程\)|^\(平行\)/, "parallelogram"],
  [/^\(六边\)/, "hexagon"],
];

const SECTION_COLORS = [
  "#4f6ef7",
  "#0ea5a4",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#d946ef",
];

const GAP_X = 64;
const GAP_Y = 64;
const PAD = 40;
const NODE_MIN_W = 128;
const NODE_MAX_W = 300;

function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x2e80) return 15;
  return 8;
}

export function estimateWidth(label: string): number {
  const lines = label.split("\n");
  const longest = lines.reduce((max, line) => {
    let width = 0;
    for (const ch of line) width += charWidth(ch);
    return Math.max(max, width);
  }, 0);
  return Math.max(NODE_MIN_W, Math.min(NODE_MAX_W, longest + 42));
}

export function nodeSize(kind: NodeKind, label: string): { width: number; height: number } {
  const width = estimateWidth(label);
  switch (kind) {
    case "decision":
      return { width: Math.max(150, width), height: 96 };
    case "database":
      return { width: Math.max(150, width), height: 92 };
    case "note":
      return { width: Math.max(170, width), height: 84 };
    case "ellipse":
      return { width: Math.max(160, width), height: 76 };
    case "parallelogram":
      return { width: Math.max(170, width), height: 72 };
    case "hexagon":
      return { width: Math.max(150, width), height: 72 };
    default:
      return { width: Math.max(140, width), height: 60 };
  }
}

function parseKind(raw: string): { label: string; kind: NodeKind; detail?: string } {
  let label = raw.trim();
  let kind: NodeKind = "rectangle";
  let detail: string | undefined;

  for (const [regex, matchedKind] of KIND_TAGS) {
    const m = label.match(regex);
    if (m) {
      kind = matchedKind;
      label = label.replace(m[0], "").trim();
      break;
    }
  }

  if (label.endsWith("?")) {
    kind = "decision";
  }

  const detailMatch = label.match(/[（(]([^）)]+)[)）]\s*$/);
  if (detailMatch) {
    detail = detailMatch[1].trim();
    label = label.replace(detailMatch[0], "").trim();
  }

  const paren = label.match(/^[（(]([^）)]+)[)）]/);
  if (paren) {
    label = label.replace(paren[0], "").trim();
  }

  return { label, kind, detail };
}

function splitStatements(prompt: string): string[] {
  return prompt
    .split(/\r?\n|；|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isSectionLine(line: string): boolean {
  return /^(#{1,3}\s+|==\s*|—+\s*)/.test(line) || /^\s*==.*==\s*$/.test(line);
}

function sectionName(line: string): string {
  return line.replace(/^#{1,3}\s*/, "").replace(/^==\s*/, "").replace(/\s*==$/, "").trim();
}

function splitTokens(line: string): {
  tokens: Array<{ raw: string }>;
  edges: Array<{ kind: "forward" | "backward" | "both"; label?: string; animated: boolean }>;
} {
  const normalized = line.replace(/--\s*([^→=>\-]+?)\s*-->/g, (_, label: string) => ` 【${label.trim()}】=>`);
  const regex = /(<->|⟶|->|→|=>|←|<-|--)/g;
  const matches = [...normalized.matchAll(regex)];
  if (matches.length === 0) {
    return { tokens: [{ raw: normalized.trim() }], edges: [] };
  }

  const tokens: Array<{ raw: string }> = [];
  const edges: Array<{ kind: "forward" | "backward" | "both"; label?: string; animated: boolean }> = [];

  let cursor = 0;
  matches.forEach((match) => {
    const before = normalized.slice(cursor, match.index);
    const separator = match[0];
    const bracket = before.match(/^(.*?)\s*【([^】]+)】$/);
    let edgeLabel: string | undefined;
    let raw = before.trim();
    if (bracket) {
      raw = bracket[1].trim();
      edgeLabel = bracket[2].trim();
    }
    tokens.push({ raw });

    let kind: "forward" | "backward" | "both" = "forward";
    if (separator === "<->" || separator === "⟷") kind = "both";
    if (separator === "<-" || separator === "←") kind = "backward";
    const animated = separator === "=>" || separator === "⟶";
    edges.push({ kind, label: edgeLabel, animated });
    cursor = (match.index ?? 0) + separator.length;
  });

  const last = normalized.slice(cursor).trim();
  if (last) tokens.push({ raw: last });

  return { tokens, edges };
}

function uniqueId(prefix: string, used: Set<string>): string {
  let id = `${prefix}-${used.size + 1}`;
  while (used.has(id)) {
    id = `${prefix}-${used.size + Math.floor(Math.random() * 1000) + 1}`;
  }
  used.add(id);
  return id;
}

export function parseDiagramPrompt(prompt: string, title?: string): ParsedDiagram {
  const statements = splitStatements(prompt);
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const usedIds = new Set<string>();
  const byLabel = new Map<string, string>();
  let sectionIndex = -1;

  const getOrCreateNode = (raw: string): ParsedNode => {
    const { label, kind, detail } = parseKind(raw);
    const key = `${kind}:${label}`;
    const existing = byLabel.get(key);
    if (existing) {
      return nodes.find((n) => n.id === existing) as ParsedNode;
    }
    const node: ParsedNode = {
      id: uniqueId("n", usedIds),
      label,
      kind,
      detail,
      color: SECTION_COLORS[(sectionIndex + 1) % SECTION_COLORS.length],
    };
    nodes.push(node);
    byLabel.set(key, node.id);
    return node;
  };

  for (const line of statements) {
    if (isSectionLine(line)) {
      sectionIndex += 1;
      const name = sectionName(line);
      const node = getOrCreateNode(`(注释) ${name}`);
      node.color = SECTION_COLORS[sectionIndex % SECTION_COLORS.length];
      continue;
    }

    const { tokens, edges: tokenEdges } = splitTokens(line);
    const chain: ParsedNode[] = [];
    tokens.forEach((token) => chain.push(getOrCreateNode(token.raw)));

    tokenEdges.forEach((edge, index) => {
      const source = chain[index];
      const target = chain[index + 1];
      if (!source || !target) return;
      if (edge.kind === "forward" || edge.kind === "both") {
        edges.push({ source: source.id, target: target.id, label: edge.label, animated: edge.animated });
      }
      if (edge.kind === "backward" || edge.kind === "both") {
        edges.push({ source: target.id, target: source.id, label: edge.label, animated: edge.animated });
      }
    });
  }

  return { title: title?.trim() || "未命名图表", nodes, edges };
}

function layersFromEdges(nodes: ParsedNode[], edges: ParsedEdge[]): Map<string, number> {
  const layers = new Map<string, number>();
  const children = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  nodes.forEach((n) => {
    layers.set(n.id, 0);
    indegree.set(n.id, 0);
    children.set(n.id, []);
  });

  edges.forEach((e) => {
    if (!children.has(e.source) || !children.has(e.target)) return;
    children.get(e.source)!.push(e.target);
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  });

  const queue = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const queued = new Set<string>(queue);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const layer = layers.get(id) ?? 0;
    for (const child of children.get(id) ?? []) {
      const next = Math.max(layers.get(child) ?? 0, layer + 1);
      layers.set(child, next);
      indegree.set(child, (indegree.get(child) ?? 0) - 1);
      if ((indegree.get(child) ?? 0) <= 0 && !queued.has(child)) {
        queue.push(child);
        queued.add(child);
      }
    }
  }

  return layers;
}

export function buildDocFromParsed(parsed: ParsedDiagram): DiagramDoc {
  const layers = layersFromEdges(parsed.nodes, parsed.edges);
  const grouped = new Map<number, ParsedNode[]>();

  parsed.nodes.forEach((n) => {
    const layer = layers.get(n.id) ?? 0;
    const list = grouped.get(layer) ?? [];
    list.push(n);
    grouped.set(layer, list);
  });

  const layerKeys = [...grouped.keys()].sort((a, b) => a - b);
  const colWidths = new Map<number, number>();
  const rowHeights = new Map<number, number>();

  layerKeys.forEach((key) => {
    const list = grouped.get(key) ?? [];
    const maxW = Math.max(...list.map((n) => nodeSize(n.kind, n.label).width));
    const maxH = Math.max(...list.map((n) => nodeSize(n.kind, n.label).height));
    colWidths.set(key, maxW);
    rowHeights.set(key, maxH);
  });

  const nodeById = new Map(parsed.nodes.map((n) => [n.id, n]));
  const nodes: DiagramNode[] = [];

  layerKeys.forEach((key, layerIndex) => {
    const list = grouped.get(key) ?? [];
    let offsetX = PAD;
    for (let i = 0; i < layerIndex; i += 1) {
      offsetX += (colWidths.get(i) ?? 0) + GAP_X;
    }

    const rowHeight = rowHeights.get(key) ?? 60;
    list.forEach((n, index) => {
      const size = nodeSize(n.kind, n.label);
      const x = offsetX + (colWidths.get(key) ?? 0) / 2 - size.width / 2;
      const y = PAD + index * (rowHeight + GAP_Y);
      nodes.push({
        id: n.id,
        type: "diagram",
        position: { x, y },
        width: size.width,
        height: size.height,
        data: {
          label: n.label,
          kind: n.kind,
          color: n.color,
          detail: n.detail,
        },
      });
    });
  });

  const edges: DiagramEdge[] = parsed.edges
    .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
    .map((e, index) => ({
      id: `e-${index + 1}`,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.animated,
      type: "smoothstep",
      markerEnd: { type: "arrowclosed" },
    }));

  return { version: 1, title: parsed.title, nodes, edges };
}

export function buildDocFromAiJson(
  input: {
    title?: string;
    nodes: Array<{ id: string; label: string; kind?: NodeKind; color?: string; detail?: string }>;
    edges: Array<{ source: string; target: string; label?: string }>;
  }
): DiagramDoc {
  const nodes: ParsedNode[] = input.nodes.map((n) => ({
    id: n.id || `n-${Math.random().toString(36).slice(2, 7)}`,
    label: n.label,
    kind: n.kind ?? "rectangle",
    color: n.color,
    detail: n.detail,
  }));
  const edges: ParsedEdge[] = input.edges.map((e) => ({
    source: e.source,
    target: e.target,
    label: e.label,
    animated: false,
  }));
  return buildDocFromParsed({ title: input.title || "AI 生成图表", nodes, edges });
}
