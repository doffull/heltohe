import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentMethod {
  key: string;
  label: string;
  enabled: boolean;
}

export interface CheckoutConfig {
  id?: string;
  shippingHomePrice: number;
  shippingRelayPrice: number;
  freeShippingThreshold: number;
  homeDeliveryEnabled: boolean;
  relayEnabled: boolean;
  paymentMethods: PaymentMethod[];
  checkoutMessage: string;
}

const DEFAULT_CONFIG: CheckoutConfig = {
  shippingHomePrice: 6.5,
  shippingRelayPrice: 4.5,
  freeShippingThreshold: 200,
  homeDeliveryEnabled: true,
  relayEnabled: true,
  paymentMethods: [
    { key: 'bank_transfer', label: 'Virement bancaire', enabled: true },
    { key: 'check', label: 'Chèque', enabled: false },
  ],
  checkoutMessage: '',
};

function dbToConfig(db: Record<string, unknown>): CheckoutConfig {
  return {
    id: db.id as string,
    shippingHomePrice: Number(db.shipping_home_price) || 6.5,
    shippingRelayPrice: Number(db.shipping_relay_price) || 4.5,
    freeShippingThreshold: Number(db.free_shipping_threshold) || 200,
    homeDeliveryEnabled: db.home_delivery_enabled as boolean ?? true,
    relayEnabled: db.relay_enabled as boolean ?? true,
    paymentMethods: (db.payment_methods as PaymentMethod[]) || DEFAULT_CONFIG.paymentMethods,
    checkoutMessage: (db.checkout_message as string) || '',
  };
}

export function useCheckoutConfig() {
  return useQuery({
    queryKey: ['checkout_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkout_config')
        .select('*')
        .eq('config_key', 'main')
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_CONFIG;
      return dbToConfig(data as Record<string, unknown>);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveCheckoutConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: CheckoutConfig) => {
      const payload = {
        config_key: 'main',
        shipping_home_price: config.shippingHomePrice,
        shipping_relay_price: config.shippingRelayPrice,
        free_shipping_threshold: config.freeShippingThreshold,
        home_delivery_enabled: config.homeDeliveryEnabled,
        relay_enabled: config.relayEnabled,
        payment_methods: config.paymentMethods as unknown,
        checkout_message: config.checkoutMessage,
      };
      const { error } = await supabase
        .from('checkout_config')
        .upsert(payload, { onConflict: 'config_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout_config'] });
    },
  });
}
