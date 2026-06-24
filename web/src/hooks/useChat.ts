import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { apiClient } from '@/api/client';

export function useChat() {
  const { currentSessionId, addMessage, updateLastMessage, setIsLoading } = useChatStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!currentSessionId) return;

    // Load history when session changes
    const loadHistory = async () => {
      try {
        const history = await apiClient.fetch(`/plugins/web-channel/api/history?sessionId=${currentSessionId}`);
        if (history && Array.isArray(history)) {
          const messages = history.map((m: any) => ({
            id: m.id || Math.random().toString(),
            role: m.role,
            content: m.text || (Array.isArray(m.content) ? m.content.map((c: any) => c.text || '').join('') : m.content) || ''
          }));
          useChatStore.getState().setMessages(messages);
        }
      } catch (err) {
        console.error('Failed to load history', err);
      }
    };

    loadHistory();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(apiClient.getSSEUrl(currentSessionId));
    eventSourceRef.current = es;

    let assistantContent = '';

    es.addEventListener('agent', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.text) {
          assistantContent += payload.text;
          updateLastMessage(assistantContent);
        } else if (payload.content) {
          // Handle full content replacement if needed
          const textContent = Array.isArray(payload.content)
            ? payload.content.map((c: any) => c.text || '').join('')
            : (typeof payload.content === 'string' ? payload.content : '');

          if (textContent) {
            assistantContent = textContent;
            updateLastMessage(assistantContent);
          }
        }
      } catch {
        // Ignore malformed SSE data
      }
    });

    es.addEventListener('error', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (payload.message) {
          const errorMsg = `[Error] ${payload.message}`;
          if (assistantContent) {
            assistantContent += '\n\n' + errorMsg;
            updateLastMessage(assistantContent);
          } else {
            addMessage({ id: Date.now().toString(), role: 'assistant', content: errorMsg });
          }
        }
      } catch {
        // Ignore malformed error data
      }
    });

    es.addEventListener('done', () => {
      setIsLoading(false);
      assistantContent = '';
    });

    es.onerror = (err) => {
      console.error('SSE Error:', err);
      es.close();
      setIsLoading(false);
    };

    return () => {
      es.close();
    };
  }, [currentSessionId, setIsLoading, updateLastMessage]);

  const sendMessage = async (content: string) => {
    if (!currentSessionId) return;

    addMessage({ id: Date.now().toString(), role: 'user', content });
    addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: '' });
    setIsLoading(true);

    try {
      await apiClient.fetch('/plugins/web-channel/api/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: currentSessionId, message: content }),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send message';
      addMessage({ id: Date.now().toString(), role: 'assistant', content: `[Error] ${msg}` });
      setIsLoading(false);
    }
  };

  return { sendMessage };
}
