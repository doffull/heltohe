import { useRef } from 'react';
import { pxToPos, type FabPos } from './fabPosition';
import { showValidationHUD, hideValidationHUD } from './dragValidationHUD';

const DRAG_THRESHOLD = 4;

function readSnap(): boolean {
  try { const v = localStorage.getItem('admin_drag_snap'); return v === null ? true : v === '1'; } catch { return true; }
}
function readLocked(): boolean {
  try { return localStorage.getItem('admin_drag_locked') === '1'; } catch { return false; }
}
function snapVal(v: number, grid = 8) { return Math.round(v / grid) * grid; }
function magnet(v: number, t1: number, t2: number, t3: number, range = 10) {
  if (Math.abs(v - t1) < range) return t1;
  if (Math.abs(v - t2) < range) return t2;
  if (Math.abs(v - t3) < range) return t3;
  return v;
}

/**
 * Generic admin drag helper — fluid GPU drag using translate3d while moving,
 * commits left/top/corner only on pointerup. Pointer-capture for stable input.
 *
 * Optimizations vs naive impl:
 *  - Single rAF coalesces multiple pointermove events (one paint per frame)
 *  - Viewport + element dims cached on pointerdown (no layout reads during move)
 *  - Coordinate HUD updated inside the same rAF, never per-event
 *  - Validation HUD (✓/✕) is DOM-based: zero React re-renders
 *  - touch-action: none set on the dragged element to suppress browser scroll/zoom
 *  - Passive listener with preventDefault only when actually dragging
 */
