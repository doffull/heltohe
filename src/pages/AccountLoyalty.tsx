import { Award, Star, Gift, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIERS = [
  { name: 'Bronze', points: 0, color: 'text-amber-600', benefits: ['5% de réduction anniversaire'] },
  { name: 'Silver', points: 500, color: 'text-gray-400', benefits: ['10% de réduction anniversaire', 'Livraison prioritaire'] },
  { name: 'Gold', points: 1500, color: 'text-yellow-500', benefits: ['15% de réduction anniversaire', 'Livraison gratuite', 'Accès ventes privées'] },
  { name: 'Platinum', points: 5000, color: 'text-cyan-400', benefits: ['20% de réduction anniversaire', 'Livraison express gratuite', 'Accès exclusif nouveautés', 'Support prioritaire'] },
];

export default function AccountLoyalty() {
  const currentPoints = 0;
  const currentTier = TIERS[0];
  const nextTier = TIERS[1];
  const pointsToNextTier = nextTier.points - currentPoints;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold hud-text mb-8">PROGRAMME FIDÉLITÉ</h1>

        {/* Current Status */}
        <div className="chamfer-hud-lg bg-gradient-to-r from-card/80 to-primary/10 p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-primary/20 rounded-full">
              <Award className="h-12 w-12 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">VOTRE NIVEAU ACTUEL</p>
              <h2 className={`text-4xl font-bold ${currentTier.color}`}>{currentTier.name.toUpperCase()}</h2>
              <p className="text-2xl font-bold mt-2">{currentPoints} <span className="text-sm font-normal text-muted-foreground">points</span></p>
            </div>
          </div>
          
          {nextTier && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Progression vers {nextTier.name}</span>
                <span>{pointsToNextTier} points restants</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(currentPoints / nextTier.points) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="chamfer-hud bg-card/50 p-6 text-center">
            <TrendingUp className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h3 className="font-bold hud-text mb-2">GAGNEZ DES POINTS</h3>
            <p className="text-sm text-muted-foreground">1€ dépensé = 1 point gagné sur toutes vos commandes</p>
          </div>
          <div className="chamfer-hud bg-card/50 p-6 text-center">
            <Star className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h3 className="font-bold hud-text mb-2">MONTEZ EN NIVEAU</h3>
            <p className="text-sm text-muted-foreground">Accédez à des avantages exclusifs en cumulant des points</p>
          </div>
          <div className="chamfer-hud bg-card/50 p-6 text-center">
            <Gift className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h3 className="font-bold hud-text mb-2">UTILISEZ VOS RÉCOMPENSES</h3>
            <p className="text-sm text-muted-foreground">Convertissez vos points en réductions et cadeaux</p>
          </div>
        </div>

        {/* Tiers */}
        <h2 className="text-2xl font-bold hud-text mb-6">NIVEAUX & AVANTAGES</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier, index) => (
            <div 
              key={tier.name}
              className={`chamfer-hud p-6 ${index === 0 ? 'bg-primary/10 border border-primary/30' : 'bg-card/50'}`}
            >
              <div className={`text-2xl font-bold ${tier.color} mb-2`}>{tier.name}</div>
              <p className="text-sm text-muted-foreground mb-4">{tier.points}+ points</p>
              <ul className="space-y-2">
                {tier.benefits.map((benefit, i) => (
                  <li key={i} className="text-xs flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
