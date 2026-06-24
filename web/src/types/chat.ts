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

export interface CreateSessionInput {
  name: string;
  sessionType: SessionType;
  externalAgent?: ExternalAgentBinding;
}

export interface SessionSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sessionType: SessionType;
  externalAgent?: ExternalAgentBinding;
}

export interface ToolResultItem {
  id: string;
  name?: string;
  status?: string;
  output: unknown;
  raw: unknown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  toolResults?: ToolResultItem[];
}

export interface RuntimeEventItem {
  id: string;
  kind: 'status' | 'tool_result' | 'error';
  label: string;
  timestamp: number;
  payload: unknown;
}
