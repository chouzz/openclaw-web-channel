import type { IncomingMessage, ServerResponse } from 'node:http';
import { addConnection } from './sse.js';

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
    const bodyStr = await readBody(req);
    const { sessionId, message } = JSON.parse(bodyStr);

    const ocSession = await api.runtime.getSession(sessionId);
    await ocSession.dispatch({
      type: 'message',
      text: message,
      channel: 'web-channel',
    });

    sendJson(res, 200, { status: 'ok' });
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}

export async function handleSSE(req: IncomingMessage, res: ServerResponse, _api: any) {
  const url = new URL(req.url || '', 'http://localhost');
  const sessionId = url.pathname.split('/').pop();

  if (!sessionId) {
    sendJson(res, 400, { error: 'Missing sessionId' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Necessary for some proxies to keep the connection open
  res.write(': keep-alive\n\n');

  addConnection(sessionId, res);
}

export async function handleListSessions(_req: IncomingMessage, res: ServerResponse, api: any) {
  try {
    const sessions = await api.runtime.listSessions({ channel: 'web-channel' });
    sendJson(res, 200, sessions);
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}

export async function handleCreateSession(req: IncomingMessage, res: ServerResponse, api: any) {
  try {
    const bodyStr = await readBody(req);
    const { name } = JSON.parse(bodyStr || '{}');

    const session = await api.runtime.createSession({
      name: name || 'New Chat',
      channel: 'web-channel',
    });
    sendJson(res, 200, session);
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}

export async function handleDeleteSession(req: IncomingMessage, res: ServerResponse, api: any) {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const id = url.pathname.split('/').pop();

    if (!id) {
      sendJson(res, 400, { error: 'Missing session id' });
      return;
    }

    await api.runtime.deleteSession(id);
    sendJson(res, 200, { status: 'ok' });
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}

export async function handleConfig(_req: IncomingMessage, res: ServerResponse, api: any) {
  try {
    const config = await api.runtime.getConfig();
    sendJson(res, 200, config);
  } catch (error: any) {
    sendJson(res, 500, { error: error.message });
  }
}
