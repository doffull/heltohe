import { useEffect, useRef, useState } from 'react';
import type { RouletteSegment } from '@/hooks/useRoulette';

interface Props {
  segments: RouletteSegment[];
  rotation: number;
  spinning: boolean;
  onTick?: () => void;
  durationMs?: number;
}

const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export function RouletteWheel({ segments, rotation, spinning, onTick, durationMs = 5500 }: Props) {
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

  // Tick sound when slices pass under the pointer.
  const lastIdxRef = useRef<number>(-1);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);
  const toRef = useRef<number>(0);

  useEffect(() => {
    if (!spinning || !onTick || segments.length === 0) return;
    fromRef.current = fromRef.current; // keep previous
    const from = lastRotationRef.current;
    const to = rotation;
    fromRef.current = from;
    toRef.current = to;
    startRef.current = performance.now();
    lastIdxRef.current = -1;

    // ease function matching CSS approximate cubic-bezier(0.22,0.61,0.36,1)
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const loop = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const current = from + (to - from) * ease(t);
      const slice = 360 / segments.length;
      // pointer is at top; slice index under pointer:
      const norm = ((360 - (current % 360)) + 360) % 360;
      const idx = Math.floor(norm / slice);
      if (idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        onTick();
      }
      if (t < 1) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        lastRotationRef.current = to;
      }
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastRotationRef.current = rotation;
    };
  }, [spinning, rotation, segments.length, onTick, durationMs]);

  const lastRotationRef = useRef<number>(rotation);

  const n = Math.max(1, segments.length);
  const slice = 360 / n;
  const r = size / 2;
  const innerR = r * 0.18;

  // Auto font sizing based on slice count
  const labelFont = n <= 4 ? size * 0.058 : n <= 6 ? size * 0.048 : n <= 8 ? size * 0.04 : size * 0.034;
  const iconFont = labelFont * 1.4;
  const labelRadius = r * 0.62;
  const iconRadius = r * 0.82;
  // Max chord (segment width) at labelRadius:
  const maxChord = 2 * labelRadius * Math.sin((slice * Math.PI) / 360) * 0.85;

  const pointerSize = Math.max(14, size * 0.06);

  return (
    <div ref={containerRef} className="relative w-full aspect-square mx-auto" style={{ maxWidth: 380 }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${durationMs}ms ${EASE}`,
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
          }}
        >
          {/* Outer rim */}
          <circle cx={r} cy={r} r={r - 1} fill="hsl(var(--background))" stroke="hsl(var(--foreground) / 0.2)" strokeWidth="1" />

          {segments.map((seg, i) => {
            const a0 = (i * slice - 90) * (Math.PI / 180);
            const a1 = ((i + 1) * slice - 90) * (Math.PI / 180);
            const x0 = r + (r - 4) * Math.cos(a0);
            const y0 = r + (r - 4) * Math.sin(a0);
            const x1 = r + (r - 4) * Math.cos(a1);
            const y1 = r + (r - 4) * Math.sin(a1);
            const large = slice > 180 ? 1 : 0;
            const path = `M ${r} ${r} L ${x0} ${y0} A ${r - 4} ${r - 4} 0 ${large} 1 ${x1} ${y1} Z`;
            const am = ((i + 0.5) * slice - 90) * (Math.PI / 180);
            const lx = r + labelRadius * Math.cos(am);
            const ly = r + labelRadius * Math.sin(am);
            const ix = r + iconRadius * Math.cos(am);
            const iy = r + iconRadius * Math.sin(am);
            // Text rotation: radial, readable from outside
            const rotDeg = i * slice + slice / 2;
            const label = (seg.label || '').slice(0, 12);

            return (
              <g key={seg.id}>
                <path d={path} fill={seg.color} stroke="hsl(var(--background))" strokeWidth="2" />
                <g transform={`translate(${ix}, ${iy}) rotate(${rotDeg})`}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={seg.text_color}
                    fontSize={iconFont}
                  >
                    {seg.icon}
                  </text>
                </g>
                <g transform={`translate(${lx}, ${ly}) rotate(${rotDeg})`}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={seg.text_color}
                    fontSize={labelFont}
                    fontWeight="700"
                    fontFamily="ui-monospace, 'Helvetica Neue', monospace"
                    textLength={Math.min(maxChord, label.length * labelFont * 0.62)}
                    lengthAdjust="spacingAndGlyphs"
                    style={{ letterSpacing: '0.05em' }}
                  >
                    {label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Hub */}
          <circle cx={r} cy={r} r={innerR} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <circle cx={r} cy={r} r={innerR * 0.4} fill="hsl(var(--foreground))" />
        </svg>
      </div>

      {/* Pointer — outside rotation transform */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{
          top: -pointerSize * 0.3,
          width: 0,
          height: 0,
          borderLeft: `${pointerSize * 0.55}px solid transparent`,
          borderRight: `${pointerSize * 0.55}px solid transparent`,
          borderTop: `${pointerSize}px solid hsl(var(--foreground))`,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      />
    </div>
  );
}
