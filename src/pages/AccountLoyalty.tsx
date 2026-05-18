import { useState } from 'react';
import { Award, Star, Gift, TrendingUp, Crown, Shield, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyLoyalty, useRedeemReward, useLoyaltyRewards, TIERS } from '@/hooks/useLoyalty';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TIER_ICONS = { bronze: Shield, silver: Star, gold: Award, platinum: Crown } as const;
const TIER_COLORS = {
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  platinum: 'text-purple-400',
} as const;

export default function AccountLoyalty() {
  const { data: loyalty, isLoading } = useMyLoyalty();
  const { data: rewards = [] } = useLoyaltyRewards();
  const redeem = useRedeemReward();
  const [lastCode, setLastCode] = useState<{ code: string; reward: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const points = loyalty?.points ?? 0;
  const currentTier = loyalty?.currentTier ?? TIERS[0];
  const nextTier = loyalty?.nextTier ?? null;
  const TierIcon = TIER_ICONS[currentTier.key];

  async function handleRedeem(rewardId: string, name: string, required: number) {
    if (points < required) {
      toast.error('Points insuffisants pour cette récompense');
      return;
    }
    try {
      const res = await redeem.mutateAsync(rewardId);
      if (res?.code) {
        setLastCode({ code: res.code, reward: name });
        toast.success(`Récompense échangée ! Code : ${res.code}`);
      }
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg === 'INSUFFICIENT_POINTS' ? 'Points insuffisants' : 'Échec de l\'échange');
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold hud-text mb-6 sm:mb-8 break-words">PROGRAMME FIDÉLITÉ</h1>

        {/* Current Status */}
        <div className="chamfer-hud-lg bg-gradient-to-r from-card/80 to-primary/10 p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="p-4 bg-primary/20 rounded-full">
              <TierIcon className={cn('h-12 w-12', TIER_COLORS[currentTier.key])} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">VOTRE NIVEAU ACTUEL</p>
              <h2 className={cn('text-3xl sm:text-4xl font-bold', TIER_COLORS[currentTier.key])}>
                {currentTier.label.toUpperCase()}
              </h2>
              <p className="text-2xl font-bold mt-2">
                {points} <span className="text-sm font-normal text-muted-foreground">points</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Multiplicateur ×{currentTier.multiplier}</p>
            </div>
          </div>

          {nextTier && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Progression vers {nextTier.label}</span>
                <span>{loyalty?.pointsToNext} points restants</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${loyalty?.progress ?? 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Last redeemed code */}
        {lastCode && (
          <div className="border border-primary bg-primary/5 p-4 mb-8 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Code généré pour {lastCode.reward}</p>
              <p className="font-mono text-lg font-bold truncate">{lastCode.code}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => copyCode(lastCode.code)}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
        )}

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="chamfer-hud bg-card/50 p-6 text-center">
            <TrendingUp className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h3 className="font-bold hud-text mb-2">GAGNEZ DES POINTS</h3>
            <p className="text-sm text-muted-foreground">1€ dépensé = 1 point gagné. Multiplié par votre palier.</p>
          </div>
          <div className="chamfer-hud bg-card/50 p-6 text-center">
            <Star className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h3 className="font-bold hud-text mb-2">MONTEZ EN NIVEAU</h3>
            <p className="text-sm text-muted-foreground">Atteignez Silver, Gold ou Platinum pour plus d'avantages.</p>
          </div>
          <div className="chamfer-hud bg-card/50 p-6 text-center">
            <Gift className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h3 className="font-bold hud-text mb-2">ÉCHANGEZ VOS POINTS</h3>
            <p className="text-sm text-muted-foreground">Convertissez vos points en codes promo valables 90 jours.</p>
          </div>
        </div>

        {/* Rewards */}
        <h2 className="text-2xl font-bold hud-text mb-6">RÉCOMPENSES DISPONIBLES</h2>
        {rewards.length === 0 ? (
          <p className="text-muted-foreground mb-8">Aucune récompense disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {rewards.map((r) => {
              const canRedeem = points >= r.points_required;
              return (
                <div key={r.id} className="chamfer-hud bg-card/50 p-6 flex flex-col">
                  <Gift className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-bold uppercase text-sm tracking-wider mb-1">{r.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3 flex-1 min-h-[32px]">{r.description}</p>
                  <p className="text-lg font-bold text-primary mb-3">{r.points_required} pts</p>
                  <Button
                    size="sm"
                    disabled={!canRedeem || redeem.isPending}
                    onClick={() => handleRedeem(r.id, r.name, r.points_required)}
                    className="w-full uppercase tracking-wider"
                  >
                    {canRedeem ? 'Échanger' : `Manque ${r.points_required - points} pts`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tiers */}
        <h2 className="text-2xl font-bold hud-text mb-6">NIVEAUX & AVANTAGES</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {TIERS.map((tier) => {
            const Icon = TIER_ICONS[tier.key];
            const isCurrent = tier.key === currentTier.key;
            return (
              <div
                key={tier.key}
                className={cn(
                  'chamfer-hud p-6',
                  isCurrent ? 'bg-primary/10 border border-primary/30' : 'bg-card/50'
                )}
              >
                <Icon className={cn('h-6 w-6 mb-2', TIER_COLORS[tier.key])} />
                <div className={cn('text-2xl font-bold mb-1', TIER_COLORS[tier.key])}>{tier.label}</div>
                <p className="text-sm text-muted-foreground mb-4">{tier.minPoints}+ points · ×{tier.multiplier}</p>
                <ul className="space-y-2">
                  {tier.benefits.map((b) => (
                    <li key={b} className="text-xs flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
                {isCurrent && (
                  <span className="inline-block mt-3 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 uppercase font-bold">
                    Votre palier
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* History */}
        <h2 className="text-2xl font-bold hud-text mb-6">HISTORIQUE</h2>
        {(loyalty?.transactions.length ?? 0) === 0 ? (
          <p className="text-muted-foreground">Aucune transaction pour le moment. Passez votre première commande pour gagner des points !</p>
        ) : (
          <div className="border border-border bg-card/30 divide-y divide-border">
            {loyalty!.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.created_at), 'd MMM yyyy, HH:mm', { locale: fr })}
                  </p>
                </div>
                <span
                  className={cn(
                    'font-mono font-bold text-sm shrink-0',
                    tx.points >= 0 ? 'text-primary' : 'text-destructive'
                  )}
                >
                  {tx.points > 0 ? '+' : ''}
                  {tx.points} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
