import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  firstName?: string;
  isSubscribed: boolean;
  subscribedAt: string;
}

function dbToSub(db: Record<string, unknown>): NewsletterSubscriber {
  return {
    id: db.id as string,
    email: db.email as string,
    firstName: (db.first_name as string) || undefined,
    isSubscribed: db.is_subscribed as boolean,
    subscribedAt: db.subscribed_at as string,
  };
}

export function useNewsletters() {
  return useQuery({
    queryKey: ['admin-newsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .order('subscribed_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d) => dbToSub(d as Record<string, unknown>));
    },
  });
}

export function useDeleteNewsletter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('newsletters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-newsletters'] }),
  });
}
