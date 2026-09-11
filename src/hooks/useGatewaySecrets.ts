import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

export interface GatewaySecretStatus {
  gateway: string;
  last4: string | null;
  updated_at: string;
}

/** Statut (masqué) des clés secrètes stockées côté serveur. Jamais la valeur. */
export function useGatewaySecrets() {
  return useQuery({
    queryKey: ['payment_gateway_secrets'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('payment-keys', {
        body: { action: 'status' },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      return ((data as any)?.secrets ?? []) as GatewaySecretStatus[];
    },
    staleTime: 1000 * 30,
  });
}

export function useSaveGatewaySecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gateway, secretKey }: { gateway: string; secretKey: string }) => {
      const { data, error } = await supabase.functions.invoke('payment-keys', {
        body: { action: 'set', gateway, secretKey },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment_gateway_secrets'] }),
  });
}

export function useDeleteGatewaySecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gateway: string) => {
      const { data, error } = await supabase.functions.invoke('payment-keys', {
        body: { action: 'delete', gateway },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment_gateway_secrets'] }),
  });
}
