import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `你是专业的系统架构师和图表生成助手。用户会用中文描述一个流程图、架构图或状态机，你需要把它转换成结构化 JSON。

输出格式（只输出 JSON，不要 Markdown 代码块）：
{
  "title": "图表标题",
  "nodes": [
    { "id": "n1", "label": "节点名称", "kind": "rectangle" }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "label": "连线说明" }
  ]
}

规则：
- kind 只能是 rectangle、rounded、decision、ellipse、database、note、parallelogram、hexagon 之一
- 开始/结束节点用 rounded，判断节点用 decision，数据存储用 database
- 节点 id 必须唯一，edges 里引用的 source/target 必须存在于 nodes
- 用中文节点名，覆盖用户描述的主要步骤和分支
- 不要遗漏用户明确提到的分支、判断或数据源`;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { prompt?: string; apiKey?: string; baseUrl?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON" }, { status: 400 });
  }

  const prompt = (body?.prompt || "").trim();
  const key = (body?.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "请先输入图表描述" }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: "缺少 API Key，请填写或使用本地智能解析" }, { status: 400 });
  }

  const endpoint = (body?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")
    .trim()
    .replace(/\/+$/, "");
  const model = (body?.model || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

  try {
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `AI 服务错误（${res.status}）`, detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    const doc = extractJson(content);
    if (!doc) {
      return NextResponse.json({ error: "AI 返回内容无法解析为图表 JSON" }, { status: 502 });
    }
    return NextResponse.json({ doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `无法连接 AI 服务：${message}` }, { status: 502 });
  }
}
