import { Truck, Shield, RotateCcw, Sparkles, Leaf, Award, Package, Headphones, CreditCard, MapPin, Heart, Zap, Gift, Star, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DesignSettings, ProductTrustBadge, ProductTrustBadgesConfig } from '@/types';

export const TRUST_BADGE_ICONS: Record<string, LucideIcon> = {
  Truck, Shield, RotateCcw, Sparkles, Leaf, Award, Package, Headphones, CreditCard, MapPin, Heart, Zap, Gift, Star, Check,
};

export const TRUST_BADGE_ICON_NAMES = Object.keys(TRUST_BADGE_ICONS);

export const DEFAULT_TRUST_BADGES: ProductTrustBadge[] = [
  { id: 'delivery', icon: 'Truck', label: 'Livraison gratuite en point relais', enabled: true },
  { id: 'warranty', icon: 'Shield', label: 'Garantie 1 an', enabled: true },
  { id: 'returns', icon: 'RotateCcw', label: 'Retours sous 30 jours', enabled: true },
];

const normalizeKey = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/** Résout la config de badges pour une catégorie de produit donnée. */
export const normalizeCategoryKey = normalizeKey;

export function getProductTrustBadges(
  settings: Partial<DesignSettings> | undefined,
  productCategory?: string
): { enabled: boolean; badges: ProductTrustBadge[] } {
  const cfg: ProductTrustBadgesConfig | undefined = settings?.productTrustBadges;
  if (!cfg) return { enabled: true, badges: DEFAULT_TRUST_BADGES };
  if (cfg.enabled === false) return { enabled: false, badges: [] };
  const key = normalizeKey(productCategory || '');
  const byCat = cfg.byCategory || {};
  let override: ProductTrustBadge[] | undefined;
  if (key) {
    // 1) Exact match takes priority
    for (const [catKey, list] of Object.entries(byCat)) {
      if (normalizeKey(catKey) === key) { override = list; break; }
    }
    // 2) Fall back to fuzzy contains match
    if (!override) {
      for (const [catKey, list] of Object.entries(byCat)) {
        const nk = normalizeKey(catKey);
        if (nk && (key.includes(nk) || nk.includes(key))) { override = list; break; }
      }
    }
  }
  // Respect an explicitly-emptied default list. Only fall back to hard defaults
  // when default is undefined (never configured).
  const fallback = cfg.default === undefined ? DEFAULT_TRUST_BADGES : cfg.default;
  const list = override && override.length ? override : fallback;
  return { enabled: true, badges: list.filter(b => b.enabled) };
}
