export type Corner = 'tl' | 'tr' | 'bl' | 'br' | 'cc' | 'bc' | 'tc';
export type FabPos = { corner: Corner; x: number; y: number };

export function pxToPos(left: number, top: number, w: number, h: number, btn = 56): FabPos {
  const cx = left + btn / 2;
  const cy = top + btn / 2;
  // Center bands: within 12% of viewport center horizontally → use *c corners
  const horizCenter = Math.abs(cx - w / 2) < w * 0.08;
  const vertCenter = Math.abs(cy - h / 2) < h * 0.08;
  if (horizCenter && vertCenter) {
    return { corner: 'cc', x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) };
  }
  if (horizCenter) {
    const bottom = cy > h / 2;
    return { corner: bottom ? 'bc' : 'tc', x: Math.round(cx - w / 2), y: Math.max(0, Math.round(bottom ? h - top - btn : top)) };
  }
  const right = cx > w / 2;
  const bottom = cy > h / 2;
  const corner: Corner = `${bottom ? 'b' : 't'}${right ? 'r' : 'l'}` as Corner;
  const x = Math.max(0, Math.round(right ? w - left - btn : left));
  const y = Math.max(0, Math.round(bottom ? h - top - btn : top));
  return { corner, x, y };
}

export function posToPx(p: FabPos, w: number, h: number, btn = 56): { left: number; top: number } {
  if (p.corner === 'cc') return { left: w / 2 - btn / 2 + (p.x || 0), top: h / 2 - btn / 2 + (p.y || 0) };
  if (p.corner === 'bc') return { left: w / 2 - btn / 2 + (p.x || 0), top: h - p.y - btn };
  if (p.corner === 'tc') return { left: w / 2 - btn / 2 + (p.x || 0), top: p.y };
  const left = p.corner.endsWith('r') ? w - p.x - btn : p.x;
  const top = p.corner.startsWith('b') ? h - p.y - btn : p.y;
  return { left, top };
}

export function cornerStyle(corner: string, x: number, y: number): React.CSSProperties {
  const s: React.CSSProperties = { position: 'fixed', zIndex: 50 };
  if (corner === 'cc') {
    s.left = '50%'; s.top = '50%'; s.transform = `translate(calc(-50% + ${x || 0}px), calc(-50% + ${y || 0}px))`;
  } else if (corner === 'bc') {
    s.left = '50%'; s.bottom = y; s.transform = `translateX(calc(-50% + ${x || 0}px))`;
  } else if (corner === 'tc') {
    s.left = '50%'; s.top = y; s.transform = `translateX(calc(-50% + ${x || 0}px))`;
  } else if (corner === 'br') { s.right = x; s.bottom = y; }
  else if (corner === 'bl') { s.left = x; s.bottom = y; }
  else if (corner === 'tr') { s.right = x; s.top = y; }
  else if (corner === 'tl') { s.left = x; s.top = y; }
  return s;
}
