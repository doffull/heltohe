import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'lvtk6_session_id';

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function describeElement(el: Element | null): { label: string; selector: string } {
  if (!el) return { label: '', selector: '' };
  const target = (el.closest('button, a, [role="button"], [data-track]') as HTMLElement) || (el as HTMLElement);
  const label =
    target.getAttribute('aria-label') ||
    target.getAttribute('data-track') ||
    target.innerText?.trim().slice(0, 60) ||
    target.tagName.toLowerCase();
  const selector =
    target.id
      ? `#${target.id}`
      : target.className && typeof target.className === 'string'
      ? `${target.tagName.toLowerCase()}.${target.className.split(' ').slice(0, 2).join('.')}`
      : target.tagName.toLowerCase();
  return { label: label.slice(0, 120), selector: selector.slice(0, 200) };
}

interface Options {
  enabled?: boolean;
  userId?: string | null;
}

export function useVisitorTracking({ enabled = true, userId = null }: Options = {}) {
  const location = useLocation();
  const sessionIdRef = useRef<string>('');
  const startedRef = useRef(false);
  const lastPathRef = useRef<string>('');
  const pageStartRef = useRef<number>(Date.now());

  // Init session + heartbeat
  useEffect(() => {
    if (!enabled) return;
    sessionIdRef.current = getOrCreateSessionId();

    if (!startedRef.current) {
      startedRef.current = true;
      supabase
        .from('visitor_sessions')
        .upsert(
          {
            session_id: sessionIdRef.current,
            user_id: userId || null,
            user_agent: navigator.userAgent.slice(0, 500),
            device: detectDevice(),
            referrer: document.referrer?.slice(0, 500) || null,
            landing_path: window.location.pathname,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'session_id' }
        )
        .then(() => {});
    }

    const hb = setInterval(() => {
      supabase
        .from('visitor_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('session_id', sessionIdRef.current)
        .then(() => {});
    }, 15000);

    return () => clearInterval(hb);
  }, [enabled, userId]);

  // Page views
  useEffect(() => {
    if (!enabled || !sessionIdRef.current) return;
    const path = location.pathname + location.search;
    if (lastPathRef.current === path) return;

    // Save duration of previous page
    if (lastPathRef.current) {
      const duration = Date.now() - pageStartRef.current;
      supabase
        .from('page_views')
        .insert({
          session_id: sessionIdRef.current,
          path: lastPathRef.current,
          title: document.title.slice(0, 200),
          duration_ms: duration,
        })
        .then(() => {});
    }
    lastPathRef.current = path;
    pageStartRef.current = Date.now();
  }, [enabled, location.pathname, location.search]);

  // Click tracking (delegated)
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      // Only track meaningful elements
      const meaningful = target.closest('button, a, [role="button"], [data-track]');
      if (!meaningful) return;
      const { label, selector } = describeElement(target);
      supabase
        .from('click_events')
        .insert({
          session_id: sessionIdRef.current,
          path: window.location.pathname,
          element_label: label,
          element_selector: selector,
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
        })
        .then(() => {});
    };
    document.addEventListener('click', handler, { capture: true, passive: true });
    return () => document.removeEventListener('click', handler, { capture: true } as any);
  }, [enabled]);
}
