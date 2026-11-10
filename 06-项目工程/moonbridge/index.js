/**
 * MoonBridge — Protocol translation proxy
 *
 * Listens on :3002 (configurable via PORT env).
 *   POST /v1/responses  →  forward to upstream as POST /v1/chat/completions
 *
 * Upstream defaults to http://localhost:3001 (FreeLLMAPI).
 * Override with UPSTREAM_URL env.
 */

import http from 'node:http';
import {
  responsesToChatRequest,
  chatToResponsesResponse,
  StreamTranslator,
  RESPONSES_API,
  CHAT_API,
} from './lib/translate.js';

const PORT     = parseInt(process.env.PORT ?? '3002', 10);
const UPSTREAM = (process.env.UPSTREAM_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const UPSTREAM_CHAT = `${UPSTREAM}${CHAT_API}`;


// ─── Helpers ──────────────────────────────────────────────────────

function sendJSON(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sendError(res, status, message) {
  sendJSON(res, status, { error: { message, type: 'moonbridge_error' } });
}

function writeSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}


// ─── Non-streaming handler ────────────────────────────────────────
async function handleNonStreaming(chatReq, res) {
  const upstreamRes = await fetch(UPSTREAM_CHAT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': chatReq.headers?.authorization ?? '',
    },
    body: JSON.stringify(chatReq.body),
  });

  if (!upstreamRes.ok) {
    const errBody = await upstreamRes.text();
    try { return sendJSON(res, upstreamRes.status, JSON.parse(errBody)); }
    catch { return sendError(res, upstreamRes.status, errBody); }
  }

  const chatResp = await upstreamRes.json();
  const responsesResp = chatToResponsesResponse(chatResp);
  sendJSON(res, 200, responsesResp);
}


// ─── Streaming handler ────────────────────────────────────────────
async function handleStreaming(chatReq, res) {
  const upstreamRes = await fetch(UPSTREAM_CHAT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': chatReq.headers?.authorization ?? '',
    },
    body: JSON.stringify(chatReq.body),
  });

  if (!upstreamRes.ok) {
    const errBody = await upstreamRes.text();
    try { return sendJSON(res, upstreamRes.status, JSON.parse(errBody)); }
    catch { return sendError(res, upstreamRes.status, errBody); }
  }

  // SSE headers
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });

  const reader = upstreamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let translator = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          const json = trimmed.slice(6);
          try {
            const chunk = JSON.parse(json);

            // Instantiate translator on first chunk
            if (!translator) {
              translator = new StreamTranslator(chunk);
            }

            const events = translator.processChunk(chunk);
            for (const ev of events) {
              writeSSE(res, ev.event, ev.data);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Flush final lifecycle events
  if (translator) {
    const finalEvents = translator.flush();
    for (const ev of finalEvents) {
      writeSSE(res, ev.event, ev.data);
    }
  }

  res.end();
}


// ─── Request dispatch ─────────────────────────────────────────────
async function onRequest(req, res) {
  // CORS
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only POST /v1/responses
  if (req.method !== 'POST' || req.url !== RESPONSES_API) {
    sendError(res, 404, `Not found: ${req.method} ${req.url}`);
    return;
  }

  // Parse body
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  let respReq;
  try {
    respReq = JSON.parse(Buffer.concat(buffers).toString());
  } catch {
    sendError(res, 400, 'Invalid JSON body');
    return;
  }

  // Convert to Chat Completions request
  const chatBody = responsesToChatRequest(respReq);
  const isStream = chatBody.stream === true || chatBody.stream === 'true';

  const chatReq = {
    body: chatBody,
    headers: { authorization: req.headers.authorization ?? '' },
  };

  try {
    if (isStream) {
      await handleStreaming(chatReq, res);
    } else {
      await handleNonStreaming(chatReq, res);
    }
  } catch (err) {
    if (!res.headersSent) {
      sendError(res, 502, `Upstream error: ${err.message}`);
    }
    res.end();
  }
}


// ─── Start ────────────────────────────────────────────────────────
const server = http.createServer(onRequest);
server.listen(PORT, () => {
  console.log(`  MoonBridge running on http://localhost:${PORT}${RESPONSES_API}`);
  console.log(`  Upstream: ${UPSTREAM_CHAT}`);
});
console.log('  __  __                      ____            _     ');
console.log(' |  \\/  | ___  _ __ ___   ___| __ ) _ __ __ _(_)___ ');
console.log(' | |\\/| |/ _ \\| \'_ ` _ \\ / _ \\  _ \\| \'__/ _` | / __|');
console.log(' | |  | | (_) | | | | | |  __/ |_) | | | (_| | \\__ \\');
console.log(' |_|  |_|\\___/|_| |_| |_|\\___|____/|_|  \\__,_|_|___/');
