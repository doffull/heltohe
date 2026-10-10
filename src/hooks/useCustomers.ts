import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerRecord {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
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
    address: (db.address as string) || undefined,
    city: (db.city as string) || undefined,
    zip: (db.zip as string) || undefined,
    country: (db.country as string) || undefined,
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
      // Supabase REST caps responses (often at 1,000 rows): fetch every page.
      const pageSize = 1000;
      const all: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        all.push(...((data || []) as Record<string, unknown>[]));
        if (!data || data.length < pageSize) break;
      }
      return all.map(dbToCustomer);
    },
  });
}

type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface CustomerUpdate {
  id: string;
  loyalty_points?: number;
  loyalty_tier?: LoyaltyTier;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CustomerUpdate) => {
      const { error } = await supabase.from('customers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-customers'] }),
  });
}

/** Historique des e-mails transactionnels envoyés à un client. */
export function useCustomerEmailLog(email?: string) {
  return useQuery({
    queryKey: ['customer-email-log', email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_email_log')
        .select('*')
        .eq('customer_email', email!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
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
