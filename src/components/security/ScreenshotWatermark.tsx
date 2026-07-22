import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Overlay traçable dissuadant les captures d'écran.
 * - Watermark diagonal semi-transparent (email utilisateur ou timestamp)
 * - Pointer-events: none pour ne pas gêner l'UX
 * - Masqué en mode admin (interfère avec l'édition)
 */
export function ScreenshotWatermark() {
  const [label, setLabel] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const email = data.user?.email;
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      setLabel(email ? `${email} • ${stamp}` : `visiteur • ${stamp}`);
    });
    return () => { mounted = false; };
  }, []);

  // Ne pas afficher dans l'admin
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return null;
  }

  const text = label || 'protégé';
  const pattern = Array.from({ length: 40 }).map((_, i) => text).join('   ');

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[70] overflow-hidden select-none"
      style={{
        backgroundImage: `repeating-linear-gradient(-30deg, transparent 0 120px, rgba(0,0,0,0.02) 120px 121px)`,
      }}
    >
      <div
        className="absolute inset-0 flex flex-wrap gap-8 p-8 opacity-[0.05] text-[10px] uppercase tracking-widest font-mono text-foreground"
        style={{ transform: 'rotate(-30deg) scale(1.4)', transformOrigin: 'center' }}
      >
        {Array.from({ length: 60 }).map((_, i) => (
          <span key={i} className="whitespace-nowrap">{text}</span>
        ))}
      </div>
    </div>
  );
}
