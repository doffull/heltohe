import { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';

interface Props {
  lat?: number;
  lng?: number;
  /** Appelé quand l'admin déplace le marqueur ou clique sur la carte. */
  onChange: (pos: { lat: number; lng: number }) => void;
}

/** Mini-carte de prévisualisation avec marqueur déplaçable (Admin → Boutiques). */
export function BoutiqueMapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const hasPos = typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setError(null);

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;
        const center = hasPos ? { lat: lat as number, lng: lng as number } : { lat: 46.6, lng: 2.5 };

        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: hasPos ? 15 : 5,
          disableDefaultUI: true,
          zoomControl: true,
        });

        markerRef.current = new google.maps.Marker({
          position: center,
          map: mapRef.current,
          draggable: true,
        });

        markerRef.current.addListener('dragend', (e: any) => {
          onChangeRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        mapRef.current.addListener('click', (e: any) => {
          markerRef.current.setPosition(e.latLng);
          onChangeRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'Carte indisponible');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Recentre la carte quand les coordonnées changent depuis le formulaire.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !hasPos) return;
    const pos = { lat: lat as number, lng: lng as number };
    markerRef.current.setPosition(pos);
    mapRef.current.panTo(pos);
    if (mapRef.current.getZoom() < 12) mapRef.current.setZoom(15);
  }, [lat, lng, hasPos]);

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-md border border-border bg-muted">
      <div ref={containerRef} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted p-4 text-center">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setAttempt((a) => a + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}

export default BoutiqueMapPicker;
