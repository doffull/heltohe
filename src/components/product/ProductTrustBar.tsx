import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getProductTrustBadges, TRUST_BADGE_ICONS } from '@/lib/productTrustBadges';
import { EditableBadgeLabel } from '@/components/visual-editor/EditableBadgeLabel';
import { cn } from '@/lib/utils';

interface ProductTrustBarProps {
  category?: string;
  className?: string;
  /** 'grid' = tuiles (mobile/colonne), 'row' = ligne compacte */
  layout?: 'grid' | 'row';
}

/**
 * Bloc confiance : livraison, paiement sécurisé, délais, retours.
 * Les libellés restent pilotés par l'admin (badges de confiance).
 */
export default function ProductTrustBar({ category, className, layout = 'grid' }: ProductTrustBarProps) {
  const { designSettings } = useApp();
  const { enabled, badges } = getProductTrustBadges(designSettings, category);

  if (!enabled || badges.length === 0) return null;

  return (
    <motion.div
      className={cn(
        'grid gap-2',
        layout === 'row' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3',
        className
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {badges.map((badge, i) => {
        const Icon = TRUST_BADGE_ICONS[badge.icon] || Truck;
        return (
          <motion.div
            key={badge.id}
            className="flex items-center gap-2.5 chamfer-hud-sm border border-border/60 bg-card/40 px-3 py-2.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06 }}
          >
            <span className="shrink-0 w-8 h-8 chamfer-hud-sm bg-primary/12 border border-primary/30 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </span>
            <EditableBadgeLabel
              productCategory={category}
              badgeId={badge.id}
              currentLabel={badge.label}
              className="text-[11px] sm:text-xs text-muted-foreground leading-snug"
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
