import { useCallback, useEffect, useState } from 'react';

export const PWA_DISMISS_KEY = 'hmp_pwa_prompt_dismissed';

let deferredPrompt: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('hmp:install-available'));
  });
}

export function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

export function isPreviewContext() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return (
    window.self !== window.top ||
    h.startsWith('id-preview--') ||
    h.startsWith('preview--') ||
    h === 'localhost' ||
    h.endsWith('.lovableproject.com') ||
    h.endsWith('.lovableproject-dev.com')
  );
}

export function isMobileUA() {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isIosUA() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Logique d'installation PWA partagée (bannière mobile, footer, pop-ups).
 * Retourne l'état d'installabilité et une fonction d'installation.
 */
export function useInstallApp() {
  const [canPrompt, setCanPrompt] = useState(!!deferredPrompt);
  const [installed, setInstalled] = useState(isStandaloneApp());

  useEffect(() => {
    const onAvailable = () => setCanPrompt(true);
    const onInstalled = () => {
      setInstalled(true);
      setCanPrompt(false);
    };
    window.addEventListener('hmp:install-available', onAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('hmp:install-available', onAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  /** Retourne true si le prompt natif a été accepté, false s'il faut afficher les instructions. */
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      const res = await deferredPrompt.userChoice;
      deferredPrompt = null;
      setCanPrompt(false);
      return res?.outcome === 'accepted';
    } catch {
      return false;
    }
  }, []);

  return {
    canPrompt,
    installed,
    install,
    isIos: isIosUA(),
    isMobile: isMobileUA(),
    isPreview: isPreviewContext(),
  };
}
