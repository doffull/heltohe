import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BadgeCheck, MessageSquare, ThumbsUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReviewStars from './ReviewStars';
import {
  useProductReviews,
  useReviewStats,
  useReviewEligibility,
  useSubmitReview,
  useVoteHelpful,
} from '@/hooks/useProductReviews';
import { cn } from '@/lib/utils';

interface Props {
  productId: string;
  productName: string;
}

type SortMode = 'recent' | 'best' | 'worst' | 'helpful';

export default function ProductReviews({ productId, productName }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: stats } = useReviewStats(productId);
  const { data: reviews = [], isLoading } = useProductReviews(productId);
  const { data: eligibility } = useReviewEligibility(productId);
  const submit = useSubmitReview(productId);
  const vote = useVoteHelpful();

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [filterStar, setFilterStar] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (filterStar) list = list.filter((r) => r.rating === filterStar);
    list.sort((a, b) => {
      if (sort === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'best') return b.rating - a.rating;
      if (sort === 'worst') return a.rating - b.rating;
      return b.helpful_count - a.helpful_count;
    });
    return list;
  }, [reviews, sort, filterStar]);

  const openForm = () => {
    if (!user) {
      toast({ title: 'Connectez-vous', description: 'Vous devez être connecté pour laisser un avis.' });
      navigate('/auth');
      return;
    }
    if (!eligibility?.eligible) {
      const reason = eligibility?.reason;
      if (reason === 'ALREADY_REVIEWED') {
        toast({ title: 'Déjà noté', description: 'Vous avez déjà laissé un avis pour ce produit.' });
      } else {
        toast({
          title: 'Achat requis',
          description: 'Les avis sont réservés aux clients ayant reçu ce produit.',
        });
      }
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (comment.trim().length < 10) {
      toast({ title: 'Commentaire trop court', description: 'Merci de rédiger au moins 10 caractères.', variant: 'destructive' });
      return;
    }
    try {
      const res = await submit.mutateAsync({ rating, title: title.trim() || undefined, comment: comment.trim() });
      toast({
        title: 'Merci !',
        description: res.status === 'approved' ? 'Votre avis est publié.' : 'Votre avis sera publié après modération.',
      });
      setOpen(false);
      setTitle('');
      setComment('');
      setRating(5);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message ?? 'Impossible d\'envoyer votre avis.', variant: 'destructive' });
    }
  };

  const count = stats?.count ?? 0;
  const avg = stats?.average ?? 0;
  const dist = stats?.distribution ?? {};

  return (
    <section className="mt-16 pt-10 border-t border-border/40">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold hud-text uppercase tracking-tight">Avis clients</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Uniquement les acheteurs vérifiés peuvent noter ce produit.
          </p>
        </div>
        <Button onClick={openForm} className="self-start md:self-auto">
          <MessageSquare className="h-4 w-4 mr-2" />
          Laisser un avis
        </Button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-[240px_1fr] gap-8 mb-10">
        <div className="chamfer-hud bg-card/40 p-6 text-center">
          <div className="text-5xl font-bold">{avg.toFixed(1)}</div>
          <ReviewStars value={avg} size="md" className="justify-center mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {count} avis
          </p>
        </div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = (dist[String(n)] as number | undefined) ?? 0;
            const pct = count ? (c / count) * 100 : 0;
            const active = filterStar === n;
            return (
              <button
                key={n}
                onClick={() => setFilterStar(active ? null : n)}
                className={cn(
                  'flex items-center gap-3 w-full text-left group',
                  active && 'font-semibold'
                )}
              >
                <span className="text-xs w-8 tabular-nums">{n} ★</span>
                <div className="flex-1 h-2 bg-muted rounded-sm overflow-hidden">
                  <div className="h-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs w-10 text-right tabular-nums text-muted-foreground">{c}</span>
              </button>
            );
          })}
          {filterStar !== null && (
            <button className="text-xs text-primary underline mt-2" onClick={() => setFilterStar(null)}>
              Retirer le filtre
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Trier :</span>
        {(['recent', 'best', 'worst', 'helpful'] as SortMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setSort(m)}
            className={cn(
              'text-xs px-3 py-1 border transition-colors',
              sort === m ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground/60'
            )}
          >
            {m === 'recent' && 'Plus récents'}
            {m === 'best' && 'Mieux notés'}
            {m === 'worst' && 'Moins bien notés'}
            {m === 'helpful' && 'Plus utiles'}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun avis pour le moment.</p>
          <p className="text-sm mt-1">Soyez le premier à partager votre expérience !</p>
        </div>
      ) : (
        <ul className="space-y-6">
          {filtered.map((r) => (
            <li key={r.id} className="chamfer-hud bg-card/30 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <ReviewStars value={r.rating} size="sm" />
                  {r.title && <h3 className="font-bold text-sm">{r.title}</h3>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                <span className="font-medium text-foreground">{r.author_name}</span>
                {r.is_verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Achat vérifié
                  </span>
                )}
                {r.size_purchased && <span>· Taille {r.size_purchased}</span>}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.comment}</p>

              {r.admin_reply && (
                <div className="mt-4 border-l-2 border-primary/60 pl-4 py-2 bg-primary/5">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                    Réponse de la boutique
                  </p>
                  <p className="text-sm">{r.admin_reply}</p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-4">
                <button
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    if (!user) {
                      navigate('/auth');
                      return;
                    }
                    vote.mutate(r.id);
                  }}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Utile ({r.helpful_count})
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Submit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Votre avis sur {productName}</DialogTitle>
            <DialogDescription>
              Merci de partager votre expérience. Votre avis aide les autres clients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block">Note</label>
              <ReviewStars value={rating} size="lg" onChange={setRating} />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block">Titre (facultatif)</label>
              <Input
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Coupe parfaite, matière premium"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block">Votre avis</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Qu'avez-vous pensé du produit, de la taille, de la qualité ?"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/2000</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publier mon avis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
