import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDesignSettings } from '@/hooks/useDesignSettings';

function useCountdown(target?: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!target) { setLeft(null); return; }
    const t = new Date(target).getTime();
    if (Number.isNaN(t)) { setLeft(null); return; }
    const tick = () => setLeft(Math.max(0, t - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

interface Props {
  /** Rendu dans l'admin en aperçu (pas de plein écran, pas de Helmet). */
  preview?: boolean;
  overrides?: Record<string, any>;
}

export function MaintenancePage({ preview = false, overrides }: Props) {
  const { data: settings } = useDesignSettings();
  const s = { ...((settings as any) || {}), ...(overrides || {}) };

  const title = s.maintenanceTitle || 'SITE EN MAINTENANCE';
  const message = s.maintenanceMessage || 'Nous revenons très vite. Merci de votre patience.';
  const bg = s.maintenanceBg || '#ffffff';
  const image = s.maintenanceImage || s.hudLogo || '';
  const left = useCountdown(s.maintenanceUntil);

  const days = left != null ? Math.floor(left / 86400000) : 0;
  const hours = left != null ? Math.floor((left % 86400000) / 3600000) : 0;
  const mins = left != null ? Math.floor((left % 3600000) / 60000) : 0;
  const secs = left != null ? Math.floor((left % 60000) / 1000) : 0;

  const social: Array<{ url?: string; label?: string; name?: string }> = Array.isArray(s.socialLinks) ? s.socialLinks : [];

  return (
    <div
      className={
        preview
          ? 'relative w-full min-h-[420px] flex items-center justify-center overflow-hidden rounded border border-border'
          : 'fixed inset-0 z-[9998] flex items-center justify-center overflow-auto'
      }
      style={{ backgroundColor: bg }}
    >
      {!preview && (
        <Helmet>
          <title>{title}</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
      )}

      {/* Trames industrielles 45° */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 14px)',
        }}
      />

      <div className="relative z-10 w-full max-w-xl px-6 py-14 text-center">
        {image && (
          <img
            src={image}
            alt=""
            className="mx-auto mb-10 h-14 w-auto object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div
          className="inline-block border border-current/20 px-4 py-1 mb-6 text-[10px] tracking-[0.35em] uppercase opacity-60"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
        >
          Maintenance
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold uppercase tracking-[0.18em] leading-tight break-words">
          {title}
        </h1>

        <div className="mx-auto mt-6 mb-6 h-px w-16 bg-current opacity-30" />

        <p className="text-sm sm:text-base leading-relaxed opacity-70 whitespace-pre-line">
          {message}
        </p>

        {left != null && left > 0 && (
          <div className="mt-10 flex items-center justify-center gap-3 sm:gap-5">
            {[
              { v: days, l: 'JOURS' },
              { v: hours, l: 'HEURES' },
              { v: mins, l: 'MIN' },
              { v: secs, l: 'SEC' },
            ].map((b) => (
              <div key={b.l} className="min-w-[56px]">
                <div
                  className="border border-current/25 py-2 text-xl sm:text-2xl font-bold tabular-nums"
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                >
                  {pad(b.v)}
                </div>
                <div className="mt-2 text-[9px] tracking-[0.25em] opacity-50">{b.l}</div>
              </div>
            ))}
          </div>
        )}

        {social.length > 0 && (s as any)?.socialDisplay?.showOnMaintenance !== false && (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-[11px] tracking-[0.2em] uppercase opacity-60">
            {social.filter((l) => l?.url).map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:opacity-100"
              >
                {l.label || l.name || 'Suivre'}
              </a>
            ))}
          </div>
        )}

        {s.contactEmail && (
          <div className="mt-6 text-[11px] tracking-widest opacity-50">
            <a href={`mailto:${s.contactEmail}`} className="underline underline-offset-4">{s.contactEmail}</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default MaintenancePage;
