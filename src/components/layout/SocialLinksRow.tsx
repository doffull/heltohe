import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { resolveBrand } from '@/components/icons/BrandIcons';
import type { SocialDisplaySettings, SocialLink } from '@/types';

const SHAPE_CLASS: Record<string, string> = {
  square: 'chamfer-hud-sm border border-current/30',
  rounded: 'rounded-md border border-current/30',
  circle: 'rounded-full border border-current/30',
  none: '',
};

export function useSocialLinks() {
  const { designSettings } = useApp();
  const s = designSettings as any;
  const display: SocialDisplaySettings = s?.socialDisplay ?? {};
  const links: SocialLink[] = ((s?.socialLinks as SocialLink[]) || []).filter(
    (l) => l && l.enabled !== false && (l.url || '').trim() && (l.url || '').trim() !== '#'
  );
  return { links, display };
}

interface SocialLinksRowProps {
  className?: string;
  mode?: 'icons' | 'text' | 'both';
  size?: number;
  /** Contexte d'affichage : respecte les emplacements choisis dans l'admin. */
  placement?: 'header' | 'mobileMenu' | 'contact' | 'maintenance' | 'always';
}

/**
 * Rangée de réseaux sociaux réutilisable (en-tête, menu mobile, contact,
 * maintenance). Source unique : Admin → Réseaux sociaux.
 */
export default function SocialLinksRow({
  className,
  mode,
  size,
  placement = 'always',
}: SocialLinksRowProps) {
  const { links, display } = useSocialLinks();

  const allowed =
    placement === 'always' ||
    (placement === 'header' && display.showInHeader === true) ||
    (placement === 'mobileMenu' && display.showInMobileMenu !== false) ||
    (placement === 'contact' && display.showOnContact !== false) ||
    (placement === 'maintenance' && display.showOnMaintenance !== false);

  if (!allowed || links.length === 0) return null;

  const iconSize = size ?? display.iconSize ?? 18;
  const shape = SHAPE_CLASS[display.shape || 'square'] ?? SHAPE_CLASS.square;
  const target = display.newTab === false ? undefined : '_blank';
  const displayMode = mode || 'icons';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {links.map((l, i) => {
        const brand = resolveBrand(l.label, l.url);
        const Icon = brand?.Icon;
        return (
          <a
            key={`${l.label}-${i}`}
            href={l.url}
            target={target}
            rel={target ? 'noopener noreferrer' : undefined}
            aria-label={l.label || brand?.label || 'Réseau social'}
            title={l.label || brand?.label}
            className={cn(
              'inline-flex items-center gap-2 p-2 transition-colors hover:text-primary',
              displayMode === 'text' && 'px-2 py-1 text-xs uppercase tracking-widest',
              shape
            )}
            style={display.color ? { color: display.color } : undefined}
          >
            {displayMode !== 'text' &&
              (l.iconUrl ? (
                <img
                  src={l.iconUrl}
                  alt=""
                  style={{ width: iconSize, height: iconSize }}
                  className="object-contain"
                  loading="lazy"
                />
              ) : Icon ? (
                <Icon style={{ width: iconSize, height: iconSize }} />
              ) : (
                <span className="text-[11px] font-bold uppercase">{(l.label || '?').slice(0, 2)}</span>
              ))}
            {displayMode !== 'icons' && (
              <span className="text-xs uppercase tracking-widest">{l.label}</span>
            )}
          </a>
        );
      })}
    </div>
  );
}
