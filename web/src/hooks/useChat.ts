import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { apiClient } from '@/api/client';

export function useChat() {
  const { currentSessionId, addMessage, updateLastMessage, setIsLoading } = useChatStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!currentSessionId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(apiClient.getSSEUrl(currentSessionId));
    eventSourceRef.current = es;

    let assistantContent = '';

    es.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      assistantContent += data.content;
      updateLastMessage(assistantContent);
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
  }, [currentSessionId]);

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
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  return { sendMessage };
}
