import { useRef, useState } from 'react';
import { pxToPos, type FabPos } from './fabPosition';

const DRAG_THRESHOLD = 4;

export type PendingDrag = { prev: FabPos | null; next: FabPos } | null;

function readSnap(): boolean {
  try { const v = localStorage.getItem('admin_drag_snap'); return v === null ? true : v === '1'; } catch { return true; }
}
function readLocked(): boolean {
  try { return localStorage.getItem('admin_drag_locked') === '1'; } catch { return false; }
}
function snapVal(v: number, grid = 8) { return Math.round(v / grid) * grid; }
function magnet(v: number, targets: number[], range = 10) {
  for (const t of targets) if (Math.abs(v - t) < range) return t;
  return v;
}

/**
 * Generic admin drag helper — fluid GPU drag using translate3d while moving,
 * commits left/top/corner only on pointerup. Pointer-capture for stable input.
 */
export function useAdminDrag(opts: {
  enabled: boolean;
  onCommit: (pos: FabPos) => void;
  currentPos?: FabPos | null;
  autoCommit?: boolean;
}) {
  const { enabled, onCommit, currentPos = null, autoCommit = false } = opts;
  const blockClickRef = useRef(false);
  const [pending, setPending] = useState<PendingDrag>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled || readLocked()) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    const target = e.currentTarget as HTMLElement;
    try { target.setPointerCapture(e.pointerId); } catch { /* noop */ }
    const rect = target.getBoundingClientRect();
    const w = rect.width || target.offsetWidth || 56;
    const h = rect.height || target.offsetHeight || 56;
    const startX = e.clientX;
    const startY = e.clientY;
    const baseLeft = rect.left;
    const baseTop = rect.top;
    let dragging = false;
    const useSnap = readSnap();

    // Safe areas
    const safeTop = 56, safeRight = 0, safeBottom = 0, safeLeft = 0;
    let dx = 0, dy = 0;
    let raf = 0;
    let hud: HTMLDivElement | null = null;

    const ensureHud = () => {
      if (hud) return;
      hud = document.createElement('div');
      hud.style.cssText = 'position:fixed;z-index:9999;background:hsl(var(--foreground));color:hsl(var(--background));font:bold 10px/1 ui-monospace,monospace;padding:4px 6px;letter-spacing:.05em;pointer-events:none;border-radius:2px;';
      document.body.appendChild(hud);
    };
    const updateHud = (l: number, t: number) => {
      if (!hud) return;
      hud.style.left = `${startX + dx + 14}px`;
      hud.style.top = `${startY + dy + 14}px`;
      hud.textContent = `${Math.round(l)} × ${Math.round(t)}`;
    };

    const applyTransform = () => {
      raf = 0;
      target.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      updateHud(baseLeft + dx, baseTop + dy);
    };

    const move = (ev: PointerEvent) => {
      const rdx = ev.clientX - startX;
      const rdy = ev.clientY - startY;
      if (!dragging && Math.hypot(rdx, rdy) < DRAG_THRESHOLD) return;
      if (!dragging) {
        dragging = true;
        target.style.willChange = 'transform';
        target.style.transition = 'none';
        ensureHud();
      }
      ev.preventDefault();
      let nl = baseLeft + rdx;
      let nt = baseTop + rdy;
      // Clamp to viewport
      nl = Math.max(safeLeft, Math.min(window.innerWidth - w - safeRight, nl));
      nt = Math.max(safeTop, Math.min(window.innerHeight - h - safeBottom, nt));
      if (useSnap) {
        nl = snapVal(nl);
        nt = snapVal(nt);
        // Magnet to viewport center / edges
        const vw = window.innerWidth, vh = window.innerHeight;
        nl = magnet(nl + w / 2, [vw / 2, w / 2, vw - w / 2]) - w / 2;
        nt = magnet(nt + h / 2, [vh / 2, h / 2, vh - h / 2]) - h / 2;
      }
      dx = nl - baseLeft;
      dy = nt - baseTop;
      if (!raf) raf = requestAnimationFrame(applyTransform);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', onKey);
      try { target.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      if (raf) cancelAnimationFrame(raf);
      target.style.willChange = '';
      target.style.transition = '';
      target.style.transform = '';
      if (hud) { hud.remove(); hud = null; }
    };

    const up = () => {
      if (!dragging) { cleanup(); return; }
      blockClickRef.current = true;
      setTimeout(() => { blockClickRef.current = false; }, 80);
      const finalLeft = baseLeft + dx;
      const finalTop = baseTop + dy;
      cleanup();
      const pos = pxToPos(finalLeft, finalTop, window.innerWidth, window.innerHeight, w, h);
      if (autoCommit) {
        onCommit(pos);
      } else {
        setPending({ prev: currentPos, next: pos });
        onCommit(pos);
      }
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { dragging = false; cleanup(); }
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', onKey);
  };

  const confirmPending = () => setPending(null);
  const cancelPending = () => {
    if (pending) onCommit(pending.prev as FabPos);
    setPending(null);
  };

  return { onPointerDown, blockClickRef, pending, confirmPending, cancelPending };
}
