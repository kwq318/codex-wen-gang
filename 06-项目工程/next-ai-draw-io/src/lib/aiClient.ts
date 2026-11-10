import type { AiGenerateResponse, AiSettings } from "./types";

export interface AiGenerateResult extends AiGenerateResponse {
  source: "local" | "cloud";
}

export async function generateWithAi(prompt: string, settings: AiSettings): Promise<AiGenerateResult> {
  if (!settings.apiKey.trim()) {
    const { parseDiagramPrompt, buildDocFromParsed } = await import("./diagramParser");
    const parsed = parseDiagramPrompt(prompt);
    const doc = buildDocFromParsed(parsed);
    return {
      title: doc.title,
      nodes: doc.nodes.map((n) => ({ id: n.id, label: n.data.label, kind: n.data.kind, color: n.data.color, detail: n.data.detail })),
      edges: doc.edges.map((e) => ({ source: e.source, target: e.target, label: typeof e.label === "string" ? e.label : undefined })),
      source: "local",
    };
  }

  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...settings }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `AI 服务请求失败（${res.status}）`);
  }

  const data = (await res.json()) as { doc?: AiGenerateResponse; error?: string };
  if (data.error) throw new Error(data.error);
  if (!data.doc) throw new Error("AI 返回数据格式异常");

  return { ...data.doc, source: "cloud" };
}
