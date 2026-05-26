import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

function getSessionHash(): string {
  try {
    let h = localStorage.getItem('lvtk:sess');
    if (!h) {
      h = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('lvtk:sess', h);
    }
    return h;
  } catch {
    return 'anon';
  }
}

type BannerEvent = 'view' | 'click' | 'dismiss' | 'convert';

async function track(
  bannerId: string,
  bannerType: string,
  event: BannerEvent,
  meta?: Record<string, unknown>,
) {
  if (!bannerId || !bannerType) return;
  try {
    await supabase.from('banner_analytics').insert([{
      banner_id: bannerId,
      banner_type: bannerType,
      event,
      session_hash: getSessionHash(),
      url: typeof window !== 'undefined' ? window.location.pathname : null,
      meta: (meta || {}) as any,
    }]);
  } catch {
    /* silent — analytics must never break UX */
  }
}

/**
 * Track banner views, clicks, dismissals and conversions.
 * Pass a stable bannerId for the lifetime of the component instance.
 */
export function useBannerAnalytics(bannerId: string, bannerType: string, autoView = true) {
  const sentView = useRef(false);

  useEffect(() => {
    if (!autoView || sentView.current || !bannerId) return;
    sentView.current = true;
    track(bannerId, bannerType, 'view');
  }, [bannerId, bannerType, autoView]);

  const trackClick = useCallback(
    (meta?: Record<string, unknown>) => track(bannerId, bannerType, 'click', meta),
    [bannerId, bannerType],
  );
  const trackDismiss = useCallback(
    (meta?: Record<string, unknown>) => track(bannerId, bannerType, 'dismiss', meta),
    [bannerId, bannerType],
  );
  const trackConvert = useCallback(
    (meta?: Record<string, unknown>) => track(bannerId, bannerType, 'convert', meta),
    [bannerId, bannerType],
  );

  return { trackClick, trackDismiss, trackConvert };
}
