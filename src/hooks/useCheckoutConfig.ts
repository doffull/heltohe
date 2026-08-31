import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentMethod {
  key: string;
  label: string;
  enabled: boolean;
  publicKey?: string;
  configured?: boolean;
  description?: string;
  docUrl?: string;
  icon?: string;
}

export interface RelayMapSettings {
  markerColor: string;
  selectedMarkerColor: string;
  tileStyle: 'standard' | 'light' | 'dark';
  defaultZoom: number;
  searchRadius: number;
}

export const DEFAULT_RELAY_MAP_SETTINGS: RelayMapSettings = {
  markerColor: '#3B82F6',
  selectedMarkerColor: '#EF4444',
  tileStyle: 'standard',
  defaultZoom: 13,
  searchRadius: 10,
};

export const PAYMENT_GATEWAYS: PaymentMethod[] = [
  { key: 'stripe', label: 'Stripe', enabled: false, configured: false, publicKey: '', description: 'Cartes, Apple Pay, Google Pay', docUrl: 'https://stripe.com/docs', icon: '💳' },
  { key: 'payplug', label: 'PayPlug', enabled: false, configured: false, publicKey: '', description: 'Solution française, cartes bancaires', docUrl: 'https://docs.payplug.com', icon: '🇫🇷' },
  { key: 'mollie', label: 'Mollie', enabled: false, configured: false, publicKey: '', description: 'CB, iDEAL, Bancontact, etc.', docUrl: 'https://docs.mollie.com', icon: '🔄' },
  { key: 'klarna', label: 'Klarna', enabled: false, configured: false, publicKey: '', description: 'Paiement en 3x/4x, pay later', docUrl: 'https://docs.klarna.com', icon: '🛍️' },
  { key: 'paypal', label: 'PayPal', enabled: false, configured: false, publicKey: '', description: 'Paiement en ligne classique', docUrl: 'https://developer.paypal.com', icon: '🅿️' },
  { key: 'bank_transfer', label: 'Virement bancaire', enabled: true, configured: true, publicKey: '', description: 'Paiement manuel par virement', icon: '🏦' },
];

export interface CheckoutConfig {
  id?: string;
  shippingHomePrice: number;
  shippingRelayPrice: number;
  freeShippingThreshold: number;
  /** Si vrai : la livraison gratuite ne s'applique qu'en point relais (domicile toujours payant). */
  freeShippingRelayOnly: boolean;
  homeDeliveryEnabled: boolean;
  relayEnabled: boolean;
  paymentMethods: PaymentMethod[];
  checkoutMessage: string;
  relayMapSettings: RelayMapSettings;
}

const DEFAULT_CONFIG: CheckoutConfig = {
  shippingHomePrice: 15,
  shippingRelayPrice: 4.5,
  freeShippingThreshold: 99,
  freeShippingRelayOnly: true,
  homeDeliveryEnabled: true,
  relayEnabled: true,
  paymentMethods: PAYMENT_GATEWAYS,
  checkoutMessage: '',
  relayMapSettings: DEFAULT_RELAY_MAP_SETTINGS,
};

/**
 * Frais de port appliqués partout (panier, checkout) — miroir de la RPC
 * `validate_and_create_order` côté serveur.
 */
export function computeShippingCost(
  config: CheckoutConfig | undefined,
  subtotal: number,
  mode: 'home' | 'relay',
): number {
  const cfg = config ?? DEFAULT_CONFIG;
  const base = mode === 'relay' ? cfg.shippingRelayPrice : cfg.shippingHomePrice;
  const eligible = subtotal >= cfg.freeShippingThreshold;
  if (!eligible) return base;
  if (cfg.freeShippingRelayOnly && mode === 'home') return base;
  return 0;
}

function mergePaymentMethods(saved: PaymentMethod[] | null): PaymentMethod[] {
  const base = PAYMENT_GATEWAYS.map(gw => ({ ...gw }));
  if (!saved || !Array.isArray(saved)) return base;
  const savedMap = new Map(saved.map(pm => [pm.key, pm]));
  return base.map(gw => {
    const s = savedMap.get(gw.key);
    if (s) return { ...gw, ...s, description: gw.description, docUrl: gw.docUrl, icon: gw.icon };
    return gw;
  });
}

function dbToConfig(db: Record<string, unknown>): CheckoutConfig {
  return {
    id: db.id as string,
    shippingHomePrice: Number(db.shipping_home_price) || 15,
    shippingRelayPrice: Number(db.shipping_relay_price) || 4.5,
    freeShippingThreshold: Number(db.free_shipping_threshold) || 99,
    freeShippingRelayOnly: db.free_shipping_relay_only as boolean ?? true,
    homeDeliveryEnabled: db.home_delivery_enabled as boolean ?? true,
    relayEnabled: db.relay_enabled as boolean ?? true,
    paymentMethods: mergePaymentMethods(db.payment_methods as PaymentMethod[] | null),
    checkoutMessage: (db.checkout_message as string) || '',
    relayMapSettings: (db.relay_map_settings as RelayMapSettings) || DEFAULT_RELAY_MAP_SETTINGS,
  };
}


export function useCheckoutConfig() {
  return useQuery({
    queryKey: ['checkout_config'],
    queryFn: async () => {
      // Public storefront reads a sanitized view (no gateway keys / internal flags)
      const { data, error } = await supabase
        .from('checkout_config_public')
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

/** Admin-only: full config including gateway public keys (requires admin role via RLS). */
export function useCheckoutConfigAdmin() {
  return useQuery({
    queryKey: ['checkout_config_admin'],
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
    staleTime: 0,
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
        relay_map_settings: config.relayMapSettings as unknown,
      };
      const { error } = await supabase
        .from('checkout_config')
        .upsert(payload as any, { onConflict: 'config_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout_config'] });
      queryClient.invalidateQueries({ queryKey: ['checkout_config_admin'] });
    },
  });
}

/** Met à jour uniquement les réglages de la carte (n'écrase pas les passerelles). */
export function useSaveRelayMapSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (relayMapSettings: RelayMapSettings) => {
      const { error } = await supabase
        .from('checkout_config')
        .update({ relay_map_settings: relayMapSettings as unknown } as any)
        .eq('config_key', 'main');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout_config'] });
      queryClient.invalidateQueries({ queryKey: ['checkout_config_admin'] });
    },
  });
}
