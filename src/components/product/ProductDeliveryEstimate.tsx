import { motion } from 'framer-motion';
import { CalendarClock, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  /** Délai mini / maxi en jours ouvrés */
  minDays?: number;
  maxDays?: number;
}

function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

const fmt = (d: Date) =>
  d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });

/** Estimation de livraison — icônes colorées + animation. */
export default function ProductDeliveryEstimate({ className, minDays = 2, maxDays = 5 }: Props) {
  const now = new Date();
  const start = addBusinessDays(now, minDays);
  const end = addBusinessDays(now, maxDays);

  return (
    <motion.div
      className={cn(
        'flex flex-col gap-1.5 chamfer-hud-sm border border-border/60 bg-card/40 px-3 py-2.5',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
    >
      <div className="flex items-center gap-2">
        <motion.span
          className="flex h-6 w-6 shrink-0 items-center justify-center chamfer-hud-sm border border-emerald-500/35 bg-emerald-500/12"
          animate={{ x: [0, 2, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Truck className="h-3.5 w-3.5 text-emerald-500" />
        </motion.span>
        <p className="text-[11px] sm:text-xs">
          <span className="font-bold uppercase tracking-wider">Expédition sous 24/48 h</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <motion.span
          className="flex h-6 w-6 shrink-0 items-center justify-center chamfer-hud-sm border border-cyan-500/35 bg-cyan-500/12"
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <CalendarClock className="h-3.5 w-3.5 text-cyan-500" />
        </motion.span>
        <p className="text-[11px] sm:text-xs text-muted-foreground">
          Réception estimée entre{' '}
          <span className="font-semibold text-foreground">{fmt(start)}</span> et{' '}
          <span className="font-semibold text-foreground">{fmt(end)}</span>
        </p>
      </div>
    </motion.div>
  );
}
