import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';

const KEY = 'lvtk:demoMode';

/**
 * Demo mode: when ON, popups reappear at every visit, sidebar stays open,
 * roulette auto-opens, and a small DEMO badge is shown.
 * Source of truth: design_settings.demoMode (admin-controlled), but a
 * localStorage override `lvtk:demoMode=1` lets devs toggle locally.
 */
export function useDemoMode(): boolean {
  const { designSettings } = useApp();
  const [local, setLocal] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const onStorage = () => {
      try { setLocal(localStorage.getItem(KEY) === '1'); } catch { /* noop */ }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('lvtk:demo-mode-changed', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('lvtk:demo-mode-changed', onStorage);
    };
  }, []);

  return Boolean((designSettings as any)?.demoMode) || local;
}

export function setLocalDemoMode(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event('lvtk:demo-mode-changed'));
  } catch { /* noop */ }
}
