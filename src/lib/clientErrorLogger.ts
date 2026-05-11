import { supabase } from '@/integrations/supabase/client';

type ConsoleEntry = {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  ts: string;
  args: string[];
};

const RING_SIZE = 25;
const ring: ConsoleEntry[] = [];
const seen = new Set<string>();
let installed = false;

function safeStringify(v: unknown): string {
  try {
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    if (typeof v === 'string') return v;
    return JSON.stringify(v, (_k, val) =>
      typeof val === 'bigint' ? String(val) : val
    )?.slice(0, 500) ?? String(v);
  } catch {
    return String(v);
  }
}

function push(level: ConsoleEntry['level'], args: unknown[]) {
  ring.push({
    level,
    ts: new Date().toISOString(),
    args: args.map(safeStringify),
  });
  if (ring.length > RING_SIZE) ring.shift();
}

export function installConsoleRingBuffer() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  (['log', 'warn', 'error', 'info', 'debug'] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try { push(level, args); } catch { /* noop */ }
      original(...args);
    };
  });

  // Capture global errors and unhandled rejections too
  window.addEventListener('error', (e) => {
    void logClientError({
      source: 'window.error',
      error: e.error ?? new Error(e.message),
      extra: { filename: e.filename, lineno: e.lineno, colno: e.colno },
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = (e as PromiseRejectionEvent).reason;
    void logClientError({
      source: 'unhandledrejection',
      error: reason instanceof Error ? reason : new Error(safeStringify(reason)),
    });
  });
}

export interface LogClientErrorInput {
  source: string;
  label?: string;
  error: Error | unknown;
  componentStack?: string;
  extra?: Record<string, unknown>;
}

export async function logClientError(input: LogClientErrorInput): Promise<void> {
  if (typeof window === 'undefined') return;
  const err =
    input.error instanceof Error
      ? input.error
      : new Error(safeStringify(input.error));

  const dedupeKey = `${input.source}::${err.message}::${(err.stack || '').slice(0, 200)}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  const payload = {
    source: input.source,
    label: input.label ?? null,
    message: err.message?.slice(0, 2000) ?? null,
    stack: err.stack?.slice(0, 8000) ?? null,
    component_stack: input.componentStack?.slice(0, 8000) ?? null,
    url: window.location.href,
    user_agent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixel_ratio: window.devicePixelRatio ?? 1,
    console_tail: ring.slice(-RING_SIZE),
    extra: input.extra ?? null,
  };

  try {
    const { error } = await (supabase as any)
      .from('client_error_logs')
      .insert(payload);
    if (error) {
      // Fallback only — never re-log to the same table to avoid loops
      // eslint-disable-next-line no-console
      console.warn('[clientErrorLogger] insert failed:', error.message);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[clientErrorLogger] network failure:', e);
  }
}
