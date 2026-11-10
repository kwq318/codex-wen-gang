# MoonBridge

协议转换代理：将 Codex 发出的 **OpenAI Responses API** 请求翻译为 **Chat Completions** 格式，再转发给 FreeLLMAPI（或其他兼容的 Chat Completions 后端）。

```
Codex ──→ POST /v1/responses ──→ MoonBridge :3002 ──→ POST /v1/chat/completions ──→ FreeLLMAPI :3001
```

## 快速开始

### 前提

- Node.js 20+
- 已有运行的 [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) 实例（默认 `http://localhost:3001`）

### 启动 MoonBridge

```bash
cd moonbridge
node index.js
```

默认监听 `http://localhost:3002`。

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3002` | MoonBridge 监听端口 |
| `UPSTREAM_URL` | `http://localhost:3001` | 上游 Chat Completions API 地址 |

### 配置 Codex

在 Codex 中将 `wire_api` 设为 `"responses"`，将 API base URL 指向 MoonBridge：

```json
{
  "wire_api": "responses",
  "api": "https://api.openai.com",
  "base_url": "http://localhost:3002/v1"
}
```

或直接：

```bash
OPENAI_BASE_URL=http://localhost:3002/v1 codex
```

## 工作原理

| 方向 | 转换 |
|------|------|
| 请求 | `instructions` → `system message`（前置）|
| 请求 | `input[]` / plain string → `messages[]` |
| 请求 | `input[].type=function_call_output` → `role: "tool"` |
| 请求 | `tools[]`（内部标记）→ `tools[].function`（外部标记）|
| 响应 | `choices[].message.content` → `output[].message` |
| 响应 | `choices[].message.tool_calls[]` → `output[].function_call` |
| 流式 | Chat SSE `data: {...}` → Responses 命名事件流 |

## 限制

- `previous_response_id` 未实现——首次请求需发送完整 `input` 历史
- `reasoning` item 被跳过（Chat Completions 无对应字段）
- 仅支持 `function` 类型工具（`web_search`、`file_search` 等内置工具暂不支持）
- 单 `choice` 模式（`n=1`）

## License

MIT
