import { useChatStore } from '@/store/chatStore';
import { useChat } from '@/hooks/useChat';
import { SessionList } from '@/components/SessionList';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Activity, Clock3, Sparkles } from 'lucide-react';
import { useRef, useEffect } from 'react';
import type { ChatMessage as ChatMessageItem, SessionSummary } from '@/types/chat';

function formatSessionTitle(sessionId: string | null, sessions: SessionSummary[]) {
  if (!sessionId) return 'OpenClaw';
  return sessions.find((session) => session.id === sessionId)?.name || sessionId;
}

function App() {
  const { messages, isLoading, currentSessionId, sessions, runtimeEvents, streamStatus } = useChatStore();
  const { sendMessage, createSession } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f2ec] text-neutral-900">
      <SessionList onCreateSession={createSession} />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b border-black/6 px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Workspace</div>
            <h1 className="mt-1 text-2xl font-semibold">{formatSessionTitle(currentSessionId, sessions)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-neutral-600">
              <Activity size={14} />
              <span>{streamStatus === 'streaming' ? '运行中' : streamStatus === 'error' ? '异常' : '空闲'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-neutral-600">
              <Clock3 size={14} />
              <span>{runtimeEvents.length} 个运行事件</span>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 && !currentSessionId && (
            <div className="flex h-full items-center justify-center px-10">
              <div className="w-full max-w-4xl rounded-[40px] border border-black/6 bg-white/80 px-10 py-16 text-center shadow-[0_20px_60px_rgba(15,23,42,0.04)] backdrop-blur">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3efe5] text-neutral-700">
                  <Sparkles size={24} />
                </div>
                <h2 className="mt-6 text-4xl font-semibold tracking-tight">开始一个真正可用的 OpenClaw 工作区</h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-500">
                  左侧展示真实会话，中央保持聚焦式对话，底部输入区会逐步承载更多运行上下文和控制能力。
                </p>
              </div>
            </div>
          )}
          {messages.length === 0 && currentSessionId && (
            <div className="flex h-full items-center justify-center px-10">
              <div className="w-full max-w-4xl rounded-[40px] border border-black/6 bg-white/80 px-10 py-16 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
                <h2 className="text-center text-4xl font-semibold tracking-tight">我们应该在这个会话里构建什么？</h2>
                <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-neutral-500">
                  当前会话已经连接到真实的 OpenClaw 运行时。你可以直接发送任务，或者从左侧切换到已有会话继续。
                </p>
              </div>
            </div>
          )}
          {messages.map((msg: ChatMessageItem) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              toolResults={msg.toolResults}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="mx-auto max-w-4xl px-10 py-4 text-sm italic text-neutral-400">OpenClaw 正在生成回复...</div>
          )}
        </div>

        {currentSessionId && (
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            sessionId={currentSessionId}
            streamStatus={streamStatus}
            messageCount={messages.length}
          />
        )}
      </main>
    </div>
  );
}

export default App;
