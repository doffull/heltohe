import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SparkleBurstProps {
  /** Change this value (increment) to fire a new burst. 0 = idle. */
  trigger: number | string | null;
  count?: number;
  /** Radius of the burst in px */
  radius?: number;
  className?: string;
}

const COLORS = ['#facc15', '#fb923c', '#38bdf8', '#a78bfa', '#34d399', '#f472b6'];

/**
 * Petite explosion de paillettes — feedback "satisfaisant" lors d'une
 * sélection (taille, couleur) ou d'un ajout au panier.
 */
export function SparkleBurst({ trigger, count = 14, radius = 44, className }: SparkleBurstProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === null || trigger === 0 || trigger === '') return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 750);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <span className={cn('pointer-events-none absolute inset-0 overflow-visible', className)} aria-hidden>
      <AnimatePresence>
        {visible && (
          <span className="absolute left-1/2 top-1/2">
            {Array.from({ length: count }).map((_, i) => {
              const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
              const dist = radius * (0.55 + Math.random() * 0.7);
              const size = 3 + Math.random() * 4;
              return (
                <motion.span
                  key={`${String(trigger)}-${i}`}
                  className="absolute rounded-[1px]"
                  style={{
                    width: size,
                    height: size,
                    background: COLORS[i % COLORS.length],
                    boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                  animate={{
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    opacity: 0,
                    scale: 1.1,
                    rotate: 180,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              );
            })}
            {/* halo */}
            <motion.span
              key={`halo-${String(trigger)}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400/70"
              style={{ width: radius, height: radius }}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}

export default SparkleBurst;
