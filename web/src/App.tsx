import { useChatStore } from '@/store/chatStore';
import { useChat } from '@/hooks/useChat';
import { SessionList } from '@/components/SessionList';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { useRef, useEffect } from 'react';

function App() {
  const { messages, isLoading, currentSessionId } = useChatStore();
  const { sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <SessionList />
      <main className="flex-1 flex flex-col relative bg-white dark:bg-zinc-800">
        <header className="h-14 border-b border-gray-100 dark:border-zinc-700 flex items-center px-4">
          <h1 className="font-semibold text-lg">OpenClaw</h1>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-48">
          {messages.length === 0 && !currentSessionId && (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select or create a chat to begin
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="p-8 text-gray-400 italic">Thinking...</div>
          )}
        </div>

        {currentSessionId && (
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        )}
      </main>
    </div>
  );
}

export default App;
