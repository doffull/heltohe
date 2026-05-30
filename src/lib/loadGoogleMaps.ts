// Shared async loader for the Google Maps JS API.
// Uses the Lovable connector browser key and a single global init callback.

const GMAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const GMAPS_CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let loaderPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  if (!GMAPS_KEY) return Promise.reject(new Error('Google Maps key missing'));

  loaderPromise = new Promise((resolve, reject) => {
    (window as any).__lvtkGmapsInit = () => resolve();
    const params = new URLSearchParams({
      key: GMAPS_KEY!,
      loading: 'async',
      callback: '__lvtkGmapsInit',
    });
    if (GMAPS_CHANNEL) params.set('channel', GMAPS_CHANNEL);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
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
