import { useEffect, useState } from 'react';
import { useSpinRoulette, type SpinResult } from './useRoulette';

const LS_LAST = 'roulette_last_spin';
const LS_RESULT = 'roulette_last_result';

export function useCooldown(hours: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const last = Number((typeof window !== 'undefined' && localStorage.getItem(LS_LAST)) || 0);
  const next = last + hours * 3600_000;
  const remaining = Math.max(0, next - now);
  return { canSpin: remaining === 0, remaining };
}

export function fmtCooldown(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function persistResult(data: SpinResult) {
  try {
    localStorage.setItem(LS_LAST, String(Date.now()));
    localStorage.setItem(LS_RESULT, JSON.stringify(data));
  } catch {}
}

export function loadStoredResult(): SpinResult | null {
  try {
    const raw = localStorage.getItem(LS_RESULT);
    if (!raw) return null;
    return JSON.parse(raw) as SpinResult;
  } catch { return null; }
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export { useSpinRoulette };
