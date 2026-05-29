export const SPIN_BEZIER: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
export const SPIN_BEZIER_CSS = `cubic-bezier(${SPIN_BEZIER.join(', ')})`;

export interface SliceGeom {
  path: string;
  labelX: number;
  labelY: number;
  iconX: number;
  iconY: number;
  rotDeg: number;
}

export interface WheelGeometry {
  r: number;
  innerR: number;
  slices: SliceGeom[];
  labelFont: number;
  iconFont: number;
  maxChord: number;
}

export function computeGeometry(size: number, count: number): WheelGeometry {
  const n = Math.max(1, count);
  const slice = 360 / n;
  const r = size / 2;
  const innerR = r * 0.18;

  const labelFont =
    n <= 4 ? size * 0.058 : n <= 6 ? size * 0.048 : n <= 8 ? size * 0.04 : size * 0.034;
  const iconFont = labelFont * 1.4;
  const labelRadius = r * 0.62;
  const iconRadius = r * 0.82;
  const maxChord = 2 * labelRadius * Math.sin((slice * Math.PI) / 360) * 0.85;

  const slices: SliceGeom[] = Array.from({ length: n }, (_, i) => {
    const a0 = (i * slice - 90) * (Math.PI / 180);
    const a1 = ((i + 1) * slice - 90) * (Math.PI / 180);
    const x0 = r + (r - 4) * Math.cos(a0);
    const y0 = r + (r - 4) * Math.sin(a0);
    const x1 = r + (r - 4) * Math.cos(a1);
    const y1 = r + (r - 4) * Math.sin(a1);
    const large = slice > 180 ? 1 : 0;
    const path = `M ${r} ${r} L ${x0} ${y0} A ${r - 4} ${r - 4} 0 ${large} 1 ${x1} ${y1} Z`;
    const am = ((i + 0.5) * slice - 90) * (Math.PI / 180);
    return {
      path,
      labelX: r + labelRadius * Math.cos(am),
      labelY: r + labelRadius * Math.sin(am),
      iconX: r + iconRadius * Math.cos(am),
      iconY: r + iconRadius * Math.sin(am),
      rotDeg: i * slice + slice / 2,
    };
  });

  return { r, innerR, slices, labelFont, iconFont, maxChord };
}

/**
 * Sample a cubic-bezier easing curve at t (0..1).
 * Matches CSS `cubic-bezier(p1x, p1y, p2x, p2y)`.
 */
export function sampleCubicBezier(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
): (t: number) => number {
  // Newton-Raphson then bisection fallback to invert x(t)=t param.
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = sampleDx(t);
      if (Math.abs(d) < 1e-6) break;
      const xt = sampleX(t) - x;
      t -= xt / d;
    }
    let lo = 0;
    let hi = 1;
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < 12; i++) {
      const xt = sampleX(t);
      if (Math.abs(xt - x) < 1e-4) break;
      if (xt < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

export const spinEase = sampleCubicBezier(...SPIN_BEZIER);
