import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { addConnection, broadcast } from './sse.js';
import { getConfig } from './config.js';
import type { ChatMessage, ExternalAgentBinding, SessionType } from './types.js';

const activeRuns = new Set<string>();

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function isAuthorized(req: IncomingMessage, api: any): boolean {
  const config = getConfig(api);
  if (!config.webToken) return true;
  return req.headers['authorization'] === `Bearer ${config.webToken}`;
}

function requireAuth(req: IncomingMessage, res: ServerResponse, api: any): boolean {
  if (isAuthorized(req, api)) return true;
  sendJson(res, 401, { error: 'Unauthorized' });
  return false;
}

function getSessionKey(sessionId: string): string {
  return sessionId.startsWith('web:') ? sessionId : `web:${sessionId}`;
}

function generateSessionId() {
  return `session-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function getRuntimeConfig(api: any): any {
  return api.config || api.runtime?.config?.current?.() || {};
}

function getAgentRuntime(api: any) {
  const runtime = api.runtime?.agent;
  if (!runtime) {
    throw new Error('OpenClaw agent runtime API is unavailable');
  }
  return runtime;
}

function resolveAgentId(api: any, cfg: any): string {
  const runtime = getAgentRuntime(api);
  return (
    runtime.resolveAgentId?.(cfg) ||
    cfg?.defaultAgentId ||
    cfg?.agentId ||
    cfg?.agent?.id ||
    api.agentId ||
    'default'
  );
}

function resolveSessionFile(api: any, cfg: any, sessionKey: string) {
  const runtime = getAgentRuntime(api);
  const agentDir = runtime.resolveAgentDir(cfg);
  const workspaceDir = runtime.resolveAgentWorkspaceDir(cfg);
  const sessionFile = path.join(agentDir, 'sessions', `${sessionKey}.jsonl`);

  fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
  fs.closeSync(fs.openSync(sessionFile, 'a'));

  return { agentDir, workspaceDir, sessionFile };
}

function extractText(value: any): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.text === 'string') return item.text;
        if (item && typeof item.content === 'string') return item.content;
        return '';
      })
      .join('');
  }
  if (value && typeof value.text === 'string') return value.text;
  if (value && typeof value.content === 'string') return value.content;
  return '';
}

function toHistoryMessage(entry: any, index: number): ChatMessage | null {
  if (!entry || typeof entry !== 'object') return null;

  if (entry.role && (entry.content !== undefined || entry.text !== undefined)) {
    return {
      id: String(entry.id || entry.messageId || index),
      role: entry.role,
      content: extractText(entry.text ?? entry.content),
      text: typeof entry.text === 'string' ? entry.text : undefined,
      toolCalls: Array.isArray(entry.toolCalls) ? entry.toolCalls : undefined,
      toolResults: Array.isArray(entry.toolResults) ? entry.toolResults : undefined,
    };
  }

  const payload = entry.payload || entry.data || entry.message || entry.value || {};
  const role = payload.role || entry.role || (entry.type === 'user' ? 'user' : entry.type === 'assistant' ? 'assistant' : undefined);
  const content = extractText(payload.text ?? payload.content ?? entry.text ?? entry.content);

  if (role && content) {
    return {
      id: String(payload.id || entry.id || entry.seq || index),
      role,
      content,
      text: typeof payload.text === 'string' ? payload.text : undefined,
      toolCalls: Array.isArray(payload.toolCalls) ? payload.toolCalls : undefined,
      toolResults: Array.isArray(payload.toolResults) ? payload.toolResults : undefined,
    };
  }

  if (entry.type === 'tool_result' || payload.type === 'tool_result') {
    return {
      id: String(entry.id || payload.id || index),
      role: 'assistant',
      content: '',
      toolResults: [payload],
    };
  }

  return null;
}

async function loadTranscriptEvents(sessionFile: string): Promise<any[]> {
  const content = fs.readFileSync(sessionFile, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function readHistoryMessages(sessionFile: string, sessionEntry?: any): Promise<ChatMessage[]> {
  if (Array.isArray(sessionEntry?.messages)) {
    return sessionEntry.messages
      .map((entry: any, index: number) => toHistoryMessage(entry, index))
      .filter((entry: ChatMessage | null): entry is ChatMessage => entry !== null);
  }

  const events = await loadTranscriptEvents(sessionFile);
  return events
    .map((entry, index) => toHistoryMessage(entry, index))
    .filter((entry: ChatMessage | null): entry is ChatMessage => entry !== null);
}

function normalizeSession(entry: any) {
  const sessionKey = entry?.sessionKey || entry?.id || entry?.key || '';
  const plainId = typeof sessionKey === 'string' && sessionKey.startsWith('web:')
    ? sessionKey.slice(4)
    : sessionKey;
  const sessionMeta = entry?.webChannelMeta || {};

  return {
    ...entry,
    id: plainId || entry?.id,
    sessionKey,
    name: entry?.name || entry?.title || plainId || sessionKey,
    createdAt: entry?.createdAt || entry?.created_at || Date.now(),
    updatedAt: entry?.updatedAt || entry?.updated_at || entry?.lastUpdatedAt || entry?.createdAt || Date.now(),
    sessionType: sessionMeta.sessionType || 'native',
    externalAgent: sessionMeta.externalAgent,
  };
}

function normalizeExternalAgentBinding(value: any): ExternalAgentBinding | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const provider = typeof value.provider === 'string' ? value.provider : 'custom';
  const threadId = typeof value.threadId === 'string' ? value.threadId.trim() : '';
  if (!threadId) return undefined;

  return {
    provider,
    threadId,
    workspace: typeof value.workspace === 'string' ? value.workspace.trim() : undefined,
    instanceLabel: typeof value.instanceLabel === 'string' ? value.instanceLabel.trim() : undefined,
    launchMode: value.launchMode === 'managed' ? 'managed' : 'attach',
    transportStatus: value.transportStatus === 'connected'
      ? 'connected'
      : value.transportStatus === 'configured'
        ? 'configured'
        : 'disconnected',
    endpoint: typeof value.endpoint === 'string' ? value.endpoint.trim() : undefined,
  };
}

function buildSessionMeta(sessionType: SessionType, externalAgent?: ExternalAgentBinding) {
  return {
    sessionType,
    externalAgent: sessionType === 'external_agent' ? externalAgent : undefined,
  };
}

export async function handleChat(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res, api)) return;

  let sessionId = '';
  let doneSent = false;

  try {
    const bodyStr = await readBody(req);
    const { sessionId: rawSessionId, message } = JSON.parse(bodyStr);

    if (!rawSessionId || !message) {
      return sendJson(res, 400, { error: 'Missing sessionId or message' });
    }

    sessionId = rawSessionId;
    const sessionKey = getSessionKey(sessionId);
    const cfg = getRuntimeConfig(api);
    const runtime = getAgentRuntime(api);
    const agentId = resolveAgentId(api, cfg);
    const existingEntry = await runtime.session.getSessionEntry({ agentId, sessionKey }).catch(() => null);
    const existingSession = existingEntry ? normalizeSession(existingEntry) : null;

    if (existingSession?.sessionType === 'external_agent') {
      return sendJson(res, 409, {
        error: 'This session is bound to an external agent thread. Transport execution is not connected yet.',
      });
    }

    if (activeRuns.has(sessionKey)) {
      broadcast(sessionId, 'error', { message: 'A run is already in progress for this session' });
      return sendJson(res, 409, { error: 'A run is already in progress for this session' });
    }

    activeRuns.add(sessionKey);

    const { agentDir, workspaceDir, sessionFile } = resolveSessionFile(api, cfg, sessionKey);
    const timeoutMs = runtime.resolveAgentTimeoutMs?.(cfg) || 120000;
    const runId = crypto.randomUUID();

    const result = await runtime.runEmbeddedAgent({
      sessionId: sessionKey,
      sessionKey,
      agentId,
      messageChannel: 'web-channel',
      sessionFile,
      workspaceDir,
      agentDir,
      prompt: message,
      timeoutMs,
      runId,
      onAssistantMessageStart: async () => {
        broadcast(sessionId, 'agent', { text: '' });
      },
      onPartialReply: async (payload: { text?: string }) => {
        if (payload?.text) {
          broadcast(sessionId, 'agent', { text: payload.text });
        }
      },
      onToolResult: async (payload: any) => {
        broadcast(sessionId, 'tool_result', payload);
      },
      onAgentEvent: async (evt: any) => {
        const payload = evt?.data || evt?.payload || evt;
        const status = payload?.status;
        broadcast(sessionId, 'agent', payload);
        if (status === 'done') {
          doneSent = true;
          broadcast(sessionId, 'done', payload);
        }
      },
    });

    if (!doneSent) {
      broadcast(sessionId, 'done', {});
    }
    return sendJson(res, 200, result);
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    // Map known internal errors to user-friendly messages
    const friendlyMessage = message.includes('No API key found')
      ? 'Agent API key not configured. Please run `openclaw agents add <id>` to set up authentication.'
      : message.includes('agent runtime')
        ? 'Agent runtime is not available. Please check your OpenClaw setup.'
        : message;

    if (sessionId) {
      broadcast(sessionId, 'error', { message: friendlyMessage });
    }
    return sendJson(res, 500, { error: friendlyMessage });
  } finally {
    if (sessionId) {
      activeRuns.delete(getSessionKey(sessionId));
    }
  }
}

export async function handleSSE(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res, api)) return;

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
  if (!requireAuth(req, res, api)) return;

  try {
    const cfg = getRuntimeConfig(api);
    const runtime = getAgentRuntime(api);
    const agentId = resolveAgentId(api, cfg);
    const entries = await runtime.session.listSessionEntries({ agentId });
    const sessions = Array.isArray(entries) ? entries : entries?.entries || [];
    const webSessions = sessions
      .filter((entry: any) => typeof (entry?.sessionKey || entry?.id) === 'string')
      .filter((entry: any) => String(entry.sessionKey || entry.id).startsWith('web:'))
      .map(normalizeSession);

    return sendJson(res, 200, webSessions);
  } catch (error: any) {
    return sendJson(res, 500, { error: error?.message || 'Unknown error' });
  }
}

export async function handleHistory(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res, api)) return;

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return sendJson(res, 400, { error: 'Missing sessionId' });
    }

    const sessionKey = getSessionKey(sessionId);
    const cfg = getRuntimeConfig(api);
    const runtime = getAgentRuntime(api);
    const agentId = resolveAgentId(api, cfg);
    const { sessionFile } = resolveSessionFile(api, cfg, sessionKey);
    let sessionEntry: any;

    try {
      sessionEntry = await runtime.session.getSessionEntry({ agentId, sessionKey });
    } catch {
      if (!fs.existsSync(sessionFile) || fs.statSync(sessionFile).size === 0) {
        return sendJson(res, 200, []);
      }
    }

    const history = await readHistoryMessages(sessionFile, sessionEntry);

    return sendJson(res, 200, history);
  } catch (error: any) {
    return sendJson(res, 500, { error: error?.message || 'Unknown error' });
  }
}

export async function handleConfig(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  const config = getConfig(api);
  return sendJson(res, 200, {
    hasToken: !!config.webToken,
    supportedExternalProviders: ['acpx', 'codex', 'claude-code', 'qwen-code', 'custom'],
  });
}

export async function handleCreateSession(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res, api)) return;

  try {
    const bodyStr = await readBody(req);
    const body = JSON.parse(bodyStr || '{}');
    const sessionId = typeof body.sessionId === 'string' && body.sessionId.trim() ? body.sessionId.trim() : generateSessionId();
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : '新对话';
    const sessionType: SessionType = body.sessionType === 'external_agent' ? 'external_agent' : 'native';
    const externalAgent = normalizeExternalAgentBinding(body.externalAgent);

    if (sessionType === 'external_agent' && !externalAgent) {
      return sendJson(res, 400, { error: 'Missing valid externalAgent binding for external_agent session' });
    }

    const sessionKey = getSessionKey(sessionId);
    const cfg = getRuntimeConfig(api);
    const runtime = getAgentRuntime(api);
    const agentId = resolveAgentId(api, cfg);
    const now = Date.now();
    const existingEntry = await runtime.session.getSessionEntry({ agentId, sessionKey }).catch(() => null);
    const update = {
      ...(existingEntry || {}),
      name,
      title: name,
      createdAt: existingEntry?.createdAt || existingEntry?.created_at || now,
      updatedAt: now,
      webChannelMeta: buildSessionMeta(sessionType, externalAgent),
    };

    const result = await runtime.session.upsertSessionEntry({ agentId, sessionKey, update });
    return sendJson(res, 200, normalizeSession(result || update));
  } catch (error: any) {
    return sendJson(res, 500, { error: error?.message || 'Unknown error' });
  }
}

export async function handleUpdateSession(req: IncomingMessage, res: ServerResponse, api: any) {
  if (req.method !== 'PATCH') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res, api)) return;

  try {
    const bodyStr = await readBody(req);
    const { sessionId, name, sessionType, externalAgent } = JSON.parse(bodyStr);

    if (!sessionId) {
      return sendJson(res, 400, { error: 'Missing sessionId' });
    }

    const sessionKey = getSessionKey(sessionId);
    const cfg = getRuntimeConfig(api);
    const runtime = getAgentRuntime(api);
    const agentId = resolveAgentId(api, cfg);

    const existingEntry = await runtime.session.getSessionEntry({ agentId, sessionKey }).catch(() => null);
    const nextSessionType: SessionType = sessionType === 'external_agent'
      ? 'external_agent'
      : (existingEntry?.webChannelMeta?.sessionType || 'native');
    const nextExternalAgent = externalAgent !== undefined
      ? normalizeExternalAgentBinding(externalAgent)
      : existingEntry?.webChannelMeta?.externalAgent;

    if (nextSessionType === 'external_agent' && !nextExternalAgent) {
      return sendJson(res, 400, { error: 'Missing valid externalAgent binding for external_agent session' });
    }

    const update = {
      ...(existingEntry || {}),
      name: typeof name === 'string' && name.trim() ? name.trim() : existingEntry?.name || existingEntry?.title || sessionId,
      title: typeof name === 'string' && name.trim() ? name.trim() : existingEntry?.title || existingEntry?.name || sessionId,
      updatedAt: Date.now(),
      webChannelMeta: buildSessionMeta(nextSessionType, nextExternalAgent),
    };

    const result = runtime.session.patchSessionEntry
      ? await runtime.session.patchSessionEntry({ agentId, sessionKey, update })
      : await runtime.session.upsertSessionEntry({ agentId, sessionKey, update });

    return sendJson(res, 200, normalizeSession(result || update));
  } catch (error: any) {
    return sendJson(res, 500, { error: error?.message || 'Unknown error' });
  }
}
