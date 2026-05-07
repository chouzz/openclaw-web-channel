import type { IncomingMessage, ServerResponse } from 'node:http';
import { addConnection, broadcast } from './sse.js';
import { getGatewayWS } from './gateway-ws.js';
import { getConfig } from './config.js';

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export async function handleChat(req: IncomingMessage, res: ServerResponse, api: any) {
  try {
    const config = await getConfig(api);
    const gws = await getGatewayWS(config.gatewayUrl, config.gatewayToken);

    const bodyStr = await readBody(req);
    const { sessionId, message } = JSON.parse(bodyStr);

    if (!sessionId || !message) {
      return sendJson(res, 400, { error: 'Missing sessionId or message' });
    }

    const sessionKey = sessionId.startsWith('web:') ? sessionId : `web:${sessionId}`;

    // Map to keep track of listeners to avoid duplicates if possible, or just manage them simply.
    // For a plugin, a simple global listener that filters is okay if not too many sessions.
    if (!(gws as any)._streamingSetup) {
      (gws as any)._streamingSetup = true;
      gws.onEvent((event) => {
        if (event.event === 'agent') {
          const sId = event.payload.sessionKey?.startsWith('web:')
            ? event.payload.sessionKey.slice(4)
            : event.payload.sessionKey;
          if (sId) {
            broadcast(sId, 'agent', event.payload);
            if (event.payload.status === 'done') {
              broadcast(sId, 'done', event.payload);
            }
          }
        }
      });
    }

    const result = await gws.chatSend(sessionKey, message);
    sendJson(res, 200, result);
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}

export async function handleSSE(req: IncomingMessage, res: ServerResponse, _api: any) {
  const url = new URL(req.url || '', 'http://localhost');
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    sendJson(res, 400, { error: 'Missing sessionId query param' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(': keep-alive\n\n');
  addConnection(sessionId, res);
}

export async function handleListSessions(_req: IncomingMessage, res: ServerResponse, api: any) {
  try {
    const config = await getConfig(api);
    const gws = await getGatewayWS(config.gatewayUrl, config.gatewayToken);
    const sessions = await gws.listSessions();
    // Filter sessions that belong to web channel
    const webSessions = (sessions || []).filter((s: any) => s.sessionKey?.startsWith('web:') || s.channel === 'web-channel');
    sendJson(res, 200, webSessions);
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}

export async function handleHistory(req: IncomingMessage, res: ServerResponse, api: any) {
  try {
    const config = await getConfig(api);
    const gws = await getGatewayWS(config.gatewayUrl, config.gatewayToken);
    const url = new URL(req.url || '', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return sendJson(res, 400, { error: 'Missing sessionId' });
    }

    const sessionKey = sessionId.startsWith('web:') ? sessionId : `web:${sessionId}`;
    const history = await gws.chatHistory(sessionKey);
    sendJson(res, 200, history);
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}

export async function handleConfig(_req: IncomingMessage, res: ServerResponse, api: any) {
  try {
    const config = await getConfig(api);
    sendJson(res, 200, config);
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}
