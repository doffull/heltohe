import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppOptional } from '@/context/AppContext';
import type { DesignSettings } from '@/types';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface SaveLogEntry {
  ts: number;
  ok: boolean;
  bytes: number;
  error?: string;
}

const LS_BACKUP_KEY = 'design_settings_backup';
const LS_LOG_KEY = 'design_settings_save_log';
const MAX_LOG = 10;

function readLog(): SaveLogEntry[] {
  try {
    const raw = localStorage.getItem(LS_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_LOG) : [];
  } catch {
    return [];
  }
}

function writeLog(entry: SaveLogEntry) {
  try {
    const cur = readLog();
    const next = [entry, ...cur].slice(0, MAX_LOG);
    localStorage.setItem(LS_LOG_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

function readBackup(): { ts: number; payload: DesignSettings } | null {
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useDesignAutosave() {
  const app = useAppOptional();
  const designSettings = app?.designSettings;
  const flushDesignSettings = app?.flushDesignSettings;
  const setDesignSettings = app?.setDesignSettings;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [history, setHistory] = useState<SaveLogEntry[]>(() => readLog());
  const [hasLocalBackup, setHasLocalBackup] = useState<boolean>(() => !!readBackup());

  const lastSerializedRef = useRef<string>('');
  const backupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // Track dirty state + backup to localStorage on each change.
  useEffect(() => {
    const serialized = JSON.stringify(designSettings);
    if (!lastSerializedRef.current) {
      lastSerializedRef.current = serialized;
      return;
    }
    if (serialized === lastSerializedRef.current) return;
    lastSerializedRef.current = serialized;
    setStatus(s => (s === 'saving' ? s : 'dirty'));

    if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    backupTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_BACKUP_KEY, JSON.stringify({ ts: Date.now(), payload: designSettings }));
        setHasLocalBackup(true);
      } catch {}
    }, 300);
  }, [designSettings]);

  // Listen for save events emitted by AppContext.
  useEffect(() => {
    const onSaved = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { ts: number; ok: boolean; error?: string };
      if (detail.ok) {
        setStatus('saved');
        setLastSavedAt(detail.ts);
        setLastError(null);
        retryCountRef.current = 0;
        const bytes = new Blob([JSON.stringify(designSettings)]).size;
        setHistory(writeLog({ ts: detail.ts, ok: true, bytes }));
        // Clear the "unsynced backup" flag once cloud confirms.
        try { localStorage.removeItem(LS_BACKUP_KEY); } catch {}
        setHasLocalBackup(false);
        setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2500);
      } else {
        setStatus('error');
        setLastError(detail.error || 'Erreur');
        setHistory(writeLog({ ts: detail.ts, ok: false, bytes: 0, error: detail.error }));
        // Exponential-ish backoff up to 3 tries.
        if (retryCountRef.current < 3) {
          const delay = [2000, 5000, 15000][retryCountRef.current] || 15000;
          retryCountRef.current += 1;
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => { saveNow().catch(() => {}); }, delay);
        }
      }
    };
    window.addEventListener('design-settings:saved', onSaved as EventListener);
    return () => window.removeEventListener('design-settings:saved', onSaved as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designSettings]);

  const saveNow = useCallback(async () => {
    if (!flushDesignSettings) return;
    setStatus('saving');
    try {
      await flushDesignSettings();
    } catch {
      /* status handled via event */
    }
  }, [flushDesignSettings]);

  // Auto-retry on network recovery.
  useEffect(() => {
    const onOnline = () => { if (status === 'error' || status === 'dirty') saveNow().catch(() => {}); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [status, saveNow]);

  // Save on tab hide / before unload to guarantee no lost edit.
  useEffect(() => {
    const flushIfDirty = () => {
      if (status === 'dirty') { void saveNow(); }
    };
    const onVis = () => { if (document.visibilityState === 'hidden') flushIfDirty(); };
    window.addEventListener('beforeunload', flushIfDirty);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('beforeunload', flushIfDirty);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [status, saveNow]);

  const restoreBackup = useCallback(() => {
    const b = readBackup();
    if (!b) return false;
    setDesignSettings(b.payload);
    return true;
  }, [setDesignSettings]);

  const discardBackup = useCallback(() => {
    try { localStorage.removeItem(LS_BACKUP_KEY); } catch {}
    setHasLocalBackup(false);
  }, []);

  return {
    status,
    lastSavedAt,
    lastError,
    history,
    hasLocalBackup,
    saveNow,
    restoreBackup,
    discardBackup,
  };
}
