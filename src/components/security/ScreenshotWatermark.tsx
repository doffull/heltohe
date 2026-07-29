import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { useAuth } from '@/context/AuthContext';

/**
 * Overlay traçable dissuadant les captures d'écran.
 * Configurable via design_settings.securityOverlay (admin UI).
 * Masqué pour les super-admins et sur les routes /admin.
 */
export function ScreenshotWatermark() {
  const [email, setEmail] = useState<string>('');
  const { data: settings } = useDesignSettings();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const cfg = (settings as any)?.securityOverlay ?? {};

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? '');
    });
    return () => { mounted = false; };
  }, []);

  if (isAdmin) return null;
  if (isAdminRoute) return null;
  if (cfg.enabled === false) return null;

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const customText = (cfg.text as string) || '';
  const emailLabel = cfg.showEmail !== false ? (email || 'visiteur') : '';
  const parts = [customText, emailLabel, stamp].filter(Boolean);
  const text = parts.join(' • ') || 'protégé';

  const opacity = typeof cfg.opacity === 'number' ? Math.max(0, Math.min(0.5, cfg.opacity)) : 0.05;
  const angle = typeof cfg.angle === 'number' ? cfg.angle : -30;
  const density = typeof cfg.density === 'number' ? Math.max(10, Math.min(200, cfg.density)) : 60;
  const color = (cfg.color as string) || 'currentColor';

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[70] overflow-hidden select-none"
      style={{
        backgroundImage: `repeating-linear-gradient(${angle}deg, transparent 0 120px, rgba(0,0,0,0.02) 120px 121px)`,
        pointerEvents: 'none',
      }}
    >
      <div
        className="absolute inset-0 flex flex-wrap gap-8 p-8 text-[10px] uppercase tracking-widest font-mono"
        style={{
          transform: `rotate(${angle}deg) scale(1.4)`,
          transformOrigin: 'center',
          opacity,
          color,
        }}
      >
        {Array.from({ length: density }).map((_, i) => (
          <span key={i} className="whitespace-nowrap">{text}</span>
        ))}
      </div>
    </div>
  );
}
