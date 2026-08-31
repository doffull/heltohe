import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadPayPalSdk, resetPayPalSdk, PAYPAL_MISSING_CLIENT_ID } from '@/lib/paypal';
import { supabase } from '@/integrations/supabase/client';
import { activeClientId, usePayPalConfig } from '@/hooks/usePayPalConfig';
import { useToast } from '@/hooks/use-toast';


export interface PayPalCheckoutPayload {
  items: Array<{ productId: string; quantity: number; size?: string | null; color?: string | null }>;
  promoCode?: string;
  deliveryMode: 'home' | 'relay';
  orderData: Record<string, string>;
}

interface Props {
  /** Construit la charge utile au moment du clic (panier / adresse à jour). */
  buildPayload: () => PayPalCheckoutPayload | null;
  onPaid: (info: { orderNumber: string; total: number }) => void;
  disabled?: boolean;
}

/**
 * Boutons PayPal complets : PayPal, Paiement en 3x/4x (Pay Later),
 * carte bancaire et wallets (Apple Pay / Google Pay) selon la config admin.
 */
export function PayPalCheckout({ buildPayload, onPaid, disabled }: Props) {
  const { data: config } = usePayPalConfig();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const contextRef = useRef<{ orderNumber: string; total: number } | null>(null);
  const payloadRef = useRef(buildPayload);
  payloadRef.current = buildPayload;
  const paidRef = useRef(onPaid);
  paidRef.current = onPaid;

  const clientId = activeClientId(config);

  useEffect(() => {
    if (!config?.enabled) return;
    if (!containerRef.current) return;
    let cancelled = false;
    const node = containerRef.current;
    node.innerHTML = '';
    setReady(false);
    setError(null);

    if (!clientId) {
      setError(PAYPAL_MISSING_CLIENT_ID);
      return;
    }



    loadPayPalSdk({
      clientId,
      currency: config.currency,
      locale: config.locale,
      intent: config.intent,
      enableCardFields: config.enableCardFields,
      enablePayLater: config.enablePayLater,
      enableVenmo: config.enableVenmo,
      enableMessaging: config.enableMessaging,
    })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((sdk: any) => {
        if (cancelled) return;
        sdk
          .Buttons({
            style: {
              layout: config.buttonStyle.layout,
              color: config.buttonStyle.color,
              shape: config.buttonStyle.shape,
              label: config.buttonStyle.label,
              height: config.buttonStyle.height,
              tagline: config.buttonStyle.tagline,
            },
            createOrder: async () => {
              const payload = payloadRef.current();
              if (!payload) throw new Error('Informations de commande incomplètes');
              const { data, error: fnError } = await supabase.functions.invoke('paypal', {
                body: { action: 'create-order', ...payload },
              });
              if (fnError) throw fnError;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const res = data as any;
              if (res?.error) throw new Error(res.error);
              contextRef.current = { orderNumber: res.orderNumber, total: res.total };
              return res.paypalOrderId as string;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onApprove: async (data: any) => {
              const { data: res, error: fnError } = await supabase.functions.invoke('paypal', {
                body: { action: 'capture-order', paypalOrderId: data.orderID },
              });
              if (fnError) throw fnError;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const parsed = res as any;
              if (parsed?.error) throw new Error(parsed.error);
              if (!parsed?.success) throw new Error('Paiement non finalisé');
              if (contextRef.current) paidRef.current(contextRef.current);
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onError: (err: any) => {
              toast({
                title: 'Paiement PayPal interrompu',
                description: err?.message || 'Veuillez réessayer.',
                variant: 'destructive',
              });
            },
          })
          .render(node)
          .then(() => !cancelled && setReady(true))
          .catch(() => !cancelled && setError('Boutons PayPal indisponibles'));
      })
      .catch((e: Error) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      node.innerHTML = '';
    };
  }, [clientId, config, toast]);

  if (!config?.enabled || !clientId || !config.enablePaypalButton) return null;

  return (
    <div className="space-y-2">
      <div className={disabled ? 'pointer-events-none opacity-50' : undefined}>
        <div ref={containerRef} className="min-h-[50px]" />
        {!ready && !error && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Loader2 className="h-3 w-3 animate-spin" />
            Chargement des moyens de paiement PayPal…
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" />
        Paiement sécurisé PayPal — protection des achats incluse
        {config.environment === 'sandbox' && ' · mode test'}
      </p>
    </div>
  );
}

export default PayPalCheckout;
