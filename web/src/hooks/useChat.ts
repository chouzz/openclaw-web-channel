import { useEffect, useEffectEvent, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { apiClient } from '@/api/client';
import { normalizeToolResult } from '@/lib/toolResult';
import type { ChatMessage, CreateSessionInput, SessionSummary, ToolResultItem } from '@/types/chat';

export function useChat() {
  const {
    currentSessionId,
    setSessions,
    sessions,
    upsertSession,
    renameSession,
    setHasToken,
    setMessages,
    addMessage,
    updateAssistantMessage,
    addToolResultToMessage,
    setIsLoading,
    setStreamStatus,
    resetRuntimeEvents,
    addRuntimeEvent,
  } = useChatStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);

  const mapHistoryMessage = (message: any): ChatMessage => ({
    id: message.id || crypto.randomUUID(),
    role: message.role,
    content: message.text || (Array.isArray(message.content) ? message.content.map((item: any) => item.text || '').join('') : message.content) || '',
    createdAt: Date.now(),
    toolResults: Array.isArray(message.toolResults)
      ? message.toolResults.map((result: any) => normalizeToolResult(result))
      : undefined,
  });

  const mapSession = (session: any): SessionSummary => ({
    id: session.id || session.sessionKey,
    name: session.name || session.id || session.sessionKey,
    createdAt: Number(session.createdAt || Date.now()),
    updatedAt: Number(session.updatedAt || session.createdAt || Date.now()),
    sessionType: session.sessionType === 'external_agent' ? 'external_agent' : 'native',
    externalAgent: session.externalAgent,
  });

  const loadSessions = useEffectEvent(async () => {
    try {
      const data = await apiClient.fetch('/plugins/web-channel/api/sessions');
      const nextSessions = Array.isArray(data) ? data.map(mapSession).sort((a, b) => b.updatedAt - a.updatedAt) : [];
      setSessions(nextSessions);
      if (!currentSessionId && nextSessions.length > 0) {
        useChatStore.getState().setCurrentSessionId(nextSessions[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  });

  const loadConfig = useEffectEvent(async () => {
    try {
      const config = await apiClient.fetch('/plugins/web-channel/api/config');
      setHasToken(Boolean(config?.hasToken));
    } catch (err) {
      console.error('Failed to load config', err);
    }
  });

  const loadHistory = useEffectEvent(async (sessionId: string) => {
    try {
      const history = await apiClient.fetch(`/plugins/web-channel/api/history?sessionId=${sessionId}`);
      if (Array.isArray(history)) {
        setMessages(history.map(mapHistoryMessage));
      }
    } catch (err) {
      console.error('Failed to load history', err);
    }
  });

  const ensureAssistantMessage = useEffectEvent(() => {
    if (activeAssistantIdRef.current) return activeAssistantIdRef.current;

    const assistantId = crypto.randomUUID();
    activeAssistantIdRef.current = assistantId;
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    });
    addRuntimeEvent({
      id: crypto.randomUUID(),
      kind: 'status',
      label: 'Assistant started',
      timestamp: Date.now(),
      payload: { phase: 'assistant_message_start' },
    });
    return assistantId;
  });

  const attachEventSource = useEffectEvent((sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(apiClient.getSSEUrl(sessionId));
    eventSourceRef.current = es;

    es.addEventListener('agent', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const assistantId = ensureAssistantMessage();

        if (payload.text) {
          updateAssistantMessage(assistantId, payload.text);
          setStreamStatus('streaming');
        }

        if (payload.status) {
          addRuntimeEvent({
            id: crypto.randomUUID(),
            kind: 'status',
            label: String(payload.status),
            timestamp: Date.now(),
            payload,
          });
        } else if (!payload.text) {
          addRuntimeEvent({
            id: crypto.randomUUID(),
            kind: 'status',
            label: 'Agent event',
            timestamp: Date.now(),
            payload,
          });
        }
      } catch {
        // Ignore malformed SSE data
      }
    });

    es.addEventListener('tool_result', (event) => {
      try {
        const payload = JSON.parse(event.data) as ToolResultItem;
        const normalizedResult = normalizeToolResult(payload);
        const assistantId = ensureAssistantMessage();
        addToolResultToMessage(assistantId, normalizedResult);
        addRuntimeEvent({
          id: crypto.randomUUID(),
          kind: 'tool_result',
          label: normalizedResult.name || 'Tool result',
          timestamp: Date.now(),
          payload: normalizedResult.raw,
        });
      } catch {
        // Ignore malformed tool result data
      }
    });

    es.addEventListener('error', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        addRuntimeEvent({
          id: crypto.randomUUID(),
          kind: 'error',
          label: payload.message || 'Stream error',
          timestamp: Date.now(),
          payload,
        });
        setStreamStatus('error');
      } catch {
        // Ignore malformed error data
      }
    });

    es.addEventListener('done', () => {
      addRuntimeEvent({
        id: crypto.randomUUID(),
        kind: 'status',
        label: 'Run completed',
        timestamp: Date.now(),
        payload: { status: 'done' },
      });
      setIsLoading(false);
      setStreamStatus('idle');
      activeAssistantIdRef.current = null;
    });

    es.onerror = (err) => {
      console.error('SSE Error:', err);
      es.close();
      setIsLoading(false);
      setStreamStatus('error');
      activeAssistantIdRef.current = null;
    };
  });

  useEffect(() => {
    loadConfig();
    loadSessions();
  }, [loadConfig, loadSessions]);

  useEffect(() => {
    if (!currentSessionId) return;

    activeAssistantIdRef.current = null;
    resetRuntimeEvents();
    loadHistory(currentSessionId);
    attachEventSource(currentSessionId);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [attachEventSource, currentSessionId, loadHistory, resetRuntimeEvents]);

  const sendMessage = async (content: string) => {
    if (!currentSessionId) return;

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    activeAssistantIdRef.current = assistantMessageId;

    addMessage({ id: userMessageId, role: 'user', content, createdAt: Date.now() });
    addMessage({ id: assistantMessageId, role: 'assistant', content: '', createdAt: Date.now() });
    setIsLoading(true);
    setStreamStatus('streaming');
    resetRuntimeEvents();
    addRuntimeEvent({
      id: crypto.randomUUID(),
      kind: 'status',
      label: 'Message submitted',
      timestamp: Date.now(),
      payload: { sessionId: currentSessionId, prompt: content },
    });

    const nextSession = sessions.find((session) => session.id === currentSessionId) || {
      id: currentSessionId,
      name: content.slice(0, 32) || currentSessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sessionType: 'native' as const,
    };
    upsertSession({ ...nextSession, updatedAt: Date.now() });

    try {
      await apiClient.fetch('/plugins/web-channel/api/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: currentSessionId, message: content }),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send message';
      updateAssistantMessage(assistantMessageId, `[Error] ${msg}`);
      addRuntimeEvent({
        id: crypto.randomUUID(),
        kind: 'error',
        label: msg,
        timestamp: Date.now(),
        payload: { message: msg },
      });
      setIsLoading(false);
      setStreamStatus('error');
      activeAssistantIdRef.current = null;
    }
  };

  const createSession = async (input: CreateSessionInput) => {
    const payload = {
      name: input.name.trim() || '新对话',
      sessionType: input.sessionType,
      externalAgent: input.externalAgent,
    };

    const createdSession = await apiClient.fetch('/plugins/web-channel/api/session/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const normalizedSession = mapSession(createdSession);
    upsertSession(normalizedSession);
    useChatStore.getState().setCurrentSessionId(normalizedSession.id);
  };

  const updateSessionName = async (sessionId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    renameSession(sessionId, trimmedName);

    try {
      const updatedSession = await apiClient.fetch('/plugins/web-channel/api/session', {
        method: 'PATCH',
        body: JSON.stringify({ sessionId, name: trimmedName }),
      });
      if (updatedSession?.id) {
        upsertSession(mapSession(updatedSession));
      }
    } catch (error) {
      console.error('Failed to rename session', error);
      await loadSessions();
    }
  };

  return { sendMessage, createSession, loadSessions, updateSessionName };
}
