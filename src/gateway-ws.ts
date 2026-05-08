import { WebSocket } from 'ws';
import type { RawData } from 'ws';
import type { WSFrame, WSRequest, WSEvent } from './types.js';

export class GatewayWS {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private eventHandlers = new Set<(event: WSEvent) => void>();
  private connectingPromise: Promise<void> | null = null;

  constructor(private url: string, private token: string) {}

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.on('open', async () => {
        try {
          await this.sendRequest('connect', { auth: { token: this.token } });
          this.connectingPromise = null;
          resolve();
        } catch (err) {
          this.connectingPromise = null;
          reject(err);
        }
      });

      ws.on('message', (data: RawData) => {
        try {
          const frame = JSON.parse(data.toString()) as WSFrame;
          if (frame.type === 'res') {
            const pending = this.pendingRequests.get(frame.id);
            if (pending) {
              this.pendingRequests.delete(frame.id);
              if (frame.ok) {
                pending.resolve(frame.payload);
              } else {
                pending.reject(new Error(frame.error?.message || 'Unknown error'));
              }
            }
          } else if (frame.type === 'event') {
            for (const handler of this.eventHandlers) {
              handler(frame);
            }
          }
        } catch (err) {
          console.error('[web-channel] Failed to parse WS frame:', err);
        }
      });

      ws.on('error', (err: Error) => {
        this.connectingPromise = null;
        reject(err);
      });

      ws.on('close', () => {
        this.ws = null;
        this.connectingPromise = null;
      });
    });

    return this.connectingPromise;
  }

  async sendRequest(method: string, params: any): Promise<any> {
    await this.ensureConnected();
    const id = String(++this.requestId);
    const req: WSRequest = { type: 'req', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(req));
    });
  }

  onEvent(handler: (event: WSEvent) => void) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private async ensureConnected() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
  }

  async chatSend(sessionKey: string, text: string, channel = 'web-channel') {
    return this.sendRequest('chat.send', { sessionKey, text, channel });
  }

  async chatHistory(sessionKey: string) {
    return this.sendRequest('chat.history', { sessionKey });
  }

  async listSessions() {
    return this.sendRequest('sessions.list', {});
  }
}

let instance: GatewayWS | null = null;

export async function getGatewayWS(url: string, token: string): Promise<GatewayWS> {
  if (!instance) {
    instance = new GatewayWS(url, token);
    await instance.connect();
  }
  return instance;
}
