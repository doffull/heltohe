import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Crown, Gem, Shield, Star, TrendingUp, Gift, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useLoyaltyRewards, TIERS } from '@/hooks/useLoyalty';
import { cn } from '@/lib/utils';

const TIER_ICONS = { bronze: Shield, silver: Star, gold: Award, platinum: Crown } as const;
const TIER_COLORS = {
  bronze: 'text-amber-700',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  platinum: 'text-purple-400',
} as const;

export default function Fidelite() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rewards = [] } = useLoyaltyRewards();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Programme Fidélité — Gagnez des points à chaque achat';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = meta?.content ?? '';
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content =
      'Rejoignez notre programme fidélité : cumulez des points, débloquez des paliers Bronze, Silver, Gold et Platinum, et échangez vos points contre des réductions exclusives.';
    return () => {
      document.title = prevTitle;
      if (meta && prevDesc) meta.content = prevDesc;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 lg:py-24 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Gem className="h-5 w-5 text-primary" />
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">// PROGRAMME FIDÉLITÉ</p>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight mb-4">
            Chaque achat compte
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Cumulez des points à chaque commande, montez en palier et échangez vos points contre des récompenses exclusives.
          </p>
          {user ? (
            <Button size="lg" className="uppercase tracking-wider" onClick={() => navigate('/compte/fidelite')}>
              Voir mes points
            </Button>
          ) : (
            <Button size="lg" className="uppercase tracking-wider" onClick={() => navigate('/auth')}>
              Créer mon compte
            </Button>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-center mb-10">Comment ça marche</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: TrendingUp, title: '01 — Commandez', text: '1€ dépensé = 1 point gagné. Multiplicateur selon votre palier.' },
            { icon: Star, title: '02 — Cumulez', text: 'Atteignez de nouveaux paliers et débloquez plus d\'avantages.' },
            { icon: Gift, title: '03 — Échangez', text: 'Convertissez vos points en codes promo, livraison offerte ou réductions.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="border border-border bg-card/50 p-6">
              <Icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-bold uppercase tracking-wider mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-center mb-10">Les paliers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((tier) => {
              const Icon = TIER_ICONS[tier.key];
              return (
                <div key={tier.key} className="border border-border bg-card p-6 flex flex-col">
                  <Icon className={cn('h-8 w-8 mb-3', TIER_COLORS[tier.key])} />
                  <h3 className="text-lg font-bold uppercase tracking-wider">{tier.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">{tier.minPoints}+ points</p>
                  <ul className="space-y-2 text-sm">
                    {tier.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Rewards catalogue */}
      {rewards.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-center mb-10">Récompenses à échanger</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rewards.map((r) => (
              <div key={r.id} className="border border-border bg-card p-6 text-center">
                <Gift className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold uppercase text-sm tracking-wider mb-2">{r.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 min-h-[32px]">{r.description}</p>
                <p className="text-xl font-bold text-primary">{r.points_required} pts</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-6">
            {[
              { q: 'Comment je gagne des points ?', a: 'Vous gagnez 1 point par euro dépensé sur vos commandes (montant hors livraison). Le multiplicateur de votre palier est appliqué automatiquement.' },
              { q: 'Quand mes points sont-ils crédités ?', a: 'Dès que votre commande est marquée comme payée ou expédiée, vos points sont automatiquement ajoutés à votre compte.' },
              { q: 'Comment échanger mes points ?', a: 'Rendez-vous dans votre espace fidélité, choisissez une récompense, et un code promo unique vous sera généré (valable 90 jours).' },
              { q: 'Mes points expirent-ils ?', a: 'Non, vos points restent valides tant que votre compte est actif.' },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border pb-4">
                <h3 className="font-bold mb-2">{q}</h3>
                <p className="text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-4">Prêt à commencer ?</h2>
        {user ? (
          <Button size="lg" className="uppercase tracking-wider" onClick={() => navigate('/compte/fidelite')}>
            Accéder à mon espace fidélité
          </Button>
        ) : (
          <Button size="lg" className="uppercase tracking-wider" onClick={() => navigate('/auth')}>
            Rejoindre le programme
          </Button>
        )}
      </section>
    </div>
  );
}
