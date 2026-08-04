import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Product } from '@/types';

export type BadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const BADGE_POSITIONS: { value: BadgePosition; label: string }[] = [
  { value: 'bottom-right', label: 'Bas droite' },
  { value: 'bottom-left', label: 'Bas gauche' },
  { value: 'top-right', label: 'Haut droite' },
  { value: 'top-left', label: 'Haut gauche' },
];

export const DEFAULT_LIMITED_LABEL = 'Limited Edition';

export function getBadgeLabel(product?: Partial<Product> | null): string {
  const raw = (product?.limitedEditionLabel || '').trim();
  return raw || DEFAULT_LIMITED_LABEL;
}

export function getBadgePosition(product?: Partial<Product> | null): BadgePosition {
  const p = product?.limitedEditionPosition as BadgePosition | undefined;
  return p && BADGE_POSITIONS.some((o) => o.value === p) ? p : 'bottom-right';
}

/** Absolute-corner utility classes, with mobile-safe insets. */
export function badgeCornerClasses(position: BadgePosition): string {
  switch (position) {
    case 'top-left':
      return 'top-2 left-2 sm:top-4 sm:left-4 items-start';
    case 'top-right':
      return 'top-2 right-2 sm:top-4 sm:right-4 items-end';
    case 'bottom-left':
      return 'bottom-2 left-2 sm:bottom-4 sm:left-4 items-start';
    default:
      return 'bottom-2 right-2 sm:bottom-4 sm:right-4 items-end';
  }
}

interface Props {
  product?: Partial<Product> | null;
  /** Compact variant used on product cards / small thumbnails. */
  compact?: boolean;
  animate?: boolean;
  className?: string;
}

/**
 * Configurable « LIMITED EDITION » badge.
 * Text, colors and position come from the product itself; falls back to the
 * Industrial Luxury default (outlined, background/foreground tokens).
 */
export function LimitedEditionBadge({ product, compact = false, animate = true, className }: Props) {
  if (!product?.limitedEdition) return null;

  const label = getBadgeLabel(product);
  const bg = (product.limitedEditionColor || '').trim();
  const fg = (product.limitedEditionTextColor || '').trim();

  const style: React.CSSProperties = {};
  if (bg) style.backgroundColor = bg;
  if (fg) {
    style.color = fg;
    style.borderColor = fg;
  }

  const classes = cn(
    'bevel-corners inline-block max-w-[60vw] sm:max-w-[16rem] truncate border font-bold uppercase backdrop-blur-sm',
    !bg && 'bg-background/95',
    !fg && 'border-foreground',
    compact
      ? 'px-1.5 py-0.5 text-[8px] tracking-[0.12em] sm:px-2 sm:py-1 sm:text-[9px] sm:tracking-[0.18em]'
      : 'px-2 py-1 text-[9px] leading-tight tracking-[0.12em] sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:tracking-[0.18em]',
    className,
  );

  if (!animate) {
    return (
      <span className={classes} style={style} title={label}>
        {label}
      </span>
    );
  }

  return (
    <motion.span
      className={classes}
      style={style}
      title={label}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 260 }}
    >
      {label}
    </motion.span>
  );
}

export default LimitedEditionBadge;
