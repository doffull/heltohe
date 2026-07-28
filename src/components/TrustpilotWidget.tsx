import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

let scriptPromise: Promise<void> | null = null;

function loadTrustpilotScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).Trustpilot) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    const s = document.createElement('script');
    s.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

type TrustpilotVariant = 'micro' | 'carousel' | 'grid' | 'mini';

const TEMPLATES: Record<TrustpilotVariant, { id: string; height: string; width: string }> = {
  micro: { id: '5419b6a8b0d04a076446a9ad', height: '24px', width: '100%' },
  mini: { id: '53aa8807dec7e10d38f59f32', height: '150px', width: '100%' },
  carousel: { id: '53aa8912dec7e10d38f59f36', height: '240px', width: '100%' },
  grid: { id: '539adbd6dec7e10e686debee', height: '500px', width: '100%' },
};

interface Props {
  variant?: TrustpilotVariant;
  theme?: 'light' | 'dark';
  className?: string;
}

export default function TrustpilotWidget({ variant = 'micro', theme = 'light', className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { designSettings } = useApp() as any;
  const tp = (designSettings as any)?.trustpilot ?? {};
  const businessUnitId: string | undefined = tp.businessUnitId;
  const domain: string = tp.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
  const locale: string = tp.locale || 'fr-FR';

  useEffect(() => {
    if (!businessUnitId) return;
    loadTrustpilotScript().then(() => {
      if (ref.current && (window as any).Trustpilot) {
        (window as any).Trustpilot.loadFromElement(ref.current, true);
      }
    });
  }, [businessUnitId, variant, theme]);

  if (!businessUnitId) return null;

  const t = TEMPLATES[variant];
  return (
    <div className={className}>
      <div
        ref={ref}
        className="trustpilot-widget"
        data-locale={locale}
        data-template-id={t.id}
        data-businessunit-id={businessUnitId}
        data-style-height={t.height}
        data-style-width={t.width}
        data-theme={theme}
      >
        <a href={`https://${locale.startsWith('fr') ? 'fr' : 'www'}.trustpilot.com/review/${domain}`} target="_blank" rel="noopener noreferrer">
          Voir nos avis Trustpilot
        </a>
      </div>
    </div>
  );
}
