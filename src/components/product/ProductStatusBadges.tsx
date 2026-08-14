import { Flame, Sparkles, Tag, TrendingUp, AlertTriangle, PackageX, Crown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { useApp } from '@/context/AppContext';

export type BadgeKind = 'promo' | 'new' | 'top' | 'trending' | 'stock' | 'soldout' | 'exclusive';

interface BadgeDef {
  kind: BadgeKind;
  label: string;
  icon: LucideIcon;
  /** HSL token name used by the glossy gradient */
  token: string;
}

const BADGE_DEFS: Record<BadgeKind, BadgeDef> = {
  promo: { kind: 'promo', label: 'Promo', icon: Tag, token: '--badge-promo' },
  new: { kind: 'new', label: 'Nouveau', icon: Sparkles, token: '--badge-new' },
  top: { kind: 'top', label: 'Top vente', icon: Flame, token: '--badge-top' },
  trending: { kind: 'trending', label: 'Tendance', icon: TrendingUp, token: '--badge-trending' },
  stock: { kind: 'stock', label: 'Stock limité', icon: AlertTriangle, token: '--badge-stock' },
  soldout: { kind: 'soldout', label: 'Épuisé', icon: PackageX, token: '--badge-soldout' },
  exclusive: { kind: 'exclusive', label: 'Exclusivité', icon: Crown, token: '--badge-limited' },
};

/** Derive the active badges of a product, ordered by importance. */
export function getProductBadges(product: Partial<Product> | null | undefined): BadgeDef[] {
  if (!product) return [];
  const tags = (product.tags || []).map((t) => (t || '').toLowerCase());
  const out: BadgeKind[] = [];

  const stock = typeof product.stock === 'number' ? product.stock : undefined;
  const hasDiscount = Boolean(product.salePrice && product.price && product.salePrice < product.price);

  if (stock === 0) out.push('soldout');
  if (hasDiscount || tags.includes('promo')) out.push('promo');
  if (tags.includes('new') || tags.includes('nouveau')) out.push('new');
  if (tags.includes('top')) out.push('top');
  if (tags.includes('trending')) out.push('trending');
  if (tags.includes('exclusive') || tags.includes('exclusivite')) out.push('exclusive');
  if (stock !== undefined && stock > 0 && stock <= 5) out.push('stock');

  return out.map((k) => BADGE_DEFS[k]);
}

/** Percentage saved, e.g. -30% — used on the promo badge label. */
function discountLabel(product: Partial<Product>): string | null {
  if (!product.salePrice || !product.price || product.salePrice >= product.price) return null;
  const pct = Math.round(((product.price - product.salePrice) / product.price) * 100);
  return pct > 0 ? `-${pct}%` : null;
}

interface SingleProps {
  kind: BadgeKind;
  label?: string;
  compact?: boolean;
  animated?: boolean;
  className?: string;
}

export function GlossyBadge({ kind, label, compact = false, animated = true, className }: SingleProps) {
  const def = BADGE_DEFS[kind];
  const Icon = def.icon;
  return (
    <span
      className={cn(
        'glossy-badge bevel-corners-sm font-bold uppercase leading-none tracking-[0.14em] whitespace-nowrap',
        compact ? 'px-2 py-1 text-[8px]' : 'px-2.5 py-1.5 text-[10px]',
        !animated && 'glossy-badge-static',
        className,
      )}
      style={{ ['--badge-hue' as string]: `var(${def.token})` }}
    >
      <Icon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={2.5} aria-hidden />
      {label ?? def.label}
    </span>
  );
}

interface Props {
  product: Partial<Product> | null | undefined;
  compact?: boolean;
  animated?: boolean;
  max?: number;
  className?: string;
}

/** Dynamic stack of glossy status badges for a product. */
export function ProductStatusBadges({ product, compact = false, animated = true, max = 3, className }: Props) {
  const { designSettings } = useApp();
  const enabled = (designSettings as any)?.showProductStatusBadges === true;
  const badges = getProductBadges(product).slice(0, max);
  if (!enabled || badges.length === 0) return null;
  const pct = product ? discountLabel(product) : null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {badges.map((b) => (
        <GlossyBadge
          key={b.kind}
          kind={b.kind}
          compact={compact}
          animated={animated}
          label={b.kind === 'promo' && pct ? `Promo ${pct}` : undefined}
        />
      ))}
    </div>
  );
}

export default ProductStatusBadges;
