import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ExternalLink, Navigation } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import type { Boutique } from '@/hooks/useBoutiques';

/** Direct Google Maps link for a boutique (opens the place at its coordinates). */
export function googleMapsPlaceUrl(b: Pick<Boutique, 'name' | 'address' | 'city' | 'postalCode' | 'latitude' | 'longitude'>) {
  const query = encodeURIComponent(`${b.name} ${b.address} ${b.postalCode || ''} ${b.city}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}&center=${b.latitude},${b.longitude}`;
}

export function googleMapsDirectionsUrl(b: Pick<Boutique, 'latitude' | 'longitude'>) {
  return `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`;
}

/** Small static-feel interactive map with a single marker, used inside a boutique card. */
export function BoutiqueMiniMap({ boutique, className }: { boutique: Boutique; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    setError(null);
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const google = (window as any).google;
        const position = { lat: boutique.latitude, lng: boutique.longitude };
        const map = new google.maps.Map(ref.current, {
          center: position,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
            { featureType: 'water', stylers: [{ color: '#e9e9e9' }] },
            { featureType: 'road', stylers: [{ color: '#ffffff' }] },
          ],
        });
        new google.maps.Marker({ position, map, title: boutique.name });
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'Carte indisponible');
      });
    return () => { cancelled = true; };
  }, [boutique.id, boutique.latitude, boutique.longitude, boutique.name, attempt]);

  return (
    <div className={className}>
      <div className="relative w-full h-40 bg-muted overflow-hidden border border-border">
        <div ref={ref} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/95 text-center p-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Carte indisponible</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAttempt((a) => a + 1); }}
              className="text-[10px] font-bold uppercase tracking-wider underline"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={googleMapsPlaceUrl(boutique)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-border text-[11px] font-bold uppercase tracking-wider hover:border-primary transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> Google Maps
        </a>
        <a
          href={googleMapsDirectionsUrl(boutique)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
        >
          <Navigation className="h-3 w-3" /> Itinéraire
        </a>
      </div>
    </div>
  );
}
