import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoutiques, type Boutique } from '@/hooks/useBoutiques';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Search, LocateFixed, AlertCircle, Store, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { loadGoogleMaps, haversineKm } from '@/lib/loadGoogleMaps';
import { useCookieConsent } from '@/context/CookieConsentContext';

export function StoreFinderSection() {
  const { data: boutiques = [] } = useBoutiques();
  const { designSettings } = useApp();
  const [query, setQuery] = useState('');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const siteSpacing = (designSettings as any).siteSpacing || 'compact';
  const sectionPy =
    siteSpacing === 'spacious' ? 'py-8 lg:py-20' : siteSpacing === 'normal' ? 'py-4 lg:py-10' : 'py-1 lg:py-4';
  const titleMb =
    siteSpacing === 'spacious' ? 'mb-6 lg:mb-10' : siteSpacing === 'normal' ? 'mb-4 lg:mb-8' : 'mb-2 lg:mb-4';

  // Settings coming from the admin "Nos boutiques (recherche + carte)" inline editor
  const blocks = ((designSettings as any).homePageBlocks || []) as Array<{ id: string; settings?: any }>;
  const cfg = blocks.find((b) => b.id === 'storeFinder')?.settings || {};
  const eyebrow: string = cfg.eyebrow || '// BOUTIQUES';
  const heading: string = cfg.title || 'Où nous trouver';
  const subtitle: string = cfg.subtitle ?? 'Trouvez la boutique ou le stand le plus proche de chez vous.';
  const align: 'left' | 'center' | 'right' = cfg.titleAlign || 'left';
  const bgImage: string = cfg.backgroundImage || '';
  const overlayOpacity: number = typeof cfg.overlayOpacity === 'number' ? cfg.overlayOpacity : 70;
  const showLocate = cfg.showLocate !== false;
  const showAll = cfg.showAll !== false;
  const showPageLink = cfg.showPageLink !== false;

  const alignText = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const alignBox = align === 'center' ? 'mx-auto items-center' : align === 'right' ? 'ml-auto items-end' : 'mr-auto items-start';

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: (Boutique & { _d?: number })[] = boutiques;
    if (q) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          (b.postalCode || '').toLowerCase().includes(q) ||
          (b.postalCode || '').startsWith(q.slice(0, 2)) ||
          b.address.toLowerCase().includes(q),
      );
    }
    if (userPos) {
      list = [...list]
        .map((b) => ({ ...b, _d: haversineKm(userPos, { lat: b.latitude, lng: b.longitude }) }))
        .sort((a, b) => (a._d ?? 0) - (b._d ?? 0));
    }
    return list.slice(0, 5);
  }, [boutiques, query, userPos]);

  function locateMe() {
    if (!navigator.geolocation) {
      setMapError('Géolocalisation non disponible');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMapError('Position refusée ou indisponible');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function openMap(id: string | null) {
    setSelectedId(id);
    setOpen(true);
  }

  if (boutiques.length === 0) return null;

  return (
    <section className={cn('relative', sectionPy, bgImage && 'overflow-hidden')}>
      {bgImage && (
        <>
          <img
            src={bgImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div
            className="absolute inset-0 bg-background"
            style={{ opacity: overlayOpacity / 100 }}
            aria-hidden
          />
        </>
      )}
      <div className={cn('container mx-auto px-4', bgImage && 'relative py-8 lg:py-12')}>
        <div className={cn('flex', titleMb, alignText)}>
          <div className={cn('flex flex-col', alignBox)}>
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">{eyebrow}</p>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight">{heading}</h2>
            {subtitle && (
              <p className={cn('text-sm text-muted-foreground mt-2 max-w-xl', alignText)}>{subtitle}</p>
            )}
          </div>
        </div>

        <div className={cn('relative max-w-2xl', align === 'center' && 'mx-auto', align === 'right' && 'ml-auto')}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ville, code postal, nom de boutique…"
                className="pl-9 h-11"
              />
            </div>
            {showLocate && (
              <Button onClick={locateMe} variant="outline" disabled={locating} className="gap-2 h-11">
                <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />
                Près de chez moi
              </Button>
            )}
            {showAll && (
              <Button onClick={() => openMap(null)} className="gap-2 h-11">
                <MapPin className="h-4 w-4" />
                Toutes les boutiques
              </Button>
            )}
          </div>

          {(query.trim() || userPos) && suggestions.length > 0 && (
            <div className="mt-2 border border-border bg-card rounded-md overflow-hidden divide-y divide-border">
              {suggestions.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => openMap(b.id)}
                  className="w-full text-left p-3 hover:bg-accent transition-colors flex items-center gap-3"
                >
                  {b.image ? (
                    <img src={b.image} alt="" className="h-10 w-10 object-cover rounded shrink-0" loading="lazy" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted shrink-0 flex items-center justify-center">
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold uppercase tracking-wider truncate">{b.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {b.postalCode ? `${b.postalCode} ` : ''}
                        {b.city}
                      </span>
                      {typeof b._d === 'number' && (
                        <span className="ml-2 text-primary font-medium">
                          {b._d < 1 ? `${Math.round(b._d * 1000)} m` : `${b._d.toFixed(1)} km`}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {mapError && (
            <div className="mt-2 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {mapError}
            </div>
          )}

          {showPageLink && (
            <div className="mt-3 text-xs text-muted-foreground">
              <Link to="/boutiques" className="underline hover:text-foreground">
                Voir la page complète des boutiques →
              </Link>
            </div>
          )}
        </div>
      </div>

      <StoreMapDialog
        open={open}
        onOpenChange={setOpen}
        boutiques={boutiques}
        selectedId={selectedId}
      />
    </section>
  );
}

function StoreMapDialog({
  open,
  onOpenChange,
  boutiques,
  selectedId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  boutiques: Boutique[];
  selectedId: string | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Google Maps est un service tiers : chargé uniquement avec le consentement.
  const { consent, acceptThirdParty } = useStoreMapConsent();

  useEffect(() => {
    if (!open || boutiques.length === 0 || !consent) return;
    let cancelled = false;
    let mapInstance: any = null;
    setError(null);

    // Wait for the dialog to be fully painted before initialising the map,
    // otherwise the container has zero size and Google Maps renders blank.
    const timer = setTimeout(() => {
      if (cancelled || !mapRef.current) return;

      loadGoogleMaps()
        .then(() => {
          if (cancelled || !mapRef.current) return;
          const google = (window as any).google;
          const selected = selectedId ? boutiques.find((b) => b.id === selectedId) : null;
          const center = selected
            ? { lat: selected.latitude, lng: selected.longitude }
            : { lat: 46.6, lng: 2.5 };

          mapInstance = new google.maps.Map(mapRef.current, {
            center,
            zoom: selected ? 14 : 6,
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
              map: mapInstance,
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
              info.open({ map: mapInstance, anchor: marker });
              openInfo = info;
            });
            bounds.extend({ lat: b.latitude, lng: b.longitude });

            if (selected && selected.id === b.id) {
              info.open({ map: mapInstance, anchor: marker });
              openInfo = info;
            }
          });

          if (!selected && boutiques.length > 1) {
            mapInstance.fitBounds(bounds, 60);
          }

          // Force a resize once the dialog has finished its open animation
          // so the tiles paint correctly inside the modal.
          setTimeout(() => {
            if (cancelled || !mapInstance) return;
            google.maps.event.trigger(mapInstance, 'resize');
            mapInstance.setCenter(center);
          }, 250);
        })
        .catch((e) => setError(e.message || 'Carte indisponible'));
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, boutiques, selectedId, consent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="uppercase tracking-wider">
            {selectedId
              ? boutiques.find((b) => b.id === selectedId)?.name || 'Boutique'
              : 'Toutes nos boutiques'}
          </DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[70vh] bg-muted">
          <div ref={mapRef} className="absolute inset-0" />
          {!consent && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/95 p-6 text-center">
              <div className="max-w-sm space-y-3">
                <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  La carte est fournie par Google Maps. Autorisez les services tiers pour l'afficher.
                </p>
                <Button size="sm" onClick={acceptThirdParty}>
                  Autoriser et afficher la carte
                </Button>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/95 text-center p-6">
              <div>
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <Link to="/boutiques" className="text-xs text-muted-foreground underline hover:text-foreground">
            Voir la page complète →
          </Link>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Consentement « services tiers » + activation en un clic depuis la carte. */
function useStoreMapConsent() {
  const { consent, save } = useCookieConsent();
  return {
    consent: consent.thirdParty,
    acceptThirdParty: () => save({ ...consent, thirdParty: true }),
  };
}

export default StoreFinderSection;
