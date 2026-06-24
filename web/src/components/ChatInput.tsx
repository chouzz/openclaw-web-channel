import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Lock, MessageSquareText, Plus, Radio } from 'lucide-react';
import type { SessionType } from '@/types/chat';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  sessionId: string;
  streamStatus: 'idle' | 'streaming' | 'error';
  messageCount: number;
  sessionType: SessionType;
  providerLabel?: string;
}

export function ChatInput({ onSend, disabled, sessionId, streamStatus, messageCount, sessionType, providerLabel }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="sticky bottom-0 left-0 w-full bg-gradient-to-t from-[#f4f2ec] via-[#f4f2ec] to-transparent px-6 pb-6 pt-10">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-4xl overflow-hidden rounded-[30px] border border-black/8 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sessionType === 'external_agent'
              ? `当前会话已绑定到 ${providerLabel || 'external agent'} 线程，等待后续接入真实传输层`
              : '给 OpenClaw 一个明确的任务，或者继续当前会话'}
            disabled={disabled || sessionType === 'external_agent'}
            className="max-h-72 w-full resize-none bg-transparent px-6 pb-6 pt-6 text-[15px] leading-7 text-neutral-800 outline-none placeholder:text-neutral-300"
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled || sessionType === 'external_agent'}
            className="absolute bottom-5 right-5 rounded-2xl bg-neutral-900 p-3 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-black/6 bg-[#fbfaf7] px-5 py-4 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <Plus size={15} />
            <span>扩展</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={15} />
            <span>{sessionType === 'external_agent' ? '外部线程绑定' : '受保护会话'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Radio size={15} />
            <span>{streamStatus === 'streaming' ? '运行中' : streamStatus === 'error' ? '异常' : '待命'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquareText size={15} />
            <span>{messageCount} 条消息</span>
          </div>
          <div className="ml-auto truncate text-xs text-neutral-400">
            {sessionId}
          </div>
        </div>
      </form>
    </div>
  );
}
