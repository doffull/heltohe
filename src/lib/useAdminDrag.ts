import { useRef, useState } from 'react';
import { pxToPos, type FabPos } from './fabPosition';

const DRAG_THRESHOLD = 5;

export type PendingDrag = { prev: FabPos | null; next: FabPos } | null;

/**
 * Generic admin drag helper.
 * - Measures the actual element size at pointerdown so corner snapping is accurate
 *   for both small round buttons and wide pills/blocks (Dock, Cluster, Roulette pill).
 * - Clamps the drop position inside the viewport (and respects header/sidebar safe areas).
 * - Uses requestAnimationFrame batching to avoid laggy drags.
 * - Returns a `pending` state so the caller can render a Validate / Cancel toolbar
 *   before the new position is committed.
 */
export function useAdminDrag(opts: {
  enabled: boolean;
  onCommit: (pos: FabPos) => void;
  /** Optional: current saved position, so cancel can restore it. */
  currentPos?: FabPos | null;
  /** Optional: skip the validation step and commit immediately. */
  autoCommit?: boolean;
}) {
  const { enabled, onCommit, currentPos = null, autoCommit = false } = opts;
  const blockClickRef = useRef(false);
  const [pending, setPending] = useState<PendingDrag>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const w = rect.width || target.offsetWidth || 56;
    const h = rect.height || target.offsetHeight || 56;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;

    // Safe areas — keep above sidebar/header
    const safeTop = 56;
    const safeRight = 0;
    const safeBottom = 0;
    const safeLeft = 0;

    let nextLeft = rect.left;
    let nextTop = rect.top;
    let raf = 0;
    const apply = () => {
      raf = 0;
      target.style.left = `${nextLeft}px`;
      target.style.top = `${nextTop}px`;
      target.style.right = 'auto';
      target.style.bottom = 'auto';
      target.style.position = 'fixed';
      target.style.transform = 'none';
    };

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!dragging) {
        dragging = true;
        target.style.willChange = 'left, top';
      }
      ev.preventDefault();
      nextLeft = Math.max(safeLeft, Math.min(window.innerWidth - w - safeRight, rect.left + dx));
      nextTop = Math.max(safeTop, Math.min(window.innerHeight - h - safeBottom, rect.top + dy));
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const cleanupStyles = () => {
      target.style.left = '';
      target.style.top = '';
      target.style.right = '';
      target.style.bottom = '';
      target.style.position = '';
      target.style.transform = '';
      target.style.willChange = '';
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', onKey);
      if (raf) cancelAnimationFrame(raf);
      if (!dragging) { cleanupStyles(); return; }
      blockClickRef.current = true;
      setTimeout(() => { blockClickRef.current = false; }, 80);
      const pos = pxToPos(nextLeft, nextTop, window.innerWidth, window.innerHeight, w, h);
      cleanupStyles();
      if (autoCommit) {
        onCommit(pos);
      } else {
        setPending({ prev: currentPos, next: pos });
        // Optimistic apply so user sees it; commit happens on validate
        onCommit(pos);
      }
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('keydown', onKey);
        if (raf) cancelAnimationFrame(raf);
        dragging = false;
        cleanupStyles();
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', onKey);
  };

  const confirmPending = () => setPending(null);
  const cancelPending = () => {
    if (pending) onCommit(pending.prev as FabPos);
    setPending(null);
  };

  return { onPointerDown, blockClickRef, pending, confirmPending, cancelPending };
}
