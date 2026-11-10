/**
 * MoonBridge — Protocol translation: Responses API ↔ Chat Completions
 *
 * Handles request conversion (Responses → Chat) and
 * response conversion (Chat → Responses), including SSE streaming
 * with a stateful StreamTranslator that accumulates content for
 * the `done` lifecycle events.
 */

// ─── ID generation ─────────────────────────────────────────────
let _counter = 0;
function uid(prefix) {
  _counter++;
  return `${prefix}_${Date.now().toString(36)}${_counter.toString(36)}`;
}

// ─── Request: Responses → Chat Completions ─────────────────────
//
// Key mappings:
//   instructions  → system message (prepended)
//   input string  → { role: "user", content }
//   input[] items → messages[]  (role-based or typed)
//   tools[]       → externally-tagged { type:"function", function:{…} }
//
export function responsesToChatRequest(respReq) {
  const messages = [];

  // 1. instructions → system message
  if (respReq.instructions) {
    messages.push({ role: 'system', content: respReq.instructions });
  }

  // 2. input → user/tool messages
  if (typeof respReq.input === 'string') {
    messages.push({ role: 'user', content: respReq.input });
  } else if (Array.isArray(respReq.input)) {
    for (const item of respReq.input) {
      if (item.role === 'user') {
        // user message — content can be string or content[]
        messages.push({
          role: 'user',
          content: typeof item.content === 'string'
            ? item.content
            : item.content?.map(c => {
                if (c.type === 'input_text') return { type: 'text', text: c.text };
                if (c.type === 'input_image') return { type: 'image_url', image_url: c.image_url };
                return c;
              }),
        });
      } else if (item.role === 'assistant') {
        messages.push({
          role: 'assistant',
          content: item.content ?? null,
          tool_calls: item.tool_calls,  // pass through if present
        });
      } else if (item.type === 'function_call_output') {
        messages.push({
          role: 'tool',
          tool_call_id: item.call_id,
          content: item.output,
        });
      }
      // skip: reasoning items
    }
  }

  // 3. model
  const chatReq = { model: respReq.model, messages };

  // 4. tools — internally-tagged → externally-tagged
  if (respReq.tools) {
    chatReq.tools = respReq.tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description ?? '',
        parameters: t.parameters ?? {},
        strict: t.strict ?? undefined,
      },
    }));
  }

  // 5. pass-through scalar params
  const passthrough = [
    'temperature', 'max_output_tokens', 'max_tokens',
    'top_p', 'frequency_penalty', 'presence_penalty',
    'stop', 'stream', 'metadata', 'parallel_tool_calls',
    'seed', 'user',
  ];
  for (const key of passthrough) {
    if (respReq[key] !== undefined) chatReq[key] = respReq[key];
  }

  // 6. tool_choice mapping
  if (respReq.tool_choice) {
    const tc = respReq.tool_choice;
    if (tc === 'auto' || tc === 'none' || tc === 'required') {
      chatReq.tool_choice = tc;
    } else if (typeof tc === 'object' && tc.type === 'function') {
      chatReq.tool_choice = { type: 'function', function: { name: tc.name } };
    }
  }

  return chatReq;
}


// ─── Response (non-streaming): Chat → Responses ────────────────
export function chatToResponsesResponse(chatResp) {
  const choice = chatResp.choices?.[0];
  const msg = choice?.message ?? {};
  const output = [];

  // message item
  if (msg.content) {
    output.push({
      type: 'message',
      id: uid('msg'),
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: msg.content, annotations: [] }],
    });
  }

  // function_call items
  if (msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      if (tc.type !== 'function') continue;
      output.push({
        type: 'function_call',
        id: uid('fc'),
        call_id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
        status: 'completed',
      });
    }
  }

  const finishMap = { stop: 'completed', length: 'incomplete', content_filter: 'incomplete' };
  return {
    id: uid('resp'),
    previous_response_id: null,
    object: 'response',
    created: Math.floor(Date.now() / 1000),
    model: chatResp.model,
    status: finishMap[choice?.finish_reason] ?? 'completed',
    output,
    usage: chatResp.usage ?? null,
  };
}


// ─── Streaming translator class ────────────────────────────────
//
// Chat Completions SSE chunks → Responses SSE named events.
// Statefully accumulates content/text/arguments so the `done`
// lifecycle events carry the full payload.
//
export class StreamTranslator {
  #respId;
  #model;

