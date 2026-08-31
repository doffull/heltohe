// Chargeur unique et partagé de l'API Google Maps JS.
// La clé est relue à CHAQUE appel (et non à l'import du module) : si la clé
// du connecteur arrive après le premier rendu, un simple retour sur la page
// suffit désormais à charger la carte.

let loaderPromise: Promise<void> | null = null;

export function getGoogleMapsKey(): string | undefined {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  return key && key.trim() ? key.trim() : undefined;
}

export const GMAPS_MISSING_KEY_MESSAGE =
  "Carte indisponible : la clé Google Maps n'est pas configurée pour ce site.";

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  const key = getGoogleMapsKey();
  if (!key) return Promise.reject(new Error(GMAPS_MISSING_KEY_MESSAGE));

  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

  const promise = new Promise<void>((resolve, reject) => {
    (window as any).__lvtkGmapsInit = () => resolve();
    const params = new URLSearchParams({
      key,
      loading: 'async',
      callback: '__lvtkGmapsInit',
    });
    if (channel) params.set('channel', channel);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error('Chargement de Google Maps impossible — vérifiez votre connexion.'));
    document.head.appendChild(s);
  });

  // On ne mémorise que les succès : un échec réseau doit pouvoir être réessayé.
  loaderPromise = promise;
  promise.catch(() => {
    loaderPromise = null;
  });
  return promise;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
