import { create } from 'zustand';

import type { ChatMessage, RuntimeEventItem, SessionSummary, ToolResultItem } from '@/types/chat';

interface ChatState {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  streamStatus: 'idle' | 'streaming' | 'error';
  runtimeEvents: RuntimeEventItem[];
  hasToken: boolean;
  setSessions: (sessions: SessionSummary[]) => void;
  upsertSession: (session: SessionSummary) => void;
  renameSession: (id: string, name: string) => void;
  setHasToken: (hasToken: boolean) => void;
  setCurrentSessionId: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  replaceMessage: (messageId: string, patch: Partial<ChatMessage>) => void;
  updateAssistantMessage: (messageId: string, content: string) => void;
  addToolResultToMessage: (messageId: string, result: ToolResultItem) => void;
  setIsLoading: (isLoading: boolean) => void;
  setStreamStatus: (status: ChatState['streamStatus']) => void;
  resetRuntimeEvents: () => void;
  addRuntimeEvent: (event: RuntimeEventItem) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,
  streamStatus: 'idle',
  runtimeEvents: [],
  hasToken: false,
  setSessions: (sessions) => set({ sessions: [...sessions].sort((a, b) => b.updatedAt - a.updatedAt) }),
  upsertSession: (session) => set((state) => {
    const existing = state.sessions.find((item) => item.id === session.id);
    if (!existing) {
      return { sessions: [session, ...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt) };
    }

    return {
      sessions: state.sessions
        .map((item) => (item.id === session.id ? { ...item, ...session } : item))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    };
  }),
  renameSession: (id, name) => set((state) => ({
    sessions: state.sessions.map((session) => (
      session.id === id ? { ...session, name, updatedAt: Date.now() } : session
    )),
  })),
  setHasToken: (hasToken) => set({ hasToken }),
  setCurrentSessionId: (id) => set({ currentSessionId: id, messages: [], runtimeEvents: [], streamStatus: 'idle' }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  replaceMessage: (messageId, patch) => set((state) => ({
    messages: state.messages.map((message) => (
      message.id === messageId ? { ...message, ...patch } : message
    )),
  })),
  updateAssistantMessage: (messageId, content) => set((state) => ({
    messages: state.messages.map((message) => (
      message.id === messageId ? { ...message, content } : message
    )),
  })),
  addToolResultToMessage: (messageId, result) => set((state) => ({
    messages: state.messages.map((message) => (
      message.id === messageId
        ? { ...message, toolResults: [...(message.toolResults || []), result] }
        : message
    )),
  })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setStreamStatus: (streamStatus) => set({ streamStatus }),
  resetRuntimeEvents: () => set({ runtimeEvents: [] }),
  addRuntimeEvent: (event) => set((state) => ({ runtimeEvents: [...state.runtimeEvents, event] })),
}));
