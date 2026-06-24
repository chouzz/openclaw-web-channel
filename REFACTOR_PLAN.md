# Refactor Plan: Replace Manual WS Bridge with SDK Native API

## Goal

Replace the hand-written Gateway WebSocket bridge (`gateway-ws.ts`) with OpenClaw Plugin SDK native APIs. Remove the `ws` npm dependency entirely.

## Current Architecture

```
Browser (REST+SSE) → Plugin HTTP Routes → Manual Gateway WS Bridge (ws lib) → OpenClaw Runtime
```

## Target Architecture

```
Browser (REST+SSE) → Plugin HTTP Routes → SDK Native API (api.runtime.agent.*) → OpenClaw Runtime
```

## Key SDK APIs to Use

### 1. `api.runtime.agent.runEmbeddedAgent(params)` — Send messages & get streaming replies

From the SDK type definitions (`types-Tcpca_5M.d.ts`):

```typescript
type RunEmbeddedAgentParams = {
  sessionId: string;           // Session identifier
  sessionKey?: string;          // Optional session key
  agentId?: string;             // Agent ID
  messageChannel?: string;      // Channel name (e.g. "web-channel")
  sessionFile: string;          // Path to session transcript file
  workspaceDir: string;         // Agent workspace directory
  agentDir?: string;            // Agent directory
  config?: OpenClawConfig;       // Optional config override
  prompt: string;                // User's message text
  timeoutMs: number;             // Timeout in milliseconds
  runId: string;                // Unique run ID

  // Streaming callbacks:
  onPartialReply?: (payload: PartialReplyPayload) => void | Promise<void>;
  onAgentEvent?: (evt: { stream: string; data: Record<string, unknown>; sessionKey?: string }) => void | Promise<void>;
  onAssistantMessageStart?: () => void | Promise<void>;
  onToolResult?: (payload: ReplyPayload) => void | Promise<void>;
  onExecutionStarted?: (info?: { lifecycleGeneration?: string }) => void;
  // ... many more optional callbacks
};

type EmbeddedAgentRunResult = {
  payloads?: Array<{
    text?: string;
    mediaUrl?: string;
    isError?: boolean;
    isReasoning?: boolean;
    channelData?: Record<string, unknown>;
  }>;
  meta: EmbeddedAgentRunMeta;
  // ...
};
```

### 2. `api.runtime.agent.session.*` — Session management

```typescript
api.runtime.agent.session.getSessionEntry({ agentId, sessionKey })
api.runtime.agent.session.listSessionEntries({ agentId })
api.runtime.agent.session.patchSessionEntry({ agentId, sessionKey, update: ... })
api.runtime.agent.session.upsertSessionEntry({ agentId, sessionKey, update: ... })
```

### 3. Session Transcript API — Read chat history

```typescript
import { readSessionTranscriptEvents } from 'openclaw/plugin-sdk/session-transcript-runtime'
// or use api.runtime.agent.session helpers
```

### 4. Agent directory/workspace resolution

```typescript
const agentDir = api.runtime.agent.resolveAgentDir(cfg);
const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);
```

## Files to Change

### Delete
- `src/gateway-ws.ts` — Entire manual WS bridge implementation
- `src/types.ts` — Remove WS protocol types (WSFrame, WSRequest, WSResponse, WSEvent), keep web-facing types
- `src/openclaw-plugin-sdk.d.ts` — Remove or update (SDK is now a real dependency)

### Major Rewrite
- `src/api.ts` — Replace all `getGatewayWS()` calls with SDK native API calls
- `src/index.ts` — Pass `api` object properly, store it for use in handlers
- `src/config.ts` — Remove `gatewayUrl` and `gatewayToken` (no longer needed), keep `webToken`

### Keep (minor updates)
- `src/sse.ts` — Keep as-is (SSE connection manager for browser push)

### No Changes
- `web/` — Frontend stays the same (same API contract: POST /api/chat, GET /api/sse, etc.)
- `openclaw.plugin.json` — No changes needed
- `package.json` — Remove `ws` and `@types/ws` dependencies

## Detailed Implementation Steps

### Step 1: Update `src/config.ts`

Remove `gatewayUrl` and `gatewayToken` from config. Keep `webToken`.

```typescript
export interface PluginConfig {
  webToken: string;
}

export function getConfig(api: any): PluginConfig {
  const pluginConfig = api.pluginConfig || {};
  const webToken = pluginConfig.token || '';
  return { webToken };
}
```

Also remove `gatewayUrl` and `gatewayToken` from `openclaw.plugin.json` configSchema.

### Step 2: Update `src/types.ts`

Remove WS protocol types. Keep only web-facing types.

```typescript
export interface WebSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  text?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
}

export interface ToolResult {
  id: string;
  output: any;
}

export interface SSEEvent {
  type: 'message' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'agent';
  data: any;
}
```

### Step 3: Delete `src/gateway-ws.ts`

Entirely remove this file and all imports referencing it.

