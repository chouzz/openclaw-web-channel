import { ChevronDown, Hammer, Info } from 'lucide-react';
import { useState } from 'react';

import { summarizeToolResult } from '@/lib/toolResult';
import type { ToolResultItem } from '@/types/chat';

interface ToolResultCardProps {
  result: ToolResultItem;
  compact?: boolean;
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('error') || normalized.includes('fail')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (normalized.includes('running') || normalized.includes('progress')) {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

export function ToolResultCard({ result, compact = false }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = summarizeToolResult(result);

  return (
    <div className={`rounded-2xl border border-black/8 bg-[#f7f6f3] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
            <Hammer size={13} />
            Tool Result
          </div>
          <div className="mt-2 truncate text-sm font-semibold text-neutral-800">{summary.title}</div>
        </div>
        <div className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusTone(summary.status)}`}>
          {summary.status}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm leading-6 text-neutral-600">
        {summary.previewLines.map((line, index) => (
          <div key={`${result.id}-${index}`} className="rounded-xl bg-white/70 px-3 py-2">
            {line}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Info size={12} />
          <span>{result.name ? '已解析工具名' : '未提供工具名'}</span>
        </div>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1 rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          <span>{expanded ? '隐藏原始数据' : '查看原始数据'}</span>
          <ChevronDown size={12} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {expanded && (
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-neutral-950 p-3 text-xs leading-6 text-neutral-100">
          {JSON.stringify(result.raw, null, 2)}
        </pre>
      )}
    </div>
  );
}
