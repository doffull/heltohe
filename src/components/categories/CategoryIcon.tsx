import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Jeu d'icônes proposé dans l'admin pour les catégories. */
export const CATEGORY_ICON_NAMES = [
  'Shirt', 'ShoppingBag', 'Footprints', 'Baby', 'User', 'Users', 'Watch', 'Glasses',
  'Backpack', 'Crown', 'Flame', 'Snowflake', 'Mountain', 'Sun', 'Moon', 'Sparkles',
  'Tag', 'Star', 'Heart', 'Zap', 'Shield', 'Gift', 'Package', 'Umbrella',
  'Bike', 'Dumbbell', 'Trophy', 'Wind', 'Compass', 'Tent',
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number] | string;

const SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
} as const;

const IMG_SIZES = {
  xs: 'h-3 w-auto max-w-[24px]',
  sm: 'h-4 w-auto max-w-[32px]',
  md: 'h-5 w-auto max-w-[44px]',
  lg: 'h-7 w-auto max-w-[64px]',
} as const;

export function resolveLucideIcon(name?: string | null): LucideIcon | null {
  if (!name) return null;
  const found = (Icons as unknown as Record<string, unknown>)[name];
  return typeof found === 'function' ? (found as LucideIcon) : null;
}

interface Props {
  /** Nom d'icône Lucide. */
  icon?: string | null;
  /** URL d'un logo/image personnalisé (prioritaire sur l'icône). */
  iconImage?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Icône ou logo affiché à côté du nom d'une catégorie. Ne rend rien si non défini. */
export default function CategoryIcon({ icon, iconImage, size = 'sm', className }: Props) {
  if (iconImage) {
    return (
      <img
        src={iconImage}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className={cn('shrink-0 object-contain', IMG_SIZES[size], className)}
      />
    );
  }
  const Icon = resolveLucideIcon(icon);
  if (!Icon) return null;
  return <Icon className={cn('shrink-0', SIZES[size], className)} aria-hidden />;
}
