import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewStarsProps {
  value: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onChange?: (v: number) => void;
  className?: string;
}

const sizeMap = { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };

export default function ReviewStars({ value, size = 'sm', onChange, className }: ReviewStarsProps) {
  const interactive = !!onChange;
  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`Note ${value} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        return (
          <motion.button
            key={i}
            type={interactive ? 'button' : undefined}
            disabled={!interactive}
            onClick={interactive ? () => onChange!(i) : undefined}
            className={cn('inline-flex', interactive && 'cursor-pointer')}
            aria-label={interactive ? `${i} étoile${i > 1 ? 's' : ''}` : undefined}
            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 320, damping: 16 }}
            whileHover={interactive ? { scale: 1.25, rotate: 8 } : { scale: 1.12 }}
            whileTap={interactive ? { scale: 0.85 } : undefined}
          >
            <Star
              className={cn(
                sizeMap[size],
                'transition-colors',
                filled
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.55)]'
                  : 'text-muted-foreground/40'
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
