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

/** Seules passerelles supportées : PayPlug (CB françaises) et PayPal. */
export const PAYMENT_GATEWAYS: PaymentMethod[] = [
  { key: 'payplug', label: 'PayPlug', enabled: false, configured: false, description: 'Cartes bancaires 3-D Secure, solution française', docUrl: 'https://docs.payplug.com', icon: '🇫🇷' },
  { key: 'paypal', label: 'PayPal', enabled: false, configured: false, publicKey: '', description: 'Paiement en ligne classique', docUrl: 'https://developer.paypal.com', icon: '🅿️' },
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
  /** Génère l'étiquette Colissimo automatiquement dès que la commande est payée. */
  autoColissimoLabel: boolean;
  /**
   * Forfait unique appliqué dès que la destination n'est pas la France.
   * Remplace les frais de port — il ne s'y ajoute pas — et ignore le franco.
   */
  internationalShippingPrice: number;
}

/** Libellé affiché à la cliente pour le forfait international.
 *
 * ⚠️ Ne pas écrire « frais de douane » : sans déclaration DDP, le transporteur
 * réclamera malgré tout les droits réels à la réception. Le mot « douane »
 * laisserait croire qu'ils sont déjà réglés, et la cliente aurait le sentiment
 * de payer deux fois. Arbitrage du 14/09/2026 (COLISSIMO_ARBITRAGE.md, P6).
 */
export const INTERNATIONAL_SHIPPING_LABEL = "Supplément d'expédition internationale";

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
  autoColissimoLabel: true,
  internationalShippingPrice: 40,
};

/**
 * Frais de port appliqués partout (panier, checkout) — miroir de la RPC
 * `validate_and_create_order` côté serveur.
 *
 * ⚠️ Les deux implémentations doivent donner le même résultat, sinon le montant
 * affiché et le montant enregistré divergent. Toute modification ici doit être
 * reportée dans la RPC, et réciproquement.
 *
 * Règle hors France (arbitrage du 14/09/2026) : forfait unique, identique pour
 * tous les pays, qui **remplace** les frais de port et **ignore le franco** —
 * un envoi en Suisse coûte bien plus que les 15 € du tarif France, et l'offrir
 * au-delà de 99 € revenait à vendre à perte.
 */
export function computeShippingCost(
  config: CheckoutConfig | undefined,
  subtotal: number,
  mode: 'home' | 'relay',
  country: string = 'FR',
): number {
  const cfg = config ?? DEFAULT_CONFIG;

  if (String(country || 'FR').toUpperCase() !== 'FR') {
    return cfg.internationalShippingPrice;
  }

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
    autoColissimoLabel: db.auto_colissimo_label as boolean ?? true,
    // `|| 40` et non `?? 40` : une colonne absente (vue pas encore migrée) comme
    // une valeur nulle doivent retomber sur le forfait par défaut.
    internationalShippingPrice: Number(db.international_shipping_price) || 40,
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
    refetchOnWindowFocus: false,
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
        free_shipping_relay_only: config.freeShippingRelayOnly,

        free_shipping_threshold: config.freeShippingThreshold,
        home_delivery_enabled: config.homeDeliveryEnabled,
        relay_enabled: config.relayEnabled,
        payment_methods: config.paymentMethods as unknown,
        checkout_message: config.checkoutMessage,
        relay_map_settings: config.relayMapSettings as unknown,
        auto_colissimo_label: config.autoColissimoLabel,
        international_shipping_price: config.internationalShippingPrice,
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
