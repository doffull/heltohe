import { useEffect, useMemo, useRef, useState } from 'react';
import type { RouletteSegment } from '@/hooks/useRoulette';
import { computeGeometry } from './roulette/wheelGeometry';
import { useSpinAnimation } from './roulette/useSpinAnimation';
import { WheelSvg } from './roulette/WheelSvg';
import { WheelPointer } from './roulette/WheelPointer';

interface Props {
  segments: RouletteSegment[];
  rotation: number;
  /** Optional. Kept for API back-compat; phase is now driven internally. */
  spinning?: boolean;
  onTick?: () => void;
  onSettled?: () => void;
  durationMs?: number;
}

export function RouletteWheel({
  segments,
  rotation,
  onTick,
  onSettled,
  durationMs = 5500,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(280);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setSize(Math.max(200, Math.min(380, Math.floor(w))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geometry = useMemo(
    () => computeGeometry(size, segments.length),
    [size, segments.length],
  );

  useSpinAnimation({
    targetRotation: rotation,
    durationMs,
    segmentCount: segments.length,
    onTick,
    onSettled,
  });

  return (
    // La roue est carrée : la borner uniquement en largeur la laissait occuper
    // toute la hauteur d'un petit écran et pousser le bouton « Tourner » hors
    // du cadre. Le plafond en `dvh` la fait rétrécir sur les écrans courts.
    <div
      ref={containerRef}
      className="relative w-full aspect-square mx-auto"
      style={{ maxWidth: 'min(380px, 46dvh)' }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <WheelSvg
          segments={segments}
          geometry={geometry}
          size={size}
          rotation={rotation}
          durationMs={durationMs}
        />
      </div>
      <WheelPointer size={size} />
    </div>
  );
}
