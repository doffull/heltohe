import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  compact?: boolean;
  /** `subtle` = simple ligne de texte discrète (vignettes, fiche produit). */
  variant?: 'default' | 'subtle';
}

/** Mention légale obligatoire pour les articles enfant : ni repris ni échangés. */
export default function KidsNoReturnNotice({ className, compact, variant = 'default' }: Props) {
  if (variant === 'subtle') {
    return (
      <p
        role="note"
        className={cn(
          'mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80 leading-snug',
          className
        )}
      >
        Article enfant · ni repris ni échangé
      </p>
    );
  }


  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 border border-destructive/60 bg-destructive/10 px-3 py-2',
        className
      )}
    >
      <AlertTriangle className={cn('shrink-0 text-destructive', compact ? 'h-3.5 w-3.5 mt-px' : 'h-4 w-4 mt-0.5')} />
      <p
        className={cn(
          'font-bold uppercase tracking-wide text-destructive',
          compact ? 'text-[10px] leading-snug' : 'text-xs md:text-sm'
        )}
      >
        Article enfant : ni repris ni échangé
      </p>
    </div>
  );
}
