import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Share, Plus, Download } from 'lucide-react';

const DISMISS_KEY = 'hmp_pwa_prompt_dismissed';

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isPreviewContext() {
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

/**
 * Bandeau discret invitant à installer le site sur l'écran d'accueil.
 * Android/Chrome : prompt natif. iOS/Safari : instructions Partager → Sur l'écran d'accueil.
 */
export function InstallAppBanner() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);

  const onAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  useEffect(() => {
    if (onAdmin) return;
    if (isStandalone() || isPreviewContext()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch { /* ignore */ }

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt as any);

    let t: ReturnType<typeof setTimeout> | null = null;
    if (isIos) t = setTimeout(() => setVisible(true), 6000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt as any);
      if (t) clearTimeout(t);
    };
  }, [onAdmin]);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const install = async () => {
    if (deferred) {
      try {
        deferred.prompt();
        const res = await deferred.userChoice;
        if (res?.outcome === 'accepted') dismiss();
        else setVisible(false);
      } catch {
        setIosHelp(true);
      }
      return;
    }
    setIosHelp(true);
  };

  if (!visible || onAdmin) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9997] border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
      role="dialog"
      aria-label="Installer l'application"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-3 top-3 p-1 text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 pr-8">
        <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 border border-border object-contain" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] leading-tight">
            Installer l'application
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            Accès direct depuis ton écran d'accueil, en plein écran.
          </p>
        </div>
      </div>

      {iosHelp ? (
        <ol className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
          <li className="flex items-center gap-2">
            <Share className="h-3.5 w-3.5 shrink-0" /> 1. Ouvre le menu « Partager »
          </li>
          <li className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 shrink-0" /> 2. Choisis « Sur l'écran d'accueil »
          </li>
        </ol>
      ) : (
        <button
          type="button"
          onClick={install}
          className="mt-3 flex w-full items-center justify-center gap-2 bg-foreground py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-background"
          style={{
            clipPath:
              'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Installer
        </button>
      )}
    </div>
  );
}

export default InstallAppBanner;
