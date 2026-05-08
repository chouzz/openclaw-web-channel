# OpenClaw Web Channel

An OpenClaw plugin that provides a standalone ChatGPT-style Web UI for interacting with OpenClaw. It uses a REST API plus SSE (Server-Sent Events) for real-time streaming responses.

## Features

- 🌐 Standalone Web UI with a ChatGPT-like layout
- 📡 Real-time streaming via SSE
- 🔒 Bearer token authentication
- 💬 Multi-session chat management
- 🔧 Tool invocation visibility
- 📝 Markdown rendering with code highlighting
- 🌗 Light and dark themes
- 📱 Responsive layout
- 🚀 Frontend bundled and served directly by the plugin

## Installation

Recommended (local development): use `--link`.

```bash
# Clone repository
git clone https://github.com/chouzz/openclaw-web-channel.git
cd openclaw-web-channel

# Install into OpenClaw (linked install, avoids npm copy/install conflicts)
openclaw plugins install . --link

# Load plugin
openclaw gateway restart
```

### Why `--link`?

In some environments, non-link install (`openclaw plugins install .`) may trigger npm dependency resolution conflicts during staged install. `--link` is the most reliable local setup and was verified for this plugin.

## Configuration

Add plugin configuration in OpenClaw:

```json5
{
  plugins: {
    entries: {
      "web-channel": {
        token: "your-web-access-token",
        gatewayUrl: "ws://127.0.0.1:18789", // optional
        gatewayToken: "" // optional if gateway auth is not required
      }
    }
  }
}
```

## Usage

1. Start OpenClaw Gateway
2. Open `http://127.0.0.1:18789/plugins/web-channel/`
3. Enter your token (if configured)
4. Start chatting

## Tech Stack

- **Backend:** OpenClaw Plugin SDK + TypeScript (ESM)
- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **Streaming:** SSE (`text/event-stream`)
- **Bridge Layer:** Plugin HTTP routes + internal Gateway WebSocket bridge
- **State:** Zustand

## Development

```bash
# Install dependencies
pnpm install

# Build frontend
cd web && pnpm install && pnpm build

# Build plugin (runs frontend + plugin steps)
pnpm build
```

## License

MIT