### Step 4: Rewrite `src/api.ts`

Key changes:
- Remove `import { getGatewayWS } from './gateway-ws.js'`
- Store a reference to `api` (the SDK API object) at module level or pass it through
- In `handleChat`:
  - Use `api.runtime.agent.runEmbeddedAgent()` instead of `gws.chatSend()`
  - Use `onPartialReply` callback to stream text to SSE connections via `broadcast()`
  - Use `onAgentEvent` callback to forward events
  - Use `onToolResult` to forward tool results
  - On completion, broadcast 'done' event
- In `handleListSessions`:
  - Use `api.runtime.agent.session.listSessionEntries()` instead of `gws.listSessions()`
- In `handleHistory`:
  - Use session transcript API or `api.runtime.agent.session.getSessionEntry()` instead of `gws.chatHistory()`

Example `handleChat` rewrite:

```typescript
export async function handleChat(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const config = getConfig(api);
    // ... auth check ...

    const bodyStr = await readBody(req);
    const { sessionId, message } = JSON.parse(bodyStr);

    if (!sessionId || !message) {
      return sendJson(res, 400, { error: 'Missing sessionId or message' });
    }

    const sessionKey = sessionId.startsWith('web:') ? sessionId : `web:${sessionId}`;
    const cfg = api.config || api.runtime?.config?.current?.() || {};

    // Resolve agent directories
    const agentDir = api.runtime.agent.resolveAgentDir(cfg);
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);
    const sessionFile = path.join(agentDir, 'sessions', `${sessionKey}.jsonl`);

    // Ensure session file directory exists
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });

    const runId = crypto.randomUUID();

    // Run embedded agent with streaming callbacks
    await api.runtime.agent.runEmbeddedAgent({
      sessionId: sessionKey,
      sessionKey,
      messageChannel: 'web-channel',
      sessionFile,
      workspaceDir,
      agentDir,
      config: cfg,
      prompt: message,
      timeoutMs: api.runtime.agent.resolveAgentTimeoutMs(cfg) || 120000,
      runId,

      onPartialReply: (payload) => {
        if (payload.text) {
          broadcast(sessionId, 'agent', { text: payload.text });
        }
      },

      onToolResult: (payload) => {
        broadcast(sessionId, 'tool_result', payload);
      },

      onAgentEvent: (evt) => {
        if (evt.sessionKey) {
          const sId = evt.sessionKey.startsWith('web:')
            ? evt.sessionKey.slice(4)
            : evt.sessionKey;
          broadcast(sId, 'agent_event', evt.data);
        }
      },

      onAssistantMessageStart: () => {
        broadcast(sessionId, 'start', {});
      },
    });

    // Signal completion
    broadcast(sessionId, 'done', {});
    sendJson(res, 200, { ok: true, runId });
  } catch (error: any) {
    broadcast(sessionId, 'error', { message: error.message });
    sendJson(res, 500, { error: error.message });
  }
}
```

### Step 5: Update `src/index.ts`

- Remove the `import * as handlers` and `wrap` pattern if needed
- The `api` object is already passed to handlers
- Update logging

### Step 6: Update `package.json`

Remove dependencies:
- `ws` (^8.18.0)
- `@types/ws` (^8.18.1)

Remove from `openclaw.plugin.json` configSchema:
- `gatewayUrl`
- `gatewayToken`

### Step 7: Update `openclaw.plugin.json`

```json
{
  "id": "web-channel",
  "name": "Web Channel",
  "description": "ChatGPT-style Web UI for OpenClaw via REST API + SSE",
  "version": "0.2.0",
  "contracts": {
    "tools": []
  },
  "activation": {
    "onStartup": true
  },
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "token": {
        "type": "string",
        "description": "Web access token for authentication"
      }
    }
  }
}
```

### Step 8: Update README.md

- Remove references to `gatewayUrl` and `gatewayToken` config
- Update description to mention SDK native API
- Update version references

## Important Notes

1. **Session key format**: Keep using `web:${sessionId}` prefix to namespace sessions
2. **Streaming**: `onPartialReply` provides real-time text chunks — perfect for SSE push
3. **Error handling**: Catch errors from `runEmbeddedAgent` and broadcast error events to SSE
4. **Concurrent requests**: `runEmbeddedAgent` handles queuing internally, but we should prevent double-sends to the same session
5. **Session file**: Must be pre-created before calling `runEmbeddedAgent` (ensure directory exists)
6. **Config**: `api.config` or `api.runtime.config.current()` provides the OpenClaw config snapshot
7. **Agent ID**: May need to determine the default agent ID — check `api.runtime.agent` for helpers

## Testing

After refactoring:
1. `pnpm install` — verify clean install without `ws`
2. `pnpm typecheck` — verify TypeScript compiles
3. `openclaw plugins install . --link` — install plugin
4. `openclaw gateway restart` — restart gateway
5. Open `http://127.0.0.1:18789/plugins/web-channel/` — test in browser
6. Verify: send message → streaming response → session list → history
