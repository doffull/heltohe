import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getProductTrustBadges, TRUST_BADGE_ICONS } from '@/lib/productTrustBadges';
import { getIconColor } from '@/lib/iconColors';
import { EditableBadgeLabel } from '@/components/visual-editor/EditableBadgeLabel';
import { cn } from '@/lib/utils';

interface ProductTrustBarProps {
  category?: string;
  className?: string;
  /** Conservé pour compatibilité : la barre tient toujours sur une seule ligne. */
  layout?: 'grid' | 'row';
}

/**
 * Bloc confiance : livraison, paiement sécurisé, retours.
 * Toujours sur UNE seule ligne (mobile comme desktop), icônes colorées animées.
 */
export default function ProductTrustBar({ category, className }: ProductTrustBarProps) {
  const { designSettings } = useApp();
  const { enabled, badges } = getProductTrustBadges(designSettings, category);

  if (!enabled || badges.length === 0) return null;

  return (
    <motion.div
      className={cn('flex w-full items-stretch gap-1.5 sm:gap-2', className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {badges.map((badge, i) => {
        const Icon = TRUST_BADGE_ICONS[badge.icon] || Truck;
        const color = getIconColor(badge.icon, i);
        return (
          <motion.div
            key={badge.id}
            className="group flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 chamfer-hud-sm border border-border/60 bg-card/40 px-1.5 py-2 text-center sm:flex-row sm:gap-2 sm:px-2.5 sm:text-left"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ y: -2 }}
          >
            <motion.span
              className={cn(
                'shrink-0 w-7 h-7 sm:w-8 sm:h-8 chamfer-hud-sm flex items-center justify-center border',
                color.bg,
                color.border
              )}
              whileHover={{ rotate: [0, -12, 12, 0], scale: 1.12 }}
              transition={{ duration: 0.5 }}
            >
              <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', color.text)} />
            </motion.span>
            <EditableBadgeLabel
              productCategory={category}
              badgeId={badge.id}
              currentLabel={badge.label}
              className="min-w-0 text-[9px] leading-tight sm:text-[11px] text-muted-foreground line-clamp-3 sm:line-clamp-2"
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
