export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export type FabPos = { corner: Corner; x: number; y: number };

export function pxToPos(left: number, top: number, w: number, h: number, btn = 56): FabPos {
  const cx = left + btn / 2;
  const cy = top + btn / 2;
  const right = cx > w / 2;
  const bottom = cy > h / 2;
  const corner: Corner = `${bottom ? 'b' : 't'}${right ? 'r' : 'l'}` as Corner;
  const x = Math.max(0, Math.round(right ? w - left - btn : left));
  const y = Math.max(0, Math.round(bottom ? h - top - btn : top));
  return { corner, x, y };
}

export function posToPx(p: FabPos, w: number, h: number, btn = 56): { left: number; top: number } {
  const left = p.corner.endsWith('r') ? w - p.x - btn : p.x;
  const top = p.corner.startsWith('b') ? h - p.y - btn : p.y;
  return { left, top };
}

export function cornerStyle(corner: string, x: number, y: number): React.CSSProperties {
  const s: React.CSSProperties = { position: 'fixed', zIndex: 50 };
  if (corner === 'br') { s.right = x; s.bottom = y; }
  else if (corner === 'bl') { s.left = x; s.bottom = y; }
  else if (corner === 'tr') { s.right = x; s.top = y; }
  else if (corner === 'tl') { s.left = x; s.top = y; }
  return s;
}
