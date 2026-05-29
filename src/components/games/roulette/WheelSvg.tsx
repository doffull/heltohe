import type { RouletteSegment } from '@/hooks/useRoulette';
import { SPIN_BEZIER_CSS, type WheelGeometry } from './wheelGeometry';

interface Props {
  segments: RouletteSegment[];
  geometry: WheelGeometry;
  size: number;
  rotation: number;
  durationMs: number;
}

export function WheelSvg({ segments, geometry, size, rotation, durationMs }: Props) {
  const { r, innerR, slices, labelFont, iconFont, maxChord } = geometry;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: `transform ${durationMs}ms ${SPIN_BEZIER_CSS}`,
        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
      }}
    >
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill="hsl(var(--background))"
        stroke="hsl(var(--foreground) / 0.2)"
        strokeWidth="1"
      />

      {segments.map((seg, i) => {
        const s = slices[i];
        if (!s) return null;
        const label = (seg.label || '').slice(0, 12);
        return (
          <g key={seg.id}>
            <path
              d={s.path}
              fill={seg.color}
              stroke="hsl(var(--background))"
              strokeWidth="2"
            />
            <g transform={`translate(${s.iconX}, ${s.iconY}) rotate(${s.rotDeg})`}>
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill={seg.text_color}
                fontSize={iconFont}
              >
                {seg.icon}
              </text>
            </g>
            <g transform={`translate(${s.labelX}, ${s.labelY}) rotate(${s.rotDeg})`}>
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

      <circle
        cx={r}
        cy={r}
        r={innerR}
        fill="hsl(var(--background))"
        stroke="hsl(var(--foreground))"
        strokeWidth="2"
      />
      <circle cx={r} cy={r} r={innerR * 0.4} fill="hsl(var(--foreground))" />
    </svg>
  );
}
