import type { DiagramDoc } from "./types";

function mermaidShape(kind: string, id: string, label: string): string {
  const safe = label.replace(/"/g, "'");
  switch (kind) {
    case "decision":
      return `${id}{"${safe}"}`;
    case "database":
      return `${id}[("${safe}")]`;
    case "ellipse":
      return `${id}(("${safe}"))`;
    case "hexagon":
      return `${id}{{"${safe}"}}`;
    case "parallelogram":
      return `${id}[/"${safe}"/]`;
    case "note":
      return `${id}["备注: ${safe}"]`;
    case "rounded":
      return `${id}("${safe}")`;
    default:
      return `${id}["${safe}"]`;
  }
}

export function toMermaid(doc: DiagramDoc): string {
  const idMap = new Map<string, string>();
  doc.nodes.forEach((node, index) => idMap.set(node.id, `n${index + 1}`));

  const lines: string[] = ["flowchart LR"];
  doc.nodes.forEach((node) => {
    const label = node.data.label || "节点";
    lines.push(`  ${mermaidShape(node.data.kind, idMap.get(node.id) ?? node.id, label)}`);
  });

  doc.edges.forEach((edge) => {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) return;
    const label = typeof edge.label === "string" ? edge.label.replace(/"/g, "'") : "";
    if (edge.animated) {
      lines.push(`  ${source} ==${label}==> ${target}`);
    } else {
      lines.push(`  ${source} --${label}--> ${target}`);
    }
  });

  return lines.join("\n");
}
