import { Bot, Cable, Plus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import type { CreateSessionInput, ExternalAgentProvider, SessionType } from '@/types/chat';

interface NewSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateSession: (input: CreateSessionInput) => Promise<void>;
}

const providerOptions: Array<{ value: ExternalAgentProvider; label: string }> = [
  { value: 'acpx', label: 'ACPX' },
  { value: 'codex', label: 'Codex' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'qwen-code', label: 'Qwen Code' },
  { value: 'custom', label: 'Custom' },
];

export function NewSessionDialog({ open, onClose, onCreateSession }: NewSessionDialogProps) {
  const [sessionType, setSessionType] = useState<SessionType>('native');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<ExternalAgentProvider>('acpx');
  const [threadId, setThreadId] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [instanceLabel, setInstanceLabel] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [launchMode, setLaunchMode] = useState<'managed' | 'attach'>('attach');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const reset = () => {
    setSessionType('native');
    setName('');
    setProvider('acpx');
    setThreadId('');
    setWorkspace('');
    setInstanceLabel('');
    setEndpoint('');
    setLaunchMode('attach');
    setError('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请填写会话名称');
      return;
    }

    if (sessionType === 'external_agent' && !threadId.trim()) {
      setError('外部线程必须填写 thread id');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateSession({
        name,
        sessionType,
        externalAgent: sessionType === 'external_agent'
          ? {
              provider,
              threadId: threadId.trim(),
              workspace: workspace.trim() || undefined,
              instanceLabel: instanceLabel.trim() || undefined,
              endpoint: endpoint.trim() || undefined,
              launchMode,
              transportStatus: 'configured',
            }
          : undefined,
      });
      handleClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : '创建会话失败';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 px-6 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-[32px] border border-black/8 bg-white p-6 shadow-[0_25px_80px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">New Session</div>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-900">创建一个新的 Agent Thread 会话</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Native 会话直接运行在 OpenClaw 中；External Thread 会话用于绑定 ACPX、Codex、Claude Code 等外部 Agent 线程。
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-black/8 bg-white p-2 text-neutral-500 transition hover:bg-neutral-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setSessionType('native')}
            className={`rounded-3xl border p-4 text-left transition ${sessionType === 'native' ? 'border-neutral-900 bg-neutral-950 text-white' : 'border-black/8 bg-[#f7f6f3] text-neutral-800'}`}
          >
            <div className="flex items-center gap-3">
              <Bot size={18} />
              <div className="text-sm font-semibold">OpenClaw Native</div>
            </div>
            <p className={`mt-3 text-sm leading-6 ${sessionType === 'native' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              使用现有的 OpenClaw runtime 对话和执行能力。
            </p>
          </button>
          <button
            type="button"
            onClick={() => setSessionType('external_agent')}
            className={`rounded-3xl border p-4 text-left transition ${sessionType === 'external_agent' ? 'border-neutral-900 bg-neutral-950 text-white' : 'border-black/8 bg-[#f7f6f3] text-neutral-800'}`}
          >
            <div className="flex items-center gap-3">
              <Cable size={18} />
              <div className="text-sm font-semibold">External Agent Thread</div>
            </div>
            <p className={`mt-3 text-sm leading-6 ${sessionType === 'external_agent' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              绑定一个外部 Provider 的线程上下文，为后续真正接入传输层做准备。
            </p>
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-sm font-medium text-neutral-700">会话名称</div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={sessionType === 'native' ? '例如：调试登录问题' : '例如：Codex / api-refactor'}
              className="w-full rounded-2xl border border-black/8 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
            />
          </label>
          {sessionType === 'external_agent' ? (
            <label className="block">
              <div className="mb-2 text-sm font-medium text-neutral-700">Provider</div>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as ExternalAgentProvider)}
                className="w-full rounded-2xl border border-black/8 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
              >
                {providerOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/8 bg-[#fbfaf7] px-4 py-3 text-sm leading-6 text-neutral-500">
              Native 会话会直接继续使用现有的 OpenClaw runtime。
            </div>
          )}
        </div>

        {sessionType === 'external_agent' && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-neutral-700">Thread ID</div>
              <input
                value={threadId}
                onChange={(event) => setThreadId(event.target.value)}
                placeholder="例如：thread_123 / conversation-abc"
                className="w-full rounded-2xl border border-black/8 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-neutral-700">Workspace</div>
              <input
                value={workspace}
                onChange={(event) => setWorkspace(event.target.value)}
                placeholder="/path/to/project"
                className="w-full rounded-2xl border border-black/8 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-neutral-700">Instance Label</div>
              <input
                value={instanceLabel}
                onChange={(event) => setInstanceLabel(event.target.value)}
                placeholder="例如：codex-main / claude-dev"
                className="w-full rounded-2xl border border-black/8 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-neutral-700">Endpoint / Command</div>
              <input
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                placeholder="可选：endpoint 或启动命令"
                className="w-full rounded-2xl border border-black/8 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-neutral-700">Launch Mode</div>
              <select
                value={launchMode}
                onChange={(event) => setLaunchMode(event.target.value as 'managed' | 'attach')}
                className="w-full rounded-2xl border border-black/8 bg-[#fbfaf7] px-4 py-3 text-sm outline-none"
              >
                <option value="attach">Attach existing thread</option>
                <option value="managed">Managed instance</option>
              </select>
            </label>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-900 disabled:opacity-40"
          >
            <Plus size={15} />
            <span>{isSubmitting ? '创建中...' : '创建会话'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
