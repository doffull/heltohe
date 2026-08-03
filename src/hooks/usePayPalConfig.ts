import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PayPalButtonStyle {
  layout: 'vertical' | 'horizontal';
  color: 'gold' | 'blue' | 'silver' | 'white' | 'black';
  shape: 'rect' | 'pill' | 'sharp';
  label: 'paypal' | 'checkout' | 'buynow' | 'pay';
  height: number;
  tagline: boolean;
}

export interface PayPalMessagingPlacements {
  product: boolean;
  cart: boolean;
  checkout: boolean;
  home: boolean;
}

export interface PayPalConfig {
  id?: string;
  environment: 'sandbox' | 'live';
  clientIdSandbox: string;
  clientIdLive: string;
  enabled: boolean;
  enablePaypalButton: boolean;
  enablePayLater: boolean;
  enableCardFields: boolean;
  enableWallets: boolean;
  enableVenmo: boolean;
  enableMessaging: boolean;
  messagingPlacements: PayPalMessagingPlacements;
  buttonStyle: PayPalButtonStyle;
  brandName: string;
  currency: string;
  locale: string;
  intent: 'capture' | 'authorize';
  webhookId: string;
}

export const DEFAULT_PAYPAL_BUTTON_STYLE: PayPalButtonStyle = {
  layout: 'vertical',
  color: 'gold',
  shape: 'rect',
  label: 'paypal',
  height: 45,
  tagline: false,
};

const DEFAULTS: PayPalConfig = {
  environment: 'sandbox',
  clientIdSandbox: '',
  clientIdLive: '',
  enabled: false,
  enablePaypalButton: true,
  enablePayLater: true,
  enableCardFields: true,
  enableWallets: true,
  enableVenmo: false,
  enableMessaging: true,
  messagingPlacements: { product: true, cart: true, checkout: true, home: false },
  buttonStyle: DEFAULT_PAYPAL_BUTTON_STYLE,
  brandName: '',
  currency: 'EUR',
  locale: 'fr_FR',
  intent: 'capture',
  webhookId: '',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToConfig(db: any): PayPalConfig {
  return {
    id: db.id,
    environment: db.environment === 'live' ? 'live' : 'sandbox',
    clientIdSandbox: db.client_id_sandbox || '',
    clientIdLive: db.client_id_live || '',
    enabled: !!db.enabled,
    enablePaypalButton: db.enable_paypal_button ?? true,
    enablePayLater: db.enable_pay_later ?? true,
    enableCardFields: db.enable_card_fields ?? true,
    enableWallets: db.enable_wallets ?? true,
    enableVenmo: db.enable_venmo ?? false,
    enableMessaging: db.enable_messaging ?? true,
    messagingPlacements: { ...DEFAULTS.messagingPlacements, ...(db.messaging_placements || {}) },
    buttonStyle: { ...DEFAULT_PAYPAL_BUTTON_STYLE, ...(db.button_style || {}) },
    brandName: db.brand_name || '',
    currency: db.currency || 'EUR',
    locale: db.locale || 'fr_FR',
    intent: db.intent === 'authorize' ? 'authorize' : 'capture',
    webhookId: db.webhook_id || '',
  };
}

export function usePayPalConfig() {
  return useQuery({
    queryKey: ['paypal_config'],
    queryFn: async (): Promise<PayPalConfig> => {
      const { data, error } = await supabase
        .from('paypal_config' as never)
        .select('*')
        .eq('config_key' as never, 'main' as never)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return dbToConfig(data);
    },
    staleTime: 1000 * 60 * 5,
  });
}

/** Identifiant public actif selon l'environnement choisi. */
export function activeClientId(config?: PayPalConfig | null): string {
  if (!config) return '';
  return config.environment === 'live' ? config.clientIdLive : config.clientIdSandbox;
}

export function useSavePayPalConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: PayPalConfig) => {
      const payload = {
        config_key: 'main',
        environment: config.environment,
        client_id_sandbox: config.clientIdSandbox.trim() || null,
        client_id_live: config.clientIdLive.trim() || null,
        enabled: config.enabled,
        enable_paypal_button: config.enablePaypalButton,
        enable_pay_later: config.enablePayLater,
        enable_card_fields: config.enableCardFields,
        enable_wallets: config.enableWallets,
        enable_venmo: config.enableVenmo,
        enable_messaging: config.enableMessaging,
        messaging_placements: config.messagingPlacements,
        button_style: config.buttonStyle,
        brand_name: config.brandName.trim() || null,
        currency: config.currency,
        locale: config.locale,
        intent: config.intent,
        webhook_id: config.webhookId.trim() || null,
      };
      const { error } = await supabase
        .from('paypal_config' as never)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(payload as any, { onConflict: 'config_key' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paypal_config'] }),
  });
}

export interface PayPalTransaction {
  id: string;
  order_id: string | null;
  paypal_order_id: string;
  capture_id: string | null;
  environment: string;
  status: string;
  amount: number;
  currency: string;
  funding_source: string | null;
  payer_email: string | null;
  payer_name: string | null;
  refunded_amount: number;
  created_at: string;
  updated_at?: string;
  /** Commande boutique liée (jointure). */
  order?: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total: number;
    customer_email: string | null;
    updated_at: string | null;
  } | null;
}

export function usePayPalTransactions() {
  return useQuery({
    queryKey: ['paypal_transactions'],
    queryFn: async (): Promise<PayPalTransaction[]> => {
      const { data, error } = await supabase
        .from('paypal_transactions' as never)
        .select(
          '*, order:orders(id, order_number, status, payment_status, total, customer_email, updated_at)',
        )
        .order('created_at' as never, { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as PayPalTransaction[];
    },
  });
}

/** Historique des changements de statut de paiement issus des webhooks PayPal. */
export interface PayPalTransactionEvent {
  id: string;
  event_type: string;
  verification_status: string | null;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

export function usePayPalTransactionEvents(tx?: PayPalTransaction | null) {
  const ids = [tx?.paypal_order_id, tx?.capture_id].filter(Boolean) as string[];
  return useQuery({
    queryKey: ['paypal_transaction_events', ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<PayPalTransactionEvent[]> => {
      const { data, error } = await supabase
        .from('paypal_webhook_events' as never)
        .select('id, event_type, verification_status, processed, error_message, created_at')
        .in('resource_id' as never, ids as never)
        .order('created_at' as never, { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PayPalTransactionEvent[];
    },
  });
}


export interface PayPalWebhookEvent {
  id: string;
  event_id: string | null;
  event_type: string;
  resource_id: string | null;
  verification_status: string | null;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

export function usePayPalWebhookEvents() {
  return useQuery({
    queryKey: ['paypal_webhook_events'],
    queryFn: async (): Promise<PayPalWebhookEvent[]> => {
      const { data, error } = await supabase
        .from('paypal_webhook_events' as never)
        .select('*')
        .order('created_at' as never, { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as PayPalWebhookEvent[];
    },
  });
}

export function usePayPalCredentialStatus() {
  return useQuery({
    queryKey: ['paypal_credentials_status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('paypal', {
        body: { action: 'status' },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data as { environment: string; sandboxConfigured: boolean; liveConfigured: boolean };
    },
    staleTime: 1000 * 30,
  });
}

export function useRefundPayPal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, amount, note }: { transactionId: string; amount?: number; note?: string }) => {
      const { data, error } = await supabase.functions.invoke('paypal', {
        body: { action: 'refund', transactionId, amount, note },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paypal_transactions'] }),
  });
}
