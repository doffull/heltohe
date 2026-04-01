import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCustomers } from '@/hooks/useCustomers';
import { Award, Crown, Gem, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TIERS = [
  { key: 'bronze', label: 'Bronze', icon: Shield, points: 0, benefit: '1x les points', color: 'text-amber-700' },
  { key: 'silver', label: 'Silver', icon: Star, points: 500, benefit: '1.5x les points', color: 'text-slate-400' },
  { key: 'gold', label: 'Gold', icon: Award, points: 1500, benefit: '2x les points + livraison offerte', color: 'text-yellow-500' },
  { key: 'platinum', label: 'Platinum', icon: Crown, points: 5000, benefit: '3x les points + accès VIP', color: 'text-purple-400' },
];

export function LoyaltyBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: customers = [] } = useCustomers();

  const customer = user ? customers.find((c) => c.userId === user.id) : null;
  const currentTier = customer?.loyaltyTier || 'bronze';
  const currentPoints = customer?.loyaltyPoints || 0;

  return (
    <section className="py-8 lg:py-16">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border border-border p-6 lg:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Gem className="h-5 w-5 text-primary" />
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">// PROGRAMME FIDÉLITÉ</p>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight mb-2">
              Gagnez des points à chaque achat
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">
              Cumulez des points de fidélité et débloquez des avantages exclusifs à chaque palier.
            </p>
          </div>

          {/* Tiers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isActive = currentTier === tier.key && user;
              return (
                <div
                  key={tier.key}
                  className={cn(
                    'p-4 border text-center transition-all',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card/50'
                  )}
                >
                  <Icon className={cn('h-6 w-6 mx-auto mb-2', tier.color)} />
                  <h3 className="font-bold uppercase text-sm tracking-wider">{tier.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{tier.points} pts</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{tier.benefit}</p>
                  {isActive && (
                    <span className="inline-block mt-2 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 uppercase font-bold">
                      Votre palier
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* User points or CTA */}
          <div className="text-center">
            {user && customer ? (
              <div className="space-y-2">
                <p className="text-lg font-bold">
                  Vous avez <span className="text-primary">{currentPoints}</span> points
                </p>
                <Button variant="outline" className="uppercase tracking-wider" onClick={() => navigate('/compte/fidelite')}>
                  Voir mes récompenses
                </Button>
              </div>
            ) : (
              <Button className="uppercase tracking-wider" onClick={() => navigate('/auth')}>
                Rejoindre le programme
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
