import { Activity, CircleAlert, Hammer, Radio } from 'lucide-react';

import { ToolResultCard } from '@/components/ToolResultCard';
import { normalizeToolResult } from '@/lib/toolResult';
import type { ChatMessage, RuntimeEventItem, SessionSummary } from '@/types/chat';

interface RunInspectorProps {
  messages: ChatMessage[];
  runtimeEvents: RuntimeEventItem[];
  streamStatus: 'idle' | 'streaming' | 'error';
  currentSession: SessionSummary | null;
  hasToken: boolean;
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function getEventTone(kind: RuntimeEventItem['kind']) {
  if (kind === 'tool_result') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (kind === 'error') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function getEventIcon(kind: RuntimeEventItem['kind']) {
  if (kind === 'tool_result') return Hammer;
  if (kind === 'error') return CircleAlert;
  return Activity;
}

export function RunInspector({ messages, runtimeEvents, streamStatus, currentSession, hasToken }: RunInspectorProps) {
  const toolResultCount = messages.reduce((count, message) => count + (message.toolResults?.length || 0), 0);
  const assistantMessages = messages.filter((message) => message.role === 'assistant').length;
  const latestEvents = [...runtimeEvents].reverse().slice(0, 8);
  const latestToolResults = messages
    .flatMap((message) => message.toolResults || [])
    .slice(-3)
    .reverse();

  return (
    <aside className="hidden w-[340px] shrink-0 border-l border-black/6 bg-[#f8f6f1] xl:flex xl:flex-col">
      <div className="border-b border-black/6 px-5 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Run Inspector</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              <Radio size={14} />
              状态
            </div>
            <div className="mt-3 text-sm font-medium text-neutral-800">
              {streamStatus === 'streaming' ? '运行中' : streamStatus === 'error' ? '异常' : '待命'}
            </div>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              <Hammer size={14} />
              工具结果
            </div>
            <div className="mt-3 text-sm font-medium text-neutral-800">{toolResultCount}</div>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">Assistant</div>
            <div className="mt-3 text-sm font-medium text-neutral-800">{assistantMessages} 条</div>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">事件</div>
            <div className="mt-3 text-sm font-medium text-neutral-800">{runtimeEvents.length} 个</div>
          </div>
        </div>
        {currentSession && (
          <div className="mt-4 rounded-2xl border border-black/8 bg-white px-4 py-4">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">会话元数据</div>
            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <div className="break-all">{currentSession.id}</div>
              <div>创建于 {formatDate(currentSession.createdAt)}</div>
              <div>更新于 {formatDate(currentSession.updatedAt)}</div>
              <div>{hasToken ? '当前接口需要授权' : '当前接口未启用授权'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">最新工具结果</div>
          {latestToolResults.length > 0 ? (
            <div className="space-y-3">
              {latestToolResults.map((result) => (
                <ToolResultCard key={result.id} result={result} compact />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm leading-6 text-neutral-400">
              当前还没有收到工具结果。
            </div>
          )}
        </div>

        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">实时事件</div>
        {latestEvents.length > 0 ? (
          <div className="space-y-3">
            {latestEvents.map((event) => {
              const Icon = getEventIcon(event.kind);
              return (
                <div key={event.id} className="rounded-2xl border border-black/8 bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${getEventTone(event.kind)}`}>
                      <Icon size={12} />
                      <span>{event.kind}</span>
                    </div>
                    <div className="text-xs text-neutral-400">{formatTime(event.timestamp)}</div>
                  </div>
                  <div className="mt-3 text-sm font-medium text-neutral-800">{event.label}</div>
                  {event.kind === 'tool_result' ? (
                    <div className="mt-3">
                      <ToolResultCard result={normalizeToolResult(event.payload)} compact />
                    </div>
                  ) : (
                    <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#f7f6f3] p-3 text-xs leading-6 text-neutral-500">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm leading-6 text-neutral-400">
            当前会话还没有运行事件。发送一条消息后，这里会显示真实的 Agent 状态和工具执行结果。
          </div>
        )}
      </div>
    </aside>
  );
}
