import { useRef } from 'react';
import { pxToPos, type FabPos } from './fabPosition';

const DRAG_THRESHOLD = 5;

/**
 * Generic admin drag helper.
 * - Measures the actual element size at pointerdown so corner snapping is accurate
 *   for both small round buttons and wide pills/blocks (Dock, Cluster, Roulette pill).
 * - Clamps the drop position inside the viewport (and respects header/sidebar safe areas).
 * - Cleans up only the inline styles it set (no cssText reset that would nuke other styles).
 */
export function useAdminDrag(opts: {
  enabled: boolean;
  onCommit: (pos: FabPos) => void;
}) {
  const { enabled, onCommit } = opts;
  const blockClickRef = useRef(false);

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
    const isLg = window.matchMedia('(min-width: 1024px)').matches;
    const safeLeft = isLg ? 0 : 0; // sidebar overlays at higher z; allow full width
    const safeTop = 56; // global header height
    const safeRight = 0;
    const safeBottom = 0;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragging = true;
      ev.preventDefault();
      const left = Math.max(safeLeft, Math.min(window.innerWidth - w - safeRight, rect.left + dx));
      const top = Math.max(safeTop, Math.min(window.innerHeight - h - safeBottom, rect.top + dy));
      target.style.position = 'fixed';
      target.style.left = `${left}px`;
      target.style.top = `${top}px`;
      target.style.right = 'auto';
      target.style.bottom = 'auto';
      target.style.transform = 'none';
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!dragging) return;
      blockClickRef.current = true;
      setTimeout(() => { blockClickRef.current = false; }, 80);
      const left = parseFloat(target.style.left || '0');
      const top = parseFloat(target.style.top || '0');
      const pos = pxToPos(left, top, window.innerWidth, window.innerHeight, w, h);
      onCommit(pos);
      // Clear only the props we set; re-render places via cornerStyle
      target.style.left = '';
      target.style.top = '';
      target.style.right = '';
      target.style.bottom = '';
      target.style.position = '';
      target.style.transform = '';
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return { onPointerDown, blockClickRef };
}
