# openclaw-web-channel Implementation Plan

## Overview

**Project Name:** `openclaw-web-channel`  
**Project Path:** `~/src/openclaw/openclaw-web-channel/`  
**Type:** OpenClaw plugin + standalone Web frontend  
**Goal:** Provide a ChatGPT-style browser UI for OpenClaw using a REST API and SSE (Server-Sent Events) streaming.

## Positioning vs Reference Project

Reference: `Skyzi000/openclaw-open-webui-channels`

| Dimension | open-webui-channels | openclaw-web-channel |
|---|---|---|
| Target | Integrates with existing Open WebUI | Provides its own standalone Web UI |
| Realtime transport | Socket.IO/WebSocket | SSE (`text/event-stream`) |
| Frontend ownership | Uses Open WebUI frontend | Built-in React frontend |
| Backend role | Bridges OpenClaw to Open WebUI APIs | Plugin-owned REST + SSE + Gateway bridge |
| Scope | Plugin-focused | Plugin + frontend application |

## Architecture

### High-Level Design

`Browser UI (REST + SSE) -> Plugin HTTP Routes -> Internal Gateway WS Bridge -> OpenClaw runtime`

### Why SSE in this design

1. Native browser support through `EventSource`
2. Straightforward streaming model for assistant output
3. HTTP-based event streaming contract (`text/event-stream`)
4. Simpler frontend integration than custom WS protocol handling

## Backend Design (Plugin)

### Core responsibilities

- Register HTTP routes via `api.registerHttpRoute(...)`
- Authenticate incoming browser calls (Bearer token)
- Accept REST chat requests
- Stream assistant output through SSE
- Bridge chat operations to OpenClaw Gateway WebSocket API internally
- Serve static frontend assets from `dist/web`

### Route plan

- `POST /plugins/web-channel/api/chat` — submit user message
- `GET /plugins/web-channel/api/sse?sessionId=...` — subscribe to streaming events
- `GET /plugins/web-channel/api/sessions` — list relevant sessions
- `GET /plugins/web-channel/api/history?sessionId=...` — fetch chat history
- `GET /plugins/web-channel/api/config` — lightweight frontend config
- `GET /plugins/web-channel/*` — static frontend + SPA fallback

### Streaming event contract

- `event: agent` — assistant output payload (chunked/partial or structured)
- `event: done` — stream completion signal
- `event: error` — error payload

## Frontend Design

### Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Zustand
- `react-markdown` + `remark-gfm`
- `highlight.js`

### UX goals

- ChatGPT-like layout
- Session sidebar + active conversation panel
- Streaming message rendering
- Basic tool/event visibility
- Responsive behavior for desktop/mobile
- Theme-ready component structure

## Project Structure

```text
openclaw-web-channel/
├── openclaw.plugin.json
├── package.json
├── tsconfig.json
├── README.md
├── PROPOSAL.md
├── src/
│   ├── index.ts
│   ├── api.ts
│   ├── sse.ts
│   ├── gateway-ws.ts
│   ├── config.ts
│   └── types.ts
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/client.ts
│   │   ├── hooks/useChat.ts
│   │   ├── store/chatStore.ts
│   │   └── components/*
└── dist/web/
```

## Implementation Phases

### Phase 1 — Foundation

- Plugin entry + route registration
- REST chat endpoint
- SSE connection manager
- Gateway WS bridge client
- Minimal React chat UI
- Static asset serving from plugin

### Phase 2 — Core UX Completion

- Session list + history loading
- Stream rendering polish
- Markdown + code highlighting hardening
- Error handling and reconnection behavior
- Token-based auth UX improvements

### Phase 3 — Product Polish

- Better tool/event presentation
- Session rename/delete flows
- Message retry/regenerate patterns
- Improved mobile ergonomics
- Export/import options (optional)

### Phase 4 — Distribution

- Documentation cleanup
- Install/run verification
- Repository maintenance workflow
- Optional package publishing workflow

## Configuration Model

Recommended plugin entry config:

```json5
{
  plugins: {
    entries: {
      "web-channel": {
        token: "your-web-access-token",
        gatewayUrl: "ws://127.0.0.1:18789", // optional
        gatewayToken: "" // optional based on gateway auth mode
      }
    }
  }
}
```

## Risks and Validation

1. **Gateway WS protocol compatibility:** verify request/response/event schema against current OpenClaw runtime.
2. **SSE lifecycle correctness:** ensure cleanup, reconnection behavior, and multi-tab safety.
3. **Route auth scope:** keep plugin routes explicit and avoid accidental privilege assumptions.
4. **Frontend/backend version drift:** keep route contract typed and versioned where possible.

## Success Criteria

- User can open `/plugins/web-channel/` and chat end-to-end
- Assistant responses stream in real time over SSE
- Session history can be loaded and continued
- Plugin routes and auth behavior remain stable after gateway restart
- Documentation is fully English and implementation-focused
