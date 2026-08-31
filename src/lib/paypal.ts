/* Chargeur unique et résilient du SDK JS PayPal.
 * - chargement asynchrone (script async, résolu sur onload)
 * - une seule promesse par configuration (pas de double injection)
 * - les échecs ne sont jamais mémorisés : on peut réessayer
 * - timeout explicite pour ne pas rester bloqué sur un réseau muet
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdkPromise: Promise<any> | null = null;
let sdkKey = '';

const LOAD_TIMEOUT_MS = 15000;

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

export const PAYPAL_MISSING_CLIENT_ID =
  "Paiement indisponible : la clé PayPal (client ID) n'est pas configurée.";

function buildSrc(opts: PayPalSdkOptions): string {
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

  return `https://www.paypal.com/sdk/js?${params.toString()}`;
}

/** Réinitialise le cache : le prochain appel retentera un chargement complet. */
export function resetPayPalSdk() {
  sdkPromise = null;
  sdkKey = '';
  document.querySelectorAll('script[data-paypal-sdk]').forEach((s) => s.remove());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).paypal = undefined;
}

/** Charge (une seule fois par configuration) le SDK JS PayPal. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadPayPalSdk(opts: PayPalSdkOptions): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));

  const clientId = (opts.clientId || '').trim();
  if (!clientId) return Promise.reject(new Error(PAYPAL_MISSING_CLIENT_ID));

  const src = buildSrc({ ...opts, clientId });

  // Même configuration déjà chargée / en cours : on réutilise.
  if (sdkPromise && sdkKey === src) return sdkPromise;

  // Nouvelle configuration : on repart d'un script neuf.
  resetPayPalSdk();

  sdkKey = src;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promise = new Promise<any>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.paypalSdk = 'true';

    const timer = window.setTimeout(() => {
      script.remove();
      reject(
        new Error(
          "Le SDK PayPal met trop de temps à répondre. Vérifiez votre connexion (ou un bloqueur de publicités) puis réessayez.",
        ),
      );
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      window.clearTimeout(timer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = (window as any).paypal;
      if (sdk) resolve(sdk);
      else reject(new Error('SDK PayPal chargé mais indisponible. Réessayez.'));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(
        new Error(
          "Impossible de charger le SDK PayPal. Vérifiez votre connexion ou un éventuel bloqueur, puis réessayez.",
        ),
      );
    };

    document.head.appendChild(script);
  });

  sdkPromise = promise;
  // Un échec ne doit jamais être mémorisé : le bouton « Réessayer » doit repartir de zéro.
  promise.catch(() => {
    if (sdkKey === src) {
      sdkPromise = null;
      sdkKey = '';
    }
  });

  return promise;
}
