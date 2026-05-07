import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useChatStore } from '@/store/chatStore';

export function SessionList() {
  const [sessions, setSessions] = useState<any[]>([]);
  const { currentSessionId, setCurrentSessionId } = useChatStore();

  const loadSessions = async () => {
    try {
      const data = await apiClient.fetch('/plugins/web-channel/api/sessions');
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const createSession = async () => {
    try {
      const newSession = await apiClient.fetch('/plugins/web-channel/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Chat' }),
      });
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.fetch(`/plugins/web-channel/api/sessions/${id}`, { method: 'DELETE' });
      setSessions(sessions.filter((s) => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  return (
    <div className="w-64 flex flex-col h-full bg-gray-100 dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800">
      <div className="p-4">
        <button
          onClick={createSession}
          className="flex items-center gap-2 w-full p-3 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-900 transition-colors"
        >
          <Plus size={18} />
          <span>New chat</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => setCurrentSessionId(session.id)}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
              currentSessionId === session.id
                ? 'bg-gray-200 dark:bg-zinc-900'
                : 'hover:bg-gray-200 dark:hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <MessageSquare size={16} />
              <span className="truncate text-sm">{session.name}</span>
            </div>
            {currentSessionId === session.id && (
              <Trash2
                size={14}
                className="text-gray-400 hover:text-red-500"
                onClick={(e) => deleteSession(session.id, e)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
