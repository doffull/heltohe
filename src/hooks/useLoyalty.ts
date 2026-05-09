import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export const TIERS: Array<{
  key: LoyaltyTier;
  label: string;
  minPoints: number;
  multiplier: number;
  benefits: string[];
}> = [
  { key: 'bronze', label: 'Bronze', minPoints: 0, multiplier: 1, benefits: ['1 point par 1€ dépensé', '5% de réduction anniversaire'] },
  { key: 'silver', label: 'Silver', minPoints: 500, multiplier: 1.5, benefits: ['1.5x les points', '10% de réduction anniversaire', 'Livraison prioritaire'] },
  { key: 'gold', label: 'Gold', minPoints: 1500, multiplier: 2, benefits: ['2x les points', '15% de réduction anniversaire', 'Livraison gratuite', 'Accès ventes privées'] },
  { key: 'platinum', label: 'Platinum', minPoints: 5000, multiplier: 3, benefits: ['3x les points', '20% de réduction anniversaire', 'Livraison express gratuite', 'Accès exclusif nouveautés', 'Support prioritaire'] },
];

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  value: number;
  is_active: boolean;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  order_id: string | null;
  type: string;
  points: number;
  description: string | null;
  created_at: string;
}

export function useLoyaltyRewards() {
  return useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });
      if (error) throw error;
      return (data || []) as LoyaltyReward[];
    },
  });
}

export function useMyLoyalty() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-loyalty', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: customer, error: cErr } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (cErr) throw cErr;

      let transactions: LoyaltyTransaction[] = [];
      if (customer) {
        const { data: tx, error: tErr } = await supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (tErr) throw tErr;
        transactions = (tx || []) as LoyaltyTransaction[];
      }

      const points = customer?.loyalty_points ?? 0;
      const tier = (customer?.loyalty_tier ?? 'bronze') as LoyaltyTier;
      const currentTier = TIERS.find((t) => t.key === tier) ?? TIERS[0];
      const currentIdx = TIERS.findIndex((t) => t.key === tier);
      const nextTier = TIERS[currentIdx + 1] ?? null;
      const progress = nextTier
        ? Math.min(100, Math.round(((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100))
        : 100;
      const pointsToNext = nextTier ? Math.max(0, nextTier.minPoints - points) : 0;

      return { customer, transactions, points, currentTier, nextTier, progress, pointsToNext };
    },
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { data, error } = await supabase.rpc('redeem_loyalty_reward', { p_reward_id: rewardId });
      if (error) throw error;
      const result = data as { success?: boolean; error?: string; code?: string; expiresAt?: string; rewardName?: string };
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-loyalty'] });
    },
  });
}
