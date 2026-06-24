import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import type { ToolResultItem } from '@/types/chat';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolResults?: ToolResultItem[];
}

export function ChatMessage({ role, content, toolResults }: ChatMessageProps) {
  return (
    <div
      className={clsx(
        'mx-auto w-full max-w-4xl px-6 py-5 md:px-10',
        role === 'user' ? '' : ''
      )}
    >
      <div className={clsx(
        'w-full rounded-[28px] border px-5 py-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]',
        role === 'user'
          ? 'border-black/8 bg-[#f3efe5]'
          : 'border-black/8 bg-white'
      )}>
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
          {role === 'user' ? 'You' : role === 'assistant' ? 'OpenClaw' : 'System'}
        </div>
        <div className="prose max-w-none prose-p:leading-7 prose-pre:rounded-2xl prose-pre:bg-neutral-950 prose-pre:text-neutral-50">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ' '}</ReactMarkdown>
        </div>
        {toolResults && toolResults.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-black/6 pt-4">
            {toolResults.map((result, index) => (
              <div key={result.id || index} className="rounded-2xl bg-[#f7f6f3] p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
                  Tool Result
                </div>
                <pre className="overflow-x-auto text-xs leading-6 text-neutral-600">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
