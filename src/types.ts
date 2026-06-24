export interface WebSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sessionType?: SessionType;
  externalAgent?: ExternalAgentBinding;
}

export type SessionType = 'native' | 'external_agent';

export type ExternalAgentProvider = 'acpx' | 'codex' | 'claude-code' | 'qwen-code' | 'custom';

export interface ExternalAgentBinding {
  provider: ExternalAgentProvider;
  threadId: string;
  workspace?: string;
  instanceLabel?: string;
  launchMode?: 'managed' | 'attach';
  transportStatus?: 'configured' | 'connected' | 'disconnected';
  endpoint?: string;
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
