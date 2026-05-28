import { useEffect, useMemo, useRef, useState } from 'react';
import { useBoutiques } from '@/hooks/useBoutiques';
import { MapPin, Search, LocateFixed, AlertCircle, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function useDocTitle(title: string, description?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = meta?.content;
    if (description) {
      if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
      meta.content = description;
    }
    return () => { document.title = prev; if (meta && prevDesc !== undefined) meta.content = prevDesc; };
  }, [title, description]);
}

const GMAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const GMAPS_CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let gmapsLoaderPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if ((window as any).google?.maps) return Promise.resolve();
  if (gmapsLoaderPromise) return gmapsLoaderPromise;
  if (!GMAPS_KEY) return Promise.reject(new Error('Google Maps key missing'));
  gmapsLoaderPromise = new Promise((resolve, reject) => {
    (window as any).__lvtkGmapsInit = () => resolve();
    const params = new URLSearchParams({ key: GMAPS_KEY!, loading: 'async', callback: '__lvtkGmapsInit' });
    if (GMAPS_CHANNEL) params.set('channel', GMAPS_CHANNEL);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true; s.defer = true;
    s.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(s);
  });
  return gmapsLoaderPromise;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function StoreLocator() {
  const { data: boutiques = [], isLoading } = useBoutiques();
  const [query, setQuery] = useState('');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, { marker: any; info: any }>>(new Map());
  const userMarkerRef = useRef<any>(null);

  useDocTitle('Trouver une boutique — LVTK6', 'Localisez la boutique LVTK6 la plus proche : recherche par ville, code postal ou géolocalisation.');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: any[] = boutiques;
    if (q) {
      list = list.filter((b) =>
        b.name.toLowerCase().includes(q)
        || b.city.toLowerCase().includes(q)
        || (b.postalCode || '').toLowerCase().includes(q)
        || (b.postalCode || '').startsWith(q.slice(0, 2))
        || b.address.toLowerCase().includes(q),
      );
    }
    if (userPos) {
      list = [...list].map((b) => ({ ...b, _d: haversineKm(userPos, { lat: b.latitude, lng: b.longitude }) }))
        .sort((a, b) => a._d - b._d);
    }
    return list;
  }, [boutiques, query, userPos]);

  useEffect(() => {
    if (!mapRef.current || boutiques.length === 0) return;
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !mapRef.current) return;
      const google = (window as any).google;
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: 46.6, lng: 2.5 },
        zoom: 6,
        disableDefaultUI: false,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { featureType: 'water', stylers: [{ color: '#e9e9e9' }] },
          { featureType: 'road', stylers: [{ color: '#ffffff' }] },
        ],
      });
      const bounds = new google.maps.LatLngBounds();
      let openInfo: any = null;
      boutiques.forEach((b) => {
        const marker = new google.maps.Marker({
          position: { lat: b.latitude, lng: b.longitude },
          map: mapInstance.current,
          title: b.name,
        });
        const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`;
        const imgHtml = b.image
          ? `<img src="${b.image}" alt="${b.name}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;margin-bottom:8px"/>` : '';
        const info = new google.maps.InfoWindow({
          content: `<div style="font-family:system-ui,sans-serif;min-width:220px;max-width:260px">
            ${imgHtml}
            <strong style="font-size:14px;display:block;margin-bottom:4px">${b.name}</strong>
            <div style="font-size:12px;color:#555;line-height:1.4">${b.address}<br/>${b.postalCode || ''} ${b.city}</div>
            <a href="${dirUrl}" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;padding:6px 12px;background:#000;color:#fff;text-decoration:none;font-size:12px;font-weight:600;border-radius:3px">→ Itinéraire</a>
          </div>`,
        });
        marker.addListener('click', () => {
          if (openInfo) openInfo.close();
          info.open({ map: mapInstance.current, anchor: marker });
          openInfo = info;
          setSelectedId(b.id);
        });
        markersRef.current.set(b.id, { marker, info });
        bounds.extend({ lat: b.latitude, lng: b.longitude });
      });
      if (boutiques.length > 1) mapInstance.current.fitBounds(bounds, 60);
    }).catch((e) => setMapError(e.message || 'Carte indisponible'));
    return () => { cancelled = true; markersRef.current.clear(); };
  }, [boutiques]);

  function focusBoutique(id: string) {
    const b = boutiques.find((x) => x.id === id);
    if (!b || !mapInstance.current) return;
    setSelectedId(id);
    mapInstance.current.panTo({ lat: b.latitude, lng: b.longitude });
    mapInstance.current.setZoom(14);
    const entry = markersRef.current.get(id);
    if (entry) {
      markersRef.current.forEach((e) => e.info.close());
      entry.info.open({ map: mapInstance.current, anchor: entry.marker });
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setMapError('Géolocalisation non disponible');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        setLocating(false);
        if (mapInstance.current) {
          mapInstance.current.panTo(p);
          mapInstance.current.setZoom(11);
          const google = (window as any).google;
          if (userMarkerRef.current) userMarkerRef.current.setMap(null);
          userMarkerRef.current = new google.maps.Marker({
            position: p,
            map: mapInstance.current,
            title: 'Ma position',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
        }
      },
      () => { setLocating(false); setMapError('Position refusée ou indisponible'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 lg:px-12 pt-8 pb-4">
        <h1 className="hud-text text-2xl md:text-4xl font-bold tracking-wider uppercase text-foreground">
          Trouver une boutique
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Recherchez par ville, code postal, département (ex : 75) ou nom du centre commercial.
        </p>
      </div>

      <div className="px-6 lg:px-12 pb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ville, code postal, centre commercial…"
            className="pl-9 h-11"
          />
        </div>
        <Button onClick={locateMe} variant="outline" disabled={locating} className="gap-2 h-11">
          <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
          Près de chez moi
        </Button>
      </div>

      <div className="px-6 lg:px-12 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="relative w-full h-[380px] lg:h-[640px] bg-muted overflow-hidden chamfer-hud border border-border">
          <div ref={mapRef} className="absolute inset-0" />
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/95 text-center p-6">
              <div>
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{mapError}</p>
              </div>
            </div>
          )}
          {!mapError && boutiques.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-center p-6">
              <div>
                <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucune boutique pour le moment.</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:max-h-[640px] lg:overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 && !isLoading && (
            <div className="text-sm text-muted-foreground text-center py-8">Aucune boutique trouvée pour « {query} ».</div>
          )}
          {filtered.map((b: any) => (
            <button
              key={b.id}
              type="button"
              onClick={() => focusBoutique(b.id)}
              className={`w-full text-left chamfer-hud border bg-card hover:border-primary/60 transition-all p-3 ${selectedId === b.id ? 'border-primary' : 'border-border'}`}
            >
              <div className="flex gap-3">
                {b.image ? (
                  <img src={b.image} alt={b.name} className="h-16 w-16 object-cover rounded shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded bg-muted shrink-0 flex items-center justify-center">
                    <Store className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold hud-text text-sm uppercase tracking-wider truncate">{b.name}</div>
                  <div className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="truncate">{b.postalCode ? `${b.postalCode} ` : ''}{b.city}</span>
                  </div>
                  {typeof b._d === 'number' && (
                    <div className="text-xs text-primary font-medium mt-1">À {b._d < 1 ? `${Math.round(b._d * 1000)} m` : `${b._d.toFixed(1)} km`}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
