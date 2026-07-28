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
    <div className={cn('inline-flex items-center gap-0.5', className)} role={interactive ? 'radiogroup' : 'img'} aria-label={`Note ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        const Comp = interactive ? 'button' : 'span';
        return (
          <Comp
            key={i}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onChange!(i) : undefined}
            className={cn(
              interactive && 'cursor-pointer hover:scale-110 transition-transform',
              !interactive && 'inline-flex'
            )}
            aria-label={interactive ? `${i} étoile${i > 1 ? 's' : ''}` : undefined}
          >
            <Star
              className={cn(
                sizeMap[size],
                filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
              )}
            />
          </Comp>
        );
      })}
    </div>
  );
}
