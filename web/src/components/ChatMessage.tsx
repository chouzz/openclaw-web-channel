import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div
      className={clsx(
        'flex w-full py-6 px-4 md:px-12 gap-4',
        role === 'user' ? 'bg-white dark:bg-zinc-800' : 'bg-gray-50 dark:bg-zinc-900'
      )}
    >
      <div className="flex-1 max-w-3xl mx-auto prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
