import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Star, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useReviewStats } from '@/hooks/useProductReviews';
import ReviewStars from './ReviewStars';
import { cn } from '@/lib/utils';

interface Props {
  productId: string;
  productName: string;
  className?: string;
}

/**
 * Ligne "note + nombre d'avis + partage" placée sous le titre produit.
 * Le clic sur la note scrolle jusqu'à la section avis.
 */
export default function ProductRatingRow({ productId, productName, className }: Props) {
  const { data: stats } = useReviewStats(productId);
  const [copied, setCopied] = useState(false);
  const count = stats?.count ?? 0;
  const avg = stats?.average ?? 0;

  const goToReviews = () => {
    document.getElementById('avis-clients')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: productName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* annulé par l'utilisateur */
    }
  };

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <button
        type="button"
        onClick={goToReviews}
        className="group inline-flex items-center gap-2"
        aria-label="Voir les avis clients"
      >
        {count > 0 ? (
          <>
            <ReviewStars value={avg} size="sm" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors underline-offset-4 group-hover:underline">
              ({count} avis)
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            <Star className="h-3.5 w-3.5 text-yellow-400" />
            Soyez le premier à noter
          </span>
        )}
      </button>

      <motion.button
        type="button"
        onClick={share}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Partager ce produit"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Share2 className="h-4 w-4 text-sky-500" />
        )}
        Partager
      </motion.button>
    </div>
  );
}
