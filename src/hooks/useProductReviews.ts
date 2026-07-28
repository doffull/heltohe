import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  is_verified_purchase: boolean;
  size_purchased: string | null;
  admin_reply: string | null;
  admin_reply_at: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
}

export interface ReviewStats {
  count: number;
  average: number;
  distribution: Record<string, number>;
}

export function useReviewStats(productId?: string) {
  return useQuery({
    queryKey: ['review-stats', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async (): Promise<ReviewStats> => {
      const { data, error } = await supabase.rpc('get_product_review_stats', {
        p_product_id: productId!,
      });
      if (error) throw error;
      return (data as any) ?? { count: 0, average: 0, distribution: {} };
    },
  });
}

export function useProductReviews(productId?: string) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    enabled: !!productId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId!)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Fetch author names from customers
      const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      let names: Record<string, string> = {};
      if (userIds.length) {
        const { data: custs } = await supabase
          .from('customers')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);
        (custs ?? []).forEach((c: any) => {
          const n = [c.first_name, c.last_name?.[0]].filter(Boolean).join(' ');
          names[c.user_id] = n || 'Client vérifié';
        });
      }
      return (data ?? []).map((r: any) => ({
        ...r,
        author_name: names[r.user_id] ?? 'Client vérifié',
      })) as ProductReview[];
    },
  });
}

export function useReviewEligibility(productId?: string) {
  return useQuery({
    queryKey: ['review-eligibility', productId],
    enabled: !!productId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('can_user_review_product', {
        p_product_id: productId!,
      });
      if (error) throw error;
      return data as { eligible: boolean; reason?: string; orderId?: string; size?: string };
    },
  });
}

export function useSubmitReview(productId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rating: number; title?: string; comment: string }) => {
      const { data, error } = await supabase.rpc('submit_product_review', {
        p_product_id: productId!,
        p_rating: input.rating,
        p_title: input.title ?? null,
        p_comment: input.comment,
      });
      if (error) throw error;
      const res = data as any;
      if (res?.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-reviews', productId] });
      qc.invalidateQueries({ queryKey: ['review-stats', productId] });
      qc.invalidateQueries({ queryKey: ['review-eligibility', productId] });
    },
  });
}

export function useVoteHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data, error } = await supabase.rpc('vote_review_helpful', { p_review_id: reviewId });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, _v) => {
      qc.invalidateQueries({ queryKey: ['product-reviews'] });
    },
  });
}
