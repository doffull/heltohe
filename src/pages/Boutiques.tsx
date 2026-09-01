import { useEffect, useRef, useState } from 'react';
import { useBoutiques } from '@/hooks/useBoutiques';
import { MapPin, Store, AlertCircle, Phone } from 'lucide-react';
import { BoutiqueMiniMap } from '@/components/boutiques/BoutiqueMiniMap';


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

import { loadGoogleMaps } from '@/lib/loadGoogleMaps';


export default function Boutiques() {
  const { data: boutiques = [], isLoading } = useBoutiques();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || boutiques.length === 0) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const google = (window as any).google;
        const center = { lat: boutiques[0].latitude, lng: boutiques[0].longitude };
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center,
          zoom: boutiques.length > 1 ? 6 : 13,
          disableDefaultUI: false,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
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
            ? `<img src="${b.image}" alt="${b.name}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;margin-bottom:8px"/>`
            : '';
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
          bounds.extend({ lat: b.latitude, lng: b.longitude });
        });
        if (boutiques.length > 1) mapInstance.current.fitBounds(bounds, 40);
      })
      .catch((e) => setMapError(e.message || 'Carte indisponible'));
    return () => { cancelled = true; };
  }, [boutiques]);

  useDocTitle('Nos boutiques — HELVETICA-MP', 'Découvrez toutes nos boutiques en France : magasins permanents et boutiques éphémères.');

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="px-6 lg:px-12 pt-10 pb-6">
          <h1 className="hud-text text-3xl md:text-4xl font-bold tracking-wider uppercase text-foreground">
            Les Boutiques
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Magasins permanents et boutiques éphémères dans toute la France.
          </p>
        </div>

        {/* Map */}
        <div className="px-6 lg:px-12">
          <div className="relative w-full h-[420px] md:h-[560px] bg-muted overflow-hidden chamfer-hud border border-border">
            <div ref={mapRef} className="absolute inset-0" />
            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/95 text-center p-6">
                <div>
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Carte indisponible — vérifiez votre connexion.</p>
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
        </div>

        {/* List */}
        <div className="px-6 lg:px-12 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {boutiques.map((b) => (
            <div
              key={b.id}
              className={`group relative overflow-hidden chamfer-hud border bg-card cursor-pointer transition-all ${selectedId === b.id ? 'border-primary' : 'border-border hover:border-primary/50'}`}
              onClick={() => {
                setSelectedId(b.id);
                if (mapInstance.current) {
                  mapInstance.current.panTo({ lat: b.latitude, lng: b.longitude });
                  mapInstance.current.setZoom(14);
                }
              }}
            >
              {b.image && (
                <img src={b.image} alt={b.name} className="w-full h-40 object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              )}
              <div className="p-4">
                <h3 className="hud-text font-bold tracking-wider uppercase text-foreground">{b.name}</h3>
                <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{b.address}<br/>{b.postalCode ? `${b.postalCode} ` : ''}{b.city}</span>
                </div>
                <BoutiqueMiniMap boutique={b} className="mt-3" />
              </div>

            </div>
          ))}
        </div>
      </div>
    </>
  );
}
