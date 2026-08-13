import { useEffect, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import TrustpilotWidget from '@/components/TrustpilotWidget';

interface FooterReviewRow {
  id: string;
  rating: number;
  comment: string;
  title: string | null;
  created_at: string;
}

interface Props {
  title?: string;
  text?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  showTrustpilot?: boolean;
  centered?: boolean;
  headingClassName?: string;
  scaleClassName?: string;
  borderStyle?: React.CSSProperties;
  className?: string;
}

const Stars = ({ value }: { value: number }) => (
  <span className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} sur 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={cn('h-3.5 w-3.5', i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'opacity-30')}
      />
    ))}
  </span>
);

export default function FooterReviews({
  title,
  text,
  ctaLabel,
  ctaUrl,
  showTrustpilot,
  centered,
  headingClassName,
  scaleClassName,
  borderStyle,
  className,
}: Props) {
  const [reviews, setReviews] = useState<FooterReviewRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('product_reviews')
        .select('id, rating, comment, title, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(3);
      if (alive && data) setReviews(data as FooterReviewRow[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const average = reviews.length
    ? reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <div className={cn(centered && 'text-center', className)}>
      <h4 className={headingClassName}>{title || 'Avis clients'}</h4>

      {reviews.length > 0 && (
        <div className={cn('mb-3 flex items-center gap-2', centered && 'justify-center')}>
          <Stars value={average} />
          <span className="text-xs opacity-70">{average.toFixed(1)} / 5</span>
        </div>
      )}

      <p className={cn(scaleClassName, 'opacity-70 leading-relaxed')}>
        {text || 'Ils ont adopté nos pièces. Découvrez leurs retours vérifiés.'}
      </p>

      {reviews.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reviews.map((r) => (
            <li
              key={r.id}
              style={borderStyle}
              className="border p-3 text-xs leading-relaxed opacity-80 chamfer-hud-sm"
            >
              <div className={cn('mb-1 flex items-center gap-2', centered && 'justify-center')}>
                <Quote className="h-3 w-3 opacity-50" />
                <Stars value={r.rating} />
              </div>
              <p className="line-clamp-3">{r.title ? `${r.title} — ` : ''}{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {ctaLabel !== '' && (
        <Link
          to={ctaUrl || '/boutique'}
          className="footer-link mt-4 inline-block text-xs font-bold uppercase tracking-wider transition-colors"
        >
          {ctaLabel || 'Voir tous les avis'}
        </Link>
      )}

      {showTrustpilot && (
        <div className="mt-4">
          <TrustpilotWidget variant="micro" />
        </div>
      )}
    </div>
  );
}
