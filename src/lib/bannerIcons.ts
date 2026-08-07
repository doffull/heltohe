import {
  Truck,
  Gift,
  RotateCcw,
  ShieldCheck,
  Clock,
  Star,
  Percent,
  CreditCard,
  Package,
  MapPin,
  Sparkles,
  Info,
  Flame,
  Heart,
  type LucideIcon,
} from 'lucide-react';

/** Icons selectable for the top banner messages. Keys are stored in the DB. */
export const BANNER_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  truck: { label: 'Camionnette (livraison)', Icon: Truck },
  package: { label: 'Colis / point relais', Icon: Package },
  gift: { label: 'Cadeau', Icon: Gift },
  returns: { label: 'Retours', Icon: RotateCcw },
  shield: { label: 'Paiement sécurisé', Icon: ShieldCheck },
  clock: { label: 'Horloge / délai', Icon: Clock },
  star: { label: 'Étoile / avis', Icon: Star },
  percent: { label: 'Promotion', Icon: Percent },
  card: { label: 'Carte bancaire', Icon: CreditCard },
  pin: { label: 'Boutique / localisation', Icon: MapPin },
  sparkles: { label: 'Nouveauté', Icon: Sparkles },
  info: { label: 'Information', Icon: Info },
  flame: { label: 'Vente flash', Icon: Flame },
  heart: { label: 'Fidélité', Icon: Heart },
};

export type BannerIconKey = keyof typeof BANNER_ICONS;

export function getBannerIcon(key?: string | null): LucideIcon | null {
  if (!key || key === 'none') return null;
  return BANNER_ICONS[key]?.Icon ?? null;
}

export interface TopBannerItem {
  id: string;
  icon?: string;
  text: string;
  link?: string;
}

export interface TopBannerConfig {
  enabled: boolean;
  items: TopBannerItem[];
  bgColor: string;
  textColor: string;
  /** Rotation interval in ms (0 = no rotation) */
  rotateMs: number;
  /** Desktop: show every message side by side instead of rotating */
  desktopShowAll: boolean;
  mobileFontSize: number;
  mobileTracking: number;
  mobileHeight: number;
  desktopFontSize: number;
  desktopTracking: number;
  desktopHeight: number;
  uppercase: boolean;
  /** Legacy single-message fields */
  text?: string;
  link?: string;
}

export const DEFAULT_TOP_BANNER: TopBannerConfig = {
  enabled: true,
  items: [
    { id: 'b1', icon: 'truck', text: 'Livraison offerte en point relais', link: '' },
    { id: 'b2', icon: 'none', text: 'Enfant : ni repris ni échangé', link: '' },
  ],
  bgColor: '#000000',
  textColor: '#ffffff',
  rotateMs: 4000,
  desktopShowAll: true,
  mobileFontSize: 10,
  mobileTracking: 0.04,
  mobileHeight: 32,
  desktopFontSize: 12,
  desktopTracking: 0.12,
  desktopHeight: 36,
  uppercase: true,
};

/** Normalize whatever is stored in `design_settings.top_banner` into the new shape. */
export function resolveTopBanner(raw: unknown): TopBannerConfig {
  const cfg = (raw && typeof raw === 'object' ? raw : {}) as Partial<TopBannerConfig>;
  let items = Array.isArray(cfg.items) ? cfg.items.filter((i) => i && typeof i.text === 'string') : [];
  // Legacy migration: a single `text` becomes the first message.
  if (items.length === 0 && typeof cfg.text === 'string' && cfg.text.trim()) {
    items = [{ id: 'legacy', icon: 'none', text: cfg.text, link: cfg.link || '' }];
  }
  if (items.length === 0) items = DEFAULT_TOP_BANNER.items;
  return {
    ...DEFAULT_TOP_BANNER,
    ...cfg,
    enabled: cfg.enabled !== false,
    items,
  };
}
