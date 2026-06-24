import { useMemo, useState } from 'react';
import { Bot, Cable, FolderOpen, MessageSquare, Plus, RefreshCcw, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import type { SessionSummary } from '@/types/chat';

function formatRelativeDate(timestamp: number) {
  const diff = Date.now() - timestamp;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return '今天';
  if (diff < day * 2) return '昨天';
  if (diff < day * 7) return '本周';
  return '更早';
}

interface SessionListProps {
  onOpenCreateDialog: () => void;
  onRefreshSessions: () => void;
}

export function SessionList({ onOpenCreateDialog, onRefreshSessions }: SessionListProps) {
  const [query, setQuery] = useState('');
  const { sessions, currentSessionId, setCurrentSessionId, hasToken } = useChatStore();

  const filteredSessions = useMemo(() => sessions.filter((session) => (
    session.name.toLowerCase().includes(query.toLowerCase()) ||
    session.id.toLowerCase().includes(query.toLowerCase())
  )), [query, sessions]);

  const groupedSessions = useMemo(() => filteredSessions.reduce<Record<string, SessionSummary[]>>((groups, session) => {
    const key = formatRelativeDate(session.updatedAt);
    groups[key] = groups[key] || [];
    groups[key].push(session);
    return groups;
  }, {}), [filteredSessions]);

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-black/6 bg-[#f7f6f3]">
      <div className="border-b border-black/6 px-5 py-5">
        <button
          onClick={onOpenCreateDialog}
          className="flex w-full items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-800 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:border-black/12 hover:bg-neutral-50"
        >
          <Plus size={16} />
          <span>新对话</span>
        </button>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <Search size={16} className="text-neutral-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索会话"
            className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      <div className="border-b border-black/6 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          <div className="flex items-center gap-2">
            <Sparkles size={14} />
            Workspace
          </div>
          <button
            onClick={onRefreshSessions}
            className="rounded-full border border-black/8 bg-white p-2 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700"
            title="刷新会话"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
        <div className="rounded-2xl bg-white px-4 py-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 text-sm font-medium text-neutral-800">
            <FolderOpen size={16} className="text-neutral-500" />
            <span>OpenClaw Web Channel</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            当前展示真实的 Web 会话、历史记录和流式消息。
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck size={14} className={hasToken ? 'text-emerald-600' : 'text-neutral-400'} />
            <span>{hasToken ? '已启用访问令牌' : '未启用访问令牌'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          会话
        </div>

        {Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
          <div key={groupName} className="mb-5">
            <div className="mb-2 px-2 text-xs font-medium text-neutral-400">{groupName}</div>
            <div className="space-y-1">
              {groupSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    currentSessionId === session.id
                      ? 'bg-white text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.05)]'
                      : 'text-neutral-600 hover:bg-white/80'
                  }`}
                >
                  <MessageSquare size={16} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-medium">{session.name}</div>
                      <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        session.sessionType === 'external_agent'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {session.sessionType === 'external_agent' ? <Cable size={10} /> : <Bot size={10} />}
                        <span>{session.sessionType === 'external_agent' ? (session.externalAgent?.provider || 'external') : 'native'}</span>
                      </div>
                    </div>
                    <div className="mt-1 truncate text-xs text-neutral-400">
                      {session.sessionType === 'external_agent'
                        ? session.externalAgent?.threadId || session.id
                        : session.id}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-neutral-400">
            没有匹配的会话。
          </div>
        )}
      </div>

      <div className="border-t border-black/6 px-5 py-4 text-xs text-neutral-400">
        共 {sessions.length} 个真实会话
      </div>
    </aside>
  );
}
