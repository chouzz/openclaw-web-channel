import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import * as handlers from './api.js';
import path from 'node:path';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

export default definePluginEntry({
  id: 'web-channel',
  name: 'Web Channel',
  description: 'Bridge REST/SSE to OpenClaw runtime agent APIs',
  register(api: any) {
    if (api.registrationMode !== 'full') return;

    const wrap = (handler: any) => (req: IncomingMessage, res: ServerResponse) => handler(req, res, api);

    // API Routes - registered with exact match first, then prefix for SSE
    api.registerHttpRoute({
      path: '/plugins/web-channel/api/chat',
      auth: 'plugin',
      handler: wrap(handlers.handleChat),
    });

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/sessions',
      auth: 'plugin',
      handler: wrap(handlers.handleListSessions),
    });

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/history',
      auth: 'plugin',
      handler: wrap(handlers.handleHistory),
    });

    api.registerHttpRoute({
      path: '/plugins/web-channel/api/config',
      auth: 'plugin',
      handler: wrap(handlers.handleConfig),
    });

    // SSE endpoint - prefix match for query params
    api.registerHttpRoute({
      path: '/plugins/web-channel/api/sse',
      auth: 'plugin',
      match: 'prefix',
      handler: wrap(handlers.handleSSE),
    });

    // Static file serving - catch-all prefix
    const webDistPath = path.resolve(import.meta.dirname, '../dist/web');

    api.registerHttpRoute({
      path: '/plugins/web-channel',
      auth: 'plugin',
      match: 'prefix',
      replaceExisting: true,
      handler: (req: IncomingMessage, res: ServerResponse) => {
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
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.json': 'application/json; charset=utf-8',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
          };
          res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
          fs.createReadStream(fullPath).pipe(res);
        } else {
          // SPA fallback
          const indexPath = path.join(webDistPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            fs.createReadStream(indexPath).pipe(res);
          } else {
            res.writeHead(404);
            res.end('Web UI not built. Run: cd web && pnpm install && pnpm build');
          }
        }
      },
    });

    api.logger.info?.('[web-channel] Plugin registered with SDK native runtime APIs');
  },
});
