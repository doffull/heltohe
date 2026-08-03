import { useEffect, useState } from 'react';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PayPlugPayload {
  items: Array<{ productId: string; quantity: number; size?: string | null; color?: string | null }>;
  promoCode?: string;
  deliveryMode: 'home' | 'relay';
  orderData: Record<string, string>;
}

interface Props {
  /** Construit la charge utile au moment du clic (panier / adresse à jour). */
  buildPayload: () => PayPlugPayload | null;
  amount: number;
  disabled?: boolean;
}

/**
 * Bouton de paiement PayPlug (page de paiement hébergée, cartes bancaires FR).
 * La commande est créée et le montant recalculé côté serveur avant redirection.
 */
export function PayPlugCheckout({ buildPayload, amount, disabled }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'test' | 'live' | null>(null);

  // Le mode (test/live) est déduit côté serveur du préfixe de la clé secrète.
  useEffect(() => {
    let alive = true;
    supabase.functions
      .invoke('payplug', { body: { action: 'status' } })
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = data as any;
        if (alive && res?.mode) setMode(res.mode);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const start = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('payplug', {
        body: {
          action: 'create-payment',
          ...payload,
          returnUrl: `${window.location.origin}/checkout`,
        },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = data as any;
      if (res?.error) throw new Error(res.error);
      if (!res?.paymentUrl) throw new Error('Page de paiement PayPlug indisponible');
      sessionStorage.setItem('payplug_pending', JSON.stringify({ orderNumber: res.orderNumber }));
      window.location.href = res.paymentUrl as string;
    } catch (err) {
      toast({
        title: 'Paiement PayPlug indisponible',
        description: err instanceof Error ? err.message : 'Veuillez réessayer.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={start}
        disabled={disabled || loading}
        className="w-full h-12 chamfer-hud-sm font-bold"
        variant="secondary"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirection sécurisée…</>
        ) : (
          <><CreditCard className="h-4 w-4 mr-2 shrink-0" />PAYER PAR CARTE — {amount.toFixed(2)}€</>
        )}
      </Button>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" />
        Paiement sécurisé PayPlug — 3-D Secure, solution française
        {mode === 'test' && (
          <span className="ml-1 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
            Mode test
          </span>
        )}
      </p>
    </div>
  );
}

export default PayPlugCheckout;
