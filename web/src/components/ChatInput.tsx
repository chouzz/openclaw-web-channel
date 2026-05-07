import { useState, useRef, useEffect } from 'react';
import { Send, ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
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
    <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto relative flex items-center bg-white dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm overflow-hidden"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message OpenClaw..."
          className="w-full p-4 pr-12 resize-none bg-transparent outline-none max-h-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="absolute right-3 p-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ArrowUp size={20} />
        </button>
      </form>
    </div>
  );
}
