export interface WebSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  text?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
}

export interface ToolResult {
  id: string;
  output: any;
}

export interface SSEEvent {
  type: 'message' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'agent';
  data: any;
}

// Gateway WS Protocol Types
export type WSFrame = WSRequest | WSResponse | WSEvent;

export interface WSRequest {
  type: 'req';
  id: string;
  method: string;
  params: any;
}

export interface WSResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: any;
  error?: any;
}

export interface WSEvent {
  type: 'event';
  event: string;
  payload: any;
  seq?: number;
  stateVersion?: number;
}