export function useAdminDrag(opts: {
  enabled: boolean;
  onCommit: (pos: FabPos) => void;
  currentPos?: FabPos | null;
  autoCommit?: boolean;
  validationLabel?: string;
}) {
  const { enabled, onCommit, currentPos = null, autoCommit = false, validationLabel = 'Valider la position ?' } = opts;
  const blockClickRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled || readLocked()) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    // iOS: ignore secondary touches (multi-touch / pinch) — only first pointer drives drag
    if (activePointerRef.current !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    activePointerRef.current = e.pointerId;

    // Hide any lingering validation HUD from a previous drag
    hideValidationHUD();

    const target = e.currentTarget as HTMLElement;
    // iOS Safari: prevent text selection callout, tap highlight, and native gestures
    const prevWebkitCallout = (target.style as any).webkitTouchCallout;
    const prevWebkitUserSelect = (target.style as any).webkitUserSelect;
    const prevTapHighlight = (target.style as any).webkitTapHighlightColor;
    (target.style as any).webkitTouchCallout = 'none';
    (target.style as any).webkitUserSelect = 'none';
    (target.style as any).webkitTapHighlightColor = 'transparent';
    // Set touch-action immediately so iOS doesn't start a scroll before threshold
    const prevTouchActionEarly = target.style.touchAction;
    target.style.touchAction = 'none';
    try { target.setPointerCapture(e.pointerId); } catch { /* noop */ }
    // iOS Safari: block pinch/double-tap zoom gestures during drag
    const blockGesture = (ev: Event) => ev.preventDefault();
    document.addEventListener('gesturestart', blockGesture as any, { passive: false });
    document.addEventListener('gesturechange', blockGesture as any, { passive: false });
    document.addEventListener('gestureend', blockGesture as any, { passive: false });

    // Cache everything once — no layout reads during the drag loop.
    const rect = target.getBoundingClientRect();
    const w = rect.width || target.offsetWidth || 56;
    const h = rect.height || target.offsetHeight || 56;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const startX = e.clientX;
    const startY = e.clientY;
    const baseLeft = rect.left;
    const baseTop = rect.top;
    const useSnap = readSnap();
    const safeTop = 56;
    const maxLeft = vw - w;
    const maxTop = vh - h - 0;
    const cxA = vw / 2 - w / 2;
    const cxB = 0;
    const cxC = vw - w;
    const cyA = vh / 2 - h / 2;
    const cyB = safeTop;
    const cyC = vh - h;

    let dragging = false;
    let dx = 0, dy = 0;
    let raf = 0;
    let hud: HTMLDivElement | null = null;
    const prevTouchAction = prevTouchActionEarly;
    const prevUserSelect = document.body.style.userSelect;
    const prevBodyOverscroll = (document.body.style as any).overscrollBehavior;
    const prevHtmlOverscroll = (document.documentElement.style as any).overscrollBehavior;
    // iOS: stop rubber-band scroll while dragging
    (document.body.style as any).overscrollBehavior = 'none';
    (document.documentElement.style as any).overscrollBehavior = 'none';

    const ensureHud = () => {
      if (hud) return;
      hud = document.createElement('div');
      hud.style.cssText = 'position:fixed;z-index:9999;background:hsl(var(--foreground));color:hsl(var(--background));font:bold 10px/1 ui-monospace,monospace;padding:4px 6px;letter-spacing:.05em;pointer-events:none;border-radius:2px;will-change:transform;';
      document.body.appendChild(hud);
    };

    const paint = () => {
      raf = 0;
      // Single write — transform on element + transform on HUD. No reads.
      target.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      if (hud) {
        const hx = startX + dx + 14;
        const hy = startY + dy + 14;
        hud.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
        hud.textContent = `${Math.round(baseLeft + dx)} × ${Math.round(baseTop + dy)}`;
      }
    };

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== activePointerRef.current) return;
      const rdx = ev.clientX - startX;
      const rdy = ev.clientY - startY;
      if (!dragging) {
        if (Math.hypot(rdx, rdy) < DRAG_THRESHOLD) return;
        dragging = true;
        target.style.willChange = 'transform';
        target.style.transition = 'none';
        target.style.touchAction = 'none';
        (target.style as any).webkitTransform = 'translateZ(0)';
        document.body.style.userSelect = 'none';
        ensureHud();
      }
      ev.preventDefault();
      let nl = baseLeft + rdx;
      let nt = baseTop + rdy;
      // Clamp (cached vw/vh)
      if (nl < 0) nl = 0; else if (nl > maxLeft) nl = maxLeft;
      if (nt < safeTop) nt = safeTop; else if (nt > maxTop) nt = maxTop;
      if (useSnap) {
        nl = snapVal(nl);
        nt = snapVal(nt);
        nl = magnet(nl, cxA, cxB, cxC);
        nt = magnet(nt, cyA, cyB, cyC);
      }
      dx = nl - baseLeft;
      dy = nt - baseTop;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('gesturestart', blockGesture as any);
      document.removeEventListener('gesturechange', blockGesture as any);
      document.removeEventListener('gestureend', blockGesture as any);
      try { target.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      target.style.willChange = '';
      target.style.transition = '';
      target.style.transform = '';
      (target.style as any).webkitTransform = '';
      target.style.touchAction = prevTouchAction;
      (target.style as any).webkitTouchCallout = prevWebkitCallout;
      (target.style as any).webkitUserSelect = prevWebkitUserSelect;
      (target.style as any).webkitTapHighlightColor = prevTapHighlight;
      document.body.style.userSelect = prevUserSelect;
      (document.body.style as any).overscrollBehavior = prevBodyOverscroll;
      (document.documentElement.style as any).overscrollBehavior = prevHtmlOverscroll;
      activePointerRef.current = null;
      if (hud) { hud.remove(); hud = null; }
    };

    const up = (ev?: PointerEvent) => {
      if (ev && ev.pointerId !== activePointerRef.current) return;
      if (!dragging) { cleanup(); return; }
      blockClickRef.current = true;
      setTimeout(() => { blockClickRef.current = false; }, 80);
      const finalLeft = baseLeft + dx;
      const finalTop = baseTop + dy;
      cleanup();
      const pos = pxToPos(finalLeft, finalTop, vw, vh, w, h);
      if (autoCommit) {
        onCommit(pos);
      } else {
        // DOM-based validation HUD: zero React re-renders
        showValidationHUD({
          label: validationLabel,
          onConfirm: () => onCommit(pos),
          onCancel: () => { if (currentPos) onCommit(currentPos); },
        });
      }
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { dragging = false; hideValidationHUD(); cleanup(); }
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up as any);
    window.addEventListener('pointercancel', up as any);
    window.addEventListener('keydown', onKey);
  };

  return { onPointerDown, blockClickRef };
}
