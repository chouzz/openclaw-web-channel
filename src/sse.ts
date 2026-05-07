import type { ServerResponse } from 'node:http';

const connections = new Map<string, Set<ServerResponse>>();

export function addConnection(sessionId: string, res: ServerResponse) {
  if (!connections.has(sessionId)) {
    connections.set(sessionId, new Set());
  }
  connections.get(sessionId)!.add(res);

  res.on('close', () => {
    removeConnection(sessionId, res);
  });
}

export function removeConnection(sessionId: string, res: ServerResponse) {
  const sessionConnections = connections.get(sessionId);
  if (sessionConnections) {
    sessionConnections.delete(res);
    if (sessionConnections.size === 0) {
      connections.delete(sessionId);
    }
  }
}

export function broadcast(sessionId: string, event: string, data: any) {
  const sessionConnections = connections.get(sessionId);
  if (sessionConnections) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of sessionConnections) {
      if (!res.writableEnded) {
        res.write(payload);
      }
    }
  }
}
