import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import * as handlers from './api.js';
import { broadcast } from './sse.js';
import path from 'node:path';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

export default definePluginEntry({
  id: 'web-channel',
  name: 'Web Channel',
  description: 'ChatGPT-style Web UI for OpenClaw',
  register(api) {
    if (api.registrationMode !== 'full') return;

    // Register Channel to receive outbound messages
    api.registerChannel({
      id: 'web-channel',
      capabilities: {
        chatTypes: ['direct'],
        media: true,
        reactions: false,
        threads: false,
      },
      async outbound({ message, session }) {
        // Push message back to browser via SSE
        broadcast(session.id, 'message', {
          id: message.id,
          role: 'assistant',
          content: message.content,
        });
      },
    });

    // API Routes
    const wrap = (handler: any) => (req: IncomingMessage, res: ServerResponse) => handler(req, res, api);

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/chat',
      method: 'POST',
      auth: 'plugin',
      handler: wrap(handlers.handleChat),
    });

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/sse',
      method: 'GET',
      auth: 'none',
      match: 'prefix',
      handler: wrap(handlers.handleSSE),
    });

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/sessions',
      method: 'GET',
      auth: 'plugin',
      handler: wrap(handlers.handleListSessions),
    });

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/sessions',
      method: 'POST',
      auth: 'plugin',
      handler: wrap(handlers.handleCreateSession),
    });

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/sessions',
      method: 'DELETE',
      auth: 'plugin',
      match: 'prefix',
      handler: wrap(handlers.handleDeleteSession),
    });

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/config',
      method: 'GET',
      auth: 'plugin',
      handler: wrap(handlers.handleConfig),
    });

    // Static Files serving
    const webDistPath = path.resolve(import.meta.dirname, '../dist/web');

    api.registerHttpRoute({
      path: '/plugins/web-channel',
      auth: 'none',
      match: 'prefix',
      handler: (req, res) => {
        const url = new URL(req.url || '', 'http://localhost');
        let filePath = url.pathname.replace('/plugins/web-channel', '');

        if (filePath === '' || filePath === '/') {
          filePath = 'index.html';
        } else if (filePath.startsWith('/')) {
          filePath = filePath.slice(1);
        }

        const fullPath = path.join(webDistPath, filePath);

        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const ext = path.extname(fullPath);
          const contentTypes: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.json': 'application/json',
          };
          res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
          fs.createReadStream(fullPath).pipe(res);
        } else {
          // SPA fallback
          res.writeHead(200, { 'Content-Type': 'text/html' });
          fs.createReadStream(path.join(webDistPath, 'index.html')).pipe(res);
        }
      },
    });

    api.logger.info?.('[web-channel] Plugin registered');
  },
});
