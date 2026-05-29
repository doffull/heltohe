import { useEffect, useRef, useState } from 'react';
import { spinEase } from './wheelGeometry';

export type SpinPhase = 'idle' | 'spinning' | 'settling';

interface Options {
  targetRotation: number;
  durationMs: number;
  segmentCount: number;
  onTick?: () => void;
  onSettled?: () => void;
}

/**
 * Drives the spin lifecycle: tracks the current rotation in JS (using the
 * same easing as the CSS transition) so that tick callbacks stay in sync
 * with the visual rotation. Visual transform is handled by CSS on the SVG.
 */
export function useSpinAnimation({
  targetRotation,
  durationMs,
  segmentCount,
  onTick,
  onSettled,
}: Options) {
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const fromRef = useRef(targetRotation);
  const toRef = useRef(targetRotation);
  const rafRef = useRef<number | null>(null);
  const lastIdxRef = useRef(-1);
  const settledTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetRotation === toRef.current) return;
    fromRef.current = toRef.current;
    toRef.current = targetRotation;
    lastIdxRef.current = -1;
    setPhase('spinning');

    const from = fromRef.current;
    const to = toRef.current;
    const start = performance.now();
    const sliceDeg = 360 / Math.max(1, segmentCount);

    const loop = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const current = from + (to - from) * spinEase(t);
      const norm = ((360 - (current % 360)) + 360) % 360;
      const idx = Math.floor(norm / sliceDeg);
      if (idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        onTick?.();
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
        setPhase('settling');
        settledTimerRef.current = window.setTimeout(() => {
          setPhase('idle');
          onSettled?.();
        }, 50);
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (settledTimerRef.current) window.clearTimeout(settledTimerRef.current);
      rafRef.current = null;
      settledTimerRef.current = null;
    };
    // onTick/onSettled deliberately excluded — we only want to start an
    // animation when the target rotation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRotation, durationMs, segmentCount]);

  return { phase };
}
