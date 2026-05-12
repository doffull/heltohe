import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface PromoParallaxConfig {
  enabled?: boolean;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  mobileMediaUrl?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  height?: string;
  overlayOpacity?: number;
}

export function PromoParallax() {
  const { designSettings } = useApp() as any;
  const isMobile = useIsMobile();
  const cfg: PromoParallaxConfig = designSettings.promoParallax || {};

  if (!cfg.enabled) return null;
  const url = (isMobile && cfg.mobileMediaUrl) ? cfg.mobileMediaUrl : cfg.mediaUrl;
  if (!url) return null;

  const height = cfg.height || '60vh';
  const overlay = Math.max(0, Math.min(1, cfg.overlayOpacity ?? 0.4));
  const isVideo = cfg.mediaType === 'video';

  return (
    <section
      className="relative w-full overflow-hidden bg-secondary"
      style={{ height }}
      aria-label={cfg.title || 'Section promotionnelle'}
    >
      {isVideo ? (
        <video
          src={url}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: isMobile ? 'scroll' : 'fixed',
          }}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-foreground"
        style={{ opacity: overlay }}
        aria-hidden
      />

      {/* Content */}
      {(cfg.title || cfg.subtitle || cfg.ctaLabel) && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          {cfg.subtitle && (
            <p className="text-xs lg:text-sm font-bold uppercase tracking-[0.3em] text-background/80 mb-3">
              {cfg.subtitle}
            </p>
          )}
          {cfg.title && (
            <h2 className={cn(
              'font-bold uppercase tracking-wider text-background',
              'text-3xl md:text-5xl lg:text-6xl max-w-4xl leading-tight'
            )}>
              {cfg.title}
            </h2>
          )}
          {cfg.ctaLabel && cfg.ctaUrl && (
            <Link
              to={cfg.ctaUrl}
              className="mt-8 inline-block px-8 py-3 bg-background text-foreground text-xs font-bold uppercase tracking-widest hover:bg-background/90 transition-colors chamfer-hud-sm"
            >
              {cfg.ctaLabel}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export default PromoParallax;
