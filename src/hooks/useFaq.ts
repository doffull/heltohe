import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
}

/** FAQ publique (uniquement les questions actives, dans l'ordre défini en admin). */
export function useFaq() {
  return useQuery({
    queryKey: ['faq-items'],
    queryFn: async (): Promise<FaqItem[]> => {
      const { data, error } = await supabase
        .from('faq_items')
        .select('id, question, answer, category, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as FaqItem[];
    },
    staleTime: 5 * 60_000,
  });
}
