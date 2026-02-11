import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerRecord {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  createdAt: string;
}

function dbToCustomer(db: Record<string, unknown>): CustomerRecord {
  return {
    id: db.id as string,
    userId: db.user_id as string,
    email: db.email as string,
    firstName: (db.first_name as string) || '',
    lastName: (db.last_name as string) || '',
    phone: (db.phone as string) || undefined,
    loyaltyPoints: (db.loyalty_points as number) || 0,
    loyaltyTier: (db.loyalty_tier as string) || 'bronze',
    totalSpent: Number(db.total_spent) || 0,
    createdAt: db.created_at as string,
  };
}

export function useCustomers() {
  return useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d) => dbToCustomer(d as Record<string, unknown>));
    },
  });
}

type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; loyalty_points?: number; loyalty_tier?: LoyaltyTier }) => {
      const { error } = await supabase.from('customers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-customers'] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-customers'] }),
  });
}

export function useBulkDeleteCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('customers').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-customers'] }),
  });
}
