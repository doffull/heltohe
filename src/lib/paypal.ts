let sdkPromise: Promise<any> | null = null;
let sdkKey = '';

export interface PayPalSdkOptions {
  clientId: string;
  currency?: string;
  locale?: string;
  intent?: string;
  enableCardFields?: boolean;
  enablePayLater?: boolean;
  enableVenmo?: boolean;
  enableMessaging?: boolean;
}

/** Charge (une seule fois) le SDK JS PayPal avec les composants demandés. */
export function loadPayPalSdk(opts: PayPalSdkOptions): Promise<any> {
  const components = ['buttons'];
  if (opts.enableMessaging) components.push('messages');
  if (opts.enableCardFields) components.push('card-fields');

  const funding: string[] = [];
  if (opts.enablePayLater) funding.push('paylater');
  if (opts.enableVenmo) funding.push('venmo');

  const params = new URLSearchParams({
    'client-id': opts.clientId,
    currency: opts.currency || 'EUR',
    intent: (opts.intent || 'capture').toLowerCase(),
    components: components.join(','),
    locale: opts.locale || 'fr_FR',
  });
  if (funding.length) params.set('enable-funding', funding.join(','));
  else params.set('disable-funding', 'paylater,venmo');

  const src = `https://www.paypal.com/sdk/js?${params.toString()}`;

  if (sdkPromise && sdkKey === src) return sdkPromise;

  // Nouvelle configuration : on repart d'un script neuf
  document.querySelectorAll('script[data-paypal-sdk]').forEach(s => s.remove());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).paypal = undefined;

  sdkKey = src;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.paypalSdk = 'true';
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = (window as any).paypal;
      sdk ? resolve(sdk) : reject(new Error('SDK PayPal indisponible'));
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Impossible de charger le SDK PayPal'));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}
