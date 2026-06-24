import type { ToolResultItem } from '@/types/chat';

interface ToolResultLike {
  id?: unknown;
  name?: unknown;
  toolName?: unknown;
  tool?: unknown;
  status?: unknown;
  state?: unknown;
  output?: unknown;
  result?: unknown;
  content?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeToolResult(value: unknown): ToolResultItem {
  const payload = isRecord(value) ? (value as ToolResultLike) : {};
  const name = [payload.name, payload.toolName, payload.tool]
    .find((item) => typeof item === 'string');
  const status = [payload.status, payload.state]
    .find((item) => typeof item === 'string');
  const output = payload.output ?? payload.result ?? payload.content ?? value;

  return {
    id: typeof payload.id === 'string' ? payload.id : crypto.randomUUID(),
    name: typeof name === 'string' ? name : undefined,
    status: typeof status === 'string' ? status : undefined,
    output,
    raw: value,
  };
}

function toPreviewLines(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 4);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (isRecord(item) && typeof item.text === 'string') return item.text;
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  if (isRecord(value)) {
    const preferredKeys = ['message', 'summary', 'text', 'content', 'stdout', 'stderr', 'result'];
    const lines = preferredKeys
      .map((key) => value[key])
      .flatMap((entry) => toPreviewLines(entry))
      .slice(0, 4);

    if (lines.length > 0) {
      return lines;
    }

    return Object.entries(value)
      .slice(0, 4)
      .map(([key, entry]) => `${key}: ${typeof entry === 'string' ? entry : JSON.stringify(entry)}`);
  }

  if (value === null || value === undefined) {
    return ['No output'];
  }

  return [String(value)];
}

export function summarizeToolResult(result: ToolResultItem) {
  const title = result.name || 'Tool result';
  const status = result.status || 'completed';
  const previewLines = toPreviewLines(result.output);

  return {
    title,
    status,
    previewLines,
  };
}
