import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import PopupRenderer from './PopupRenderer';
import { useActivePopupCampaigns, trackPopupEvent, getPopupSessionId } from '@/hooks/usePopupCampaigns';
import { subscribeToNewsletter } from '@/hooks/useNewsletterPopups';
import { useInstallApp } from '@/hooks/useInstallApp';
import type { PopupCampaign, PopupLayer } from '@/types/popups';
import { useAuth } from '@/context/AuthContext';

const seenKey = (id: string) => `hmp_popup_seen_${id}`;
const countKey = (id: string) => `hmp_popup_count_${id}`;
const VISITS_KEY = 'hmp_visit_count';

function bumpVisits() {
  try {
    const n = Number(localStorage.getItem(VISITS_KEY) || '0') + 1;
    localStorage.setItem(VISITS_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

function pageKey(pathname: string) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/product')) return 'product';
  if (pathname.startsWith('/shop')) return 'shop';
  if (pathname.startsWith('/cart')) return 'cart';
  if (pathname.startsWith('/checkout')) return 'checkout';
  return 'other';
}

export function PopupHost() {
  const { data: campaigns = [] } = useActivePopupCampaigns();
  const location = useLocation();
  const { user } = (useAuth() as any) || {};
  const { install, canPrompt } = useInstallApp();
  const [active, setActive] = useState<PopupCampaign | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const shownRef = useRef<Set<string>>(new Set());
  const visitsRef = useRef<number>(0);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    visitsRef.current = bumpVisits();
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const currentPage = pageKey(location.pathname);
  const isAdminRoute = location.pathname.startsWith('/admin');

  const eligible = useMemo(() => {
    if (isAdminRoute) return [];
    const now = Date.now();
    return campaigns.filter((c) => {
      if (shownRef.current.has(c.id)) return false;
      if (c.starts_at && new Date(c.starts_at).getTime() > now) return false;
      if (c.ends_at && new Date(c.ends_at).getTime() < now) return false;
      const t = c.targeting || {};
      const pages = t.pages?.length ? t.pages : ['all'];
      if (!pages.includes('all') && !pages.includes(currentPage)) return false;
      const devices = t.devices?.length ? t.devices : ['mobile', 'desktop'];
      if (!devices.includes(isMobile ? 'mobile' : 'desktop')) return false;
      if (t.audience === 'logged-in' && !user) return false;
      if (t.audience === 'guests' && user) return false;
      if (c.type === 'install-app' && !canPrompt) return false;
      try {
        const seen = localStorage.getItem(seenKey(c.id));
        if (seen && c.frequency_days > 0) {
          const ageDays = (now - Number(seen)) / 86_400_000;
          if (ageDays < c.frequency_days) return false;
        }
        if (c.max_views > 0 && Number(localStorage.getItem(countKey(c.id)) || '0') >= c.max_views) return false;
      } catch {
        /* ignore storage errors */
      }
      if (c.display_trigger === 'visit_count' && visitsRef.current < (c.visit_count || 1)) return false;
      return true;
    });
  }, [campaigns, currentPage, isMobile, user, canPrompt, isAdminRoute]);

  useEffect(() => {
    if (active || eligible.length === 0) return;
    const c = eligible[0];
    const open = () => {
      if (shownRef.current.has(c.id)) return;
      shownRef.current.add(c.id);
      setActive(c);
      try {
        localStorage.setItem(countKey(c.id), String(Number(localStorage.getItem(countKey(c.id)) || '0') + 1));
      } catch {
        /* ignore */
      }
      trackPopupEvent(c.id, 'view');
    };

    const cleanups: (() => void)[] = [];
    switch (c.display_trigger) {
      case 'on_load':
      case 'visit_count': {
        const t = setTimeout(open, 400);
        cleanups.push(() => clearTimeout(t));
        break;
      }
      case 'delay': {
        const t = setTimeout(open, (c.delay_seconds || 5) * 1000);
        cleanups.push(() => clearTimeout(t));
        break;
      }
      case 'scroll': {
        const onScroll = () => {
          const max = document.body.scrollHeight - window.innerHeight;
          const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
          if (pct >= (c.scroll_percent || 50)) open();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener('scroll', onScroll));
        break;
      }
      case 'exit_intent': {
        const onLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) open();
        };
        document.addEventListener('mouseleave', onLeave);
        cleanups.push(() => document.removeEventListener('mouseleave', onLeave));
        break;
      }
      case 'idle': {
        let t = setTimeout(open, (c.idle_seconds || 30) * 1000);
        const reset = () => {
          clearTimeout(t);
          t = setTimeout(open, (c.idle_seconds || 30) * 1000);
        };
        ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach((ev) =>
          window.addEventListener(ev, reset, { passive: true }),
        );
        cleanups.push(() => {
          clearTimeout(t);
          ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.removeEventListener(ev, reset));
        });
        break;
      }
      case 'add_to_cart': {
        const onAdd = () => open();
        window.addEventListener('lvtk:add-to-cart', onAdd as EventListener);
        cleanups.push(() => window.removeEventListener('lvtk:add-to-cart', onAdd as EventListener));
        break;
      }
    }
    return () => cleanups.forEach((fn) => fn());
  }, [eligible, active]);

  const close = (dismissed = true) => {
    if (active) {
      try {
        localStorage.setItem(seenKey(active.id), String(Date.now()));
      } catch {
        /* ignore */
      }
      if (dismissed) trackPopupEvent(active.id, 'dismiss');
    }
    setActive(null);
  };

  const onLayerAction = async (layer: PopupLayer) => {
    if (!active) return;
    const action = layer.action || { type: 'none' };
    trackPopupEvent(active.id, 'click', { layerId: layer.id, action: action.type });
    switch (action.type) {
      case 'link':
        close(false);
        if (action.newTab) window.open(action.href, '_blank', 'noopener,noreferrer');
        else window.location.href = action.href;
        break;
      case 'chatbot':
        close(false);
        window.dispatchEvent(new CustomEvent('lvtk:open-chatbot'));
        break;
      case 'voice':
        close(false);
        window.dispatchEvent(new CustomEvent('lvtk:open-voice'));
        break;
      case 'install-app': {
        const ok = await install();
        trackPopupEvent(active.id, ok ? 'convert' : 'click', { install: ok });
        if (!ok) window.dispatchEvent(new CustomEvent('hmp:show-install-help'));
        close(false);
        break;
      }
      case 'close':
        close();
        break;
      default:
        break;
    }
  };

  const onEmailSubmit = async (email: string, layer: PopupLayer) => {
    if (!active) return;
    if (Date.now() - mountedAt.current < 3000) {
      toast.error('Veuillez patienter un instant');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email invalide');
      return;
    }
    setSubmitting(true);
    try {
      await subscribeToNewsletter(email, undefined, {
        source: 'popup',
        popupId: undefined,
        sessionId: getPopupSessionId(),
      });
      trackPopupEvent(active.id, 'convert', { layerId: layer.id });
      toast.success('Merci pour votre inscription !');
      close(false);
    } catch (err: any) {
      if (err?.code === '23505' || err?.code === '23514') {
        toast.success('Vous êtes déjà inscrit !');
        close(false);
      } else toast.error("Erreur d'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  const isBar = active?.format === 'bar';
  const isFullscreen = active?.format === 'fullscreen';

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => close()}
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className={
              isBar
                ? 'relative w-full max-w-4xl self-end'
                : isFullscreen
                  ? 'relative h-full w-full max-w-lg'
                  : 'relative w-full max-w-md'
            }
            style={{
              clipPath: isBar
                ? undefined
                : 'polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px)',
            }}
          >
            <button
              onClick={() => close()}
              aria-label="Fermer"
              className="absolute right-3 top-3 z-30 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
            <PopupRenderer
              campaign={active}
              onLayerAction={onLayerAction}
              onEmailSubmit={onEmailSubmit}
              submitting={submitting}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PopupHost;
