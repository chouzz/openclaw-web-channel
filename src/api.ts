import type { IncomingMessage, ServerResponse } from 'node:http';
import { addConnection, broadcast } from './sse.js';
import { getGatewayWS } from './gateway-ws.js';
import { getConfig } from './config.js';

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export async function handleChat(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const config = getConfig(api);
    if (config.webToken) {
      const auth = req.headers['authorization'];
      if (!auth || auth !== `Bearer ${config.webToken}`) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }
    }

    const gws = await getGatewayWS(config.gatewayUrl, config.gatewayToken);
    const bodyStr = await readBody(req);
    const { sessionId, message } = JSON.parse(bodyStr);

    if (!sessionId || !message) {
      return sendJson(res, 400, { error: 'Missing sessionId or message' });
    }

    const sessionKey = sessionId.startsWith('web:') ? sessionId : `web:${sessionId}`;

    // Set up event forwarding once
    if (!(gws as any)._streamingSetup) {
      (gws as any)._streamingSetup = true;
      gws.onEvent((event: any) => {
        if (event.event === 'agent') {
          const payload = event.payload || {};
          const sId = payload.sessionKey?.startsWith('web:')
            ? payload.sessionKey.slice(4)
            : payload.sessionKey;
          if (sId) {
            const text = payload.text || '';
            if (text) {
              broadcast(sId, 'agent', { text, ...payload });
            }
            if (payload.status === 'done') {
              broadcast(sId, 'done', payload);
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

export async function handleSSE(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  const config = getConfig(api);
  if (config.webToken) {
    const auth = req.headers['authorization'];
    if (!auth || auth !== `Bearer ${config.webToken}`) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }
  }

  const url = new URL(req.url || '', 'http://localhost');
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return sendJson(res, 400, { error: 'Missing sessionId query param' });
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

export async function handleListSessions(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const config = getConfig(api);
    if (config.webToken) {
      const auth = req.headers['authorization'];
      if (!auth || auth !== `Bearer ${config.webToken}`) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }
    }

    const gws = await getGatewayWS(config.gatewayUrl, config.gatewayToken);
    const sessions = await gws.listSessions();
    const webSessions = Array.isArray(sessions)
      ? sessions.filter((s: any) => s.sessionKey?.startsWith('web:'))
      : [];
    sendJson(res, 200, webSessions);
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}

export async function handleHistory(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  try {
    const config = getConfig(api);
    if (config.webToken) {
      const auth = req.headers['authorization'];
      if (!auth || auth !== `Bearer ${config.webToken}`) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }
    }

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

export async function handleConfig(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  const config = getConfig(api);
  // Don't expose gateway token to the browser
  sendJson(res, 200, {
    gatewayUrl: config.gatewayUrl,
    hasToken: !!config.webToken,
  });
}
