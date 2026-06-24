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
