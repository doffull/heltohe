import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { DesignSettings } from '@/types';

const HISTORY_LIMIT = 50;

/**
 * Undo / redo stack that observes `designSettings`.
 * - Pushes a snapshot whenever the settings change AND the change wasn't
 *   triggered by `undo()` / `redo()` (ignoreNextRef gate).
 * - Exposes `canUndo`, `canRedo`, `undo`, `redo`, `past`, `future`.
 *
 * Active only while the visual editor panel is open (caller decides).
 */
export function useDesignHistory(active: boolean) {
  const { designSettings, setDesignSettings } = useApp();
  const [past, setPast] = useState<DesignSettings[]>([]);
  const [future, setFuture] = useState<DesignSettings[]>([]);
  const ignoreNextRef = useRef(false);
  const lastRef = useRef<DesignSettings>(designSettings);

  // Reset history when the panel toggles off.
  useEffect(() => {
    if (!active) {
      setPast([]);
      setFuture([]);
      lastRef.current = designSettings;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Record snapshots
  useEffect(() => {
    if (!active) return;
    if (ignoreNextRef.current) {
      ignoreNextRef.current = false;
      lastRef.current = designSettings;
      return;
    }
    if (designSettings === lastRef.current) return;
    setPast((p) => {
      const next = [...p, lastRef.current];
      return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
    });
    setFuture([]);
    lastRef.current = designSettings;
  }, [designSettings, active]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [designSettings, ...f]);
      ignoreNextRef.current = true;
      setDesignSettings(prev);
      return p.slice(0, -1);
    });
  }, [designSettings, setDesignSettings]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, designSettings]);
      ignoreNextRef.current = true;
      setDesignSettings(next);
      return f.slice(1);
    });
  }, [designSettings, setDesignSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, undo, redo]);

  return {
    past,
    future,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
  };
}
