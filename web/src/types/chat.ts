export interface SessionSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
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
