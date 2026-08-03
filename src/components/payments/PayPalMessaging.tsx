import { useEffect, useRef } from 'react';
import { loadPayPalSdk } from '@/lib/paypal';
import { activeClientId, usePayPalConfig } from '@/hooks/usePayPalConfig';

interface Props {
  amount: number;
  placement: 'product' | 'cart' | 'payment' | 'home';
  layout?: 'text' | 'flex';
  className?: string;
}

const PLACEMENT_KEY = {
  product: 'product',
  cart: 'cart',
  payment: 'checkout',
  home: 'home',
} as const;

/**
 * Bannière PayPal « Payez en 3x ou 4x sans frais » (Pay Later messaging).
 * Affichée selon les emplacements activés dans l'espace PayPal de l'admin.
 */
export function PayPalMessaging({ amount, placement, layout = 'text', className }: Props) {
  const { data: config } = usePayPalConfig();
  const ref = useRef<HTMLDivElement>(null);
  const clientId = activeClientId(config);
  const allowed =
    !!config?.enabled &&
    config.enableMessaging &&
    config.enablePayLater &&
    !!clientId &&
    config.messagingPlacements[PLACEMENT_KEY[placement]] !== false;

  useEffect(() => {
    if (!allowed || !ref.current || !config) return;
    let cancelled = false;
    const node = ref.current;
    node.innerHTML = '';

    loadPayPalSdk({
      clientId,
      currency: config.currency,
      locale: config.locale,
      intent: config.intent,
      enableCardFields: config.enableCardFields,
      enablePayLater: config.enablePayLater,
      enableVenmo: config.enableVenmo,
      enableMessaging: true,
    })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((sdk: any) => {
        if (cancelled || !sdk?.Messages) return;
        sdk
          .Messages({
            amount,
            placement,
            style: { layout, logo: { type: 'primary' }, text: { size: 12 } },
          })
          .render(node)
          .catch(() => {/* messagerie indisponible pour ce pays/montant */});
      })
      .catch(() => {/* SDK indisponible */});

    return () => {
      cancelled = true;
      node.innerHTML = '';
    };
  }, [allowed, amount, clientId, config, layout, placement]);

  if (!allowed) return null;
  return <div ref={ref} className={className} />;
}

export default PayPalMessaging;
