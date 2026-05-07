export type Corner = 'tl' | 'tr' | 'bl' | 'br' | 'cc' | 'bc' | 'tc';
export type FabPos = { corner: Corner; x: number; y: number };

export function pxToPos(left: number, top: number, vw: number, vh: number, elW = 56, elH = elW): FabPos {
  const cx = left + elW / 2;
  const cy = top + elH / 2;
  const horizCenter = Math.abs(cx - vw / 2) < vw * 0.08;
  const vertCenter = Math.abs(cy - vh / 2) < vh * 0.08;
  if (horizCenter && vertCenter) {
    return { corner: 'cc', x: Math.round(cx - vw / 2), y: Math.round(cy - vh / 2) };
  }
  if (horizCenter) {
    const bottom = cy > vh / 2;
    return { corner: bottom ? 'bc' : 'tc', x: Math.round(cx - vw / 2), y: Math.max(0, Math.round(bottom ? vh - top - elH : top)) };
  }
  const right = cx > vw / 2;
  const bottom = cy > vh / 2;
  const corner: Corner = `${bottom ? 'b' : 't'}${right ? 'r' : 'l'}` as Corner;
  const x = Math.max(0, Math.round(right ? vw - left - elW : left));
  const y = Math.max(0, Math.round(bottom ? vh - top - elH : top));
  return { corner, x, y };
}

export function posToPx(p: FabPos, vw: number, vh: number, elW = 56, elH = elW): { left: number; top: number } {
  if (p.corner === 'cc') return { left: vw / 2 - elW / 2 + (p.x || 0), top: vh / 2 - elH / 2 + (p.y || 0) };
  if (p.corner === 'bc') return { left: vw / 2 - elW / 2 + (p.x || 0), top: vh - p.y - elH };
  if (p.corner === 'tc') return { left: vw / 2 - elW / 2 + (p.x || 0), top: p.y };
  const left = p.corner.endsWith('r') ? vw - p.x - elW : p.x;
  const top = p.corner.startsWith('b') ? vh - p.y - elH : p.y;
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