  #msgItemId;
  #contentText = '';

  // Track tool calls by Chat tool_calls[].id
  #toolCallMap = new Map(); // chatCallId → { fcId, name, args }

  #didEmitMsgItem = false;
  #didEmitContentPart = false;
  #didFinish = false;

  constructor(chatChunk) {
    this.#respId = chatChunk.id ? `resp_${chatChunk.id.slice(8)}` : uid('resp');
    this.#model  = chatChunk.model ?? 'unknown';
  }

  /**
   * Process one Chat Completions SSE chunk and return an array of
   * { event, data } Responses SSE events (or an empty array).
   *
   * Callers must call flush() after the stream ends to emit
   * final lifecycle events.
   */
  processChunk(chatChunk) {
    const events = [];
    const choices = chatChunk.choices?.[0] ?? {};
    const delta   = choices.delta ?? {};
    const finish  = choices.finish_reason;

    // ── Emit message output_item & content_part on first assistant role ──
    // Role may arrive alone or bundled with content/tool_calls in the first chunk.
    if (delta.role === 'assistant' && !this.#didEmitMsgItem) {
      this.#didEmitMsgItem = true;
      this.#msgItemId = uid('msg');
      events.push({
        event: 'response.output_item.added',
        data: {
          type: 'message',
          id: this.#msgItemId,
          role: 'assistant',
          status: 'in_progress',
          content: [],
        },
      });
    }

    if (this.#didEmitMsgItem && !this.#didEmitContentPart) {
      this.#didEmitContentPart = true;
      events.push({
        event: 'response.content_part.added',
        data: { index: 0, part: { type: 'output_text', text: '' } },
      });
    }

    // ── Content delta ──
    if (delta.content) {
      this.#contentText += delta.content;
      events.push({
        event: 'response.output_text.delta',
        data: { index: 0, delta: delta.content },
      });
    }

    // ── Tool call deltas ──
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        // New tool call (has id) → emit output_item.added
        if (tc.id && !this.#toolCallMap.has(tc.id)) {
          const fcId = uid('fc');
          this.#toolCallMap.set(tc.id, {
            fcId,
            name: tc.function?.name ?? '',
            args: '',
          });
          events.push({
            event: 'response.output_item.added',
            data: {
              type: 'function_call',
              id: fcId,
              call_id: tc.id,
              name: tc.function?.name ?? '',
              arguments: '',
              status: 'in_progress',
            },
          });
        }

        // Arguments delta
        if (tc.function?.arguments) {
          const entry = this.#toolCallMap.get(tc.id);
          if (entry) {
            entry.args += tc.function.arguments;
            events.push({
              event: 'response.function_call_arguments.delta',
              data: { delta: tc.function.arguments },
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Call after the upstream stream ends.  Returns the final
   * lifecycle events (done + completed).
   */
  flush() {
    if (this.#didFinish) return [];
    this.#didFinish = true;
    const events = [];

    // Close message content
    if (this.#didEmitContentPart) {
      events.push({
        event: 'response.output_text.done',
        data: { index: 0, text: this.#contentText },
      });
      events.push({
        event: 'response.content_part.done',
        data: {
          index: 0,
          part: { type: 'output_text', text: this.#contentText },
        },
      });
    }

    if (this.#didEmitMsgItem) {
      events.push({
        event: 'response.output_item.done',
        data: {
          type: 'message',
          id: this.#msgItemId,
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text: this.#contentText, annotations: [] }],
        },
      });
    }

    // Close tool calls
    for (const [callId, entry] of this.#toolCallMap) {
      events.push({
        event: 'response.function_call_arguments.done',
        data: { arguments: entry.args },
      });
      events.push({
        event: 'response.output_item.done',
        data: {
          type: 'function_call',
          id: entry.fcId,
          call_id: callId,
          name: entry.name,
          arguments: entry.args,
          status: 'completed',
        },
      });
    }

    // Final response.completed
    events.push({
      event: 'response.completed',
      data: {
        response: {
          id: this.#respId,
          status: 'completed',
          output: [],
          model: this.#model,
          usage: null,
        },
      },
    });

    return events;
  }
}

// ─── Exports ───────────────────────────────────────────────────
export const RESPONSES_API = '/v1/responses';
export const CHAT_API = '/v1/chat/completions';
export { uid };
