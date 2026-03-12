import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Truck, MapPin, Settings2, ExternalLink, Download,
  CheckCircle2, XCircle, Loader2, Search, RefreshCw, Tag,
  Building2, AlertTriangle, Info,
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useQueryClient } from '@tanstack/react-query';
import { useDesignSettings, useSaveDesignSettings } from '@/hooks/useDesignSettings';
import { Order } from '@/types';

// Leaflet map imports
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths broken by Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface RelayPoint {
  identifiant: string;
  nom: string;
  adresse1: string;
  adresse2: string;
  codePostal: string;
  localite: string;
  libellePays: string;
  distanceEnMetre: string;
  horairesOuvertureLundi: string;
  horairesOuvertureMardi: string;
  horairesOuvertureMercredi: string;
  horairesOuvertureJeudi: string;
  horairesOuvertureVendredi: string;
  horairesOuvertureSamedi: string;
  horairesOuvertureDimanche: string;
  typeDePoint: string;
  lat: string;
  lng: string;
}

const SHIPPING_STATUS_FILTER = ['all', 'to_ship', 'in_transit', 'delivered'] as const;
type ShippingFilter = typeof SHIPPING_STATUS_FILTER[number];

const DAYS = [
  { key: 'horairesOuvertureLundi', label: 'Lun' },
  { key: 'horairesOuvertureMardi', label: 'Mar' },
  { key: 'horairesOuvertureMercredi', label: 'Mer' },
  { key: 'horairesOuvertureJeudi', label: 'Jeu' },
  { key: 'horairesOuvertureVendredi', label: 'Ven' },
  { key: 'horairesOuvertureSamedi', label: 'Sam' },
  { key: 'horairesOuvertureDimanche', label: 'Dim' },
];

function formatDistance(meters: string) {
  const m = parseInt(meters);
  if (isNaN(m)) return '';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function getShippingStatus(order: Order): 'to_ship' | 'in_transit' | 'delivered' {
  if (order.status === 'Delivered') return 'delivered';
  if (order.trackingNumber || order.status === 'Shipped') return 'in_transit';
  return 'to_ship';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'to_ship') return <Badge variant="outline" className="text-yellow-500 border-yellow-500/40 bg-yellow-500/10">À expédier</Badge>;
  if (status === 'in_transit') return <Badge variant="outline" className="text-blue-500 border-blue-500/40 bg-blue-500/10">En transit</Badge>;
  if (status === 'delivered') return <Badge variant="outline" className="text-green-500 border-green-500/40 bg-green-500/10">Livré</Badge>;
  return null;
}

// ─── Tab 1: Expéditions ───────────────────────────────────────────────────────

function ExpeditionsTab({ senderName, senderAddress, senderZip, senderCity }: {
  senderName: string; senderAddress: string; senderZip: string; senderCity: string;
}) {
  const { toast } = useToast();
  const { data: orders = [] } = useOrders();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ShippingFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = orders.filter((order: Order) => {
    const status = getShippingStatus(order);
    const matchesFilter = filter === 'all' || filter === status;
    const matchesSearch = !search ||
      order.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    to_ship: orders.filter((o: Order) => getShippingStatus(o) === 'to_ship').length,
    in_transit: orders.filter((o: Order) => getShippingStatus(o) === 'in_transit').length,
    delivered: orders.filter((o: Order) => getShippingStatus(o) === 'delivered').length,
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((o: Order) => o.id)));
  };

  async function generateLabel(order: Order) {
    setLoadingMap(l => ({ ...l, [order.id]: true }));
    try {
      const res = await supabase.functions.invoke('colissimo-proxy', {
        body: {
          action: 'generateLabel',
          senderName, senderAddress, senderZip, senderCity,
          order: {
            orderNumber: order.orderNumber,
            customer: {
              name: order.customer.name,
              email: order.customer.email,
              phone: order.customer.phone,
              address: order.customer.address,
              city: order.customer.city,
              zip: order.customer.zip,
            },
          },
        },
      });
      if (res.error || !res.data?.success) throw new Error(res.data?.error || 'Erreur génération étiquette');

      const { trackingNumber, pdfBase64 } = res.data;

      // Save tracking number + mark as shipped
      await supabase.from('orders').update({
        tracking_number: trackingNumber,
        shipping_carrier: 'Colissimo',
        status: 'Shipped',
      }).eq('id', order.id);

      // Download PDF
      if (pdfBase64) {
        const bytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `etiquette_${order.orderNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: `Étiquette générée`, description: trackingNumber ? `N° suivi: ${trackingNumber}` : 'Aucun numéro retourné' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingMap(l => ({ ...l, [order.id]: false }));
    }
  }

  async function markShipped(order: Order) {
    await supabase.from('orders').update({ status: 'Shipped', shipping_carrier: 'Colissimo' }).eq('id', order.id);
    toast({ title: 'Commande marquée expédiée' });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }

  async function bulkGenerateLabels() {
    if (!selected.size) return;
    setBulkLoading(true);
    const toProcess = filtered.filter((o: Order) => selected.has(o.id) && getShippingStatus(o) === 'to_ship');
    for (const order of toProcess) {
      await generateLabel(order);
    }
    setSelected(new Set());
    setBulkLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* KPI counters */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-yellow-500/40 transition-colors" onClick={() => setFilter('to_ship')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Package className="h-5 w-5 text-yellow-500" /></div>
            <div><p className="text-2xl font-bold">{counts.to_ship}</p><p className="text-xs text-muted-foreground">À expédier</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500/40 transition-colors" onClick={() => setFilter('in_transit')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Truck className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold">{counts.in_transit}</p><p className="text-xs text-muted-foreground">En transit</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/40 transition-colors" onClick={() => setFilter('delivered')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-2xl font-bold">{counts.delivered}</p><p className="text-xs text-muted-foreground">Livrées</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher commande, client..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[['all', 'Tout'], ['to_ship', 'À expédier'], ['in_transit', 'En transit'], ['delivered', 'Livré']].map(([val, label]) => (
            <Button key={val} variant={filter === val ? 'default' : 'outline'} size="sm" onClick={() => setFilter(val as ShippingFilter)}>
              {label}
            </Button>
          ))}
        </div>
        {selected.size > 0 && (
          <Button size="sm" onClick={bulkGenerateLabels} disabled={bulkLoading} className="gap-2">
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
            Générer {selected.size} étiquette{selected.size > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>N° Suivi</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Aucune commande</TableCell></TableRow>
            )}
            {filtered.map((order: Order) => {
              const status = getShippingStatus(order);
              const isLoading = loadingMap[order.id];
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                  </TableCell>
                  <TableCell className="font-mono text-sm font-semibold">#{order.orderNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{order.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{order.customer.city}</div>
                    <div className="text-xs text-muted-foreground">{order.customer.zip}</div>
                  </TableCell>
                  <TableCell><StatusBadge status={status} /></TableCell>
                  <TableCell>
                    {order.trackingNumber ? (
                      <a
                        href={`https://www.laposte.fr/particulier/outils/suivre-vos-envois?code=${order.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary text-sm font-mono hover:underline"
                      >
                        {order.trackingNumber}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {status === 'to_ship' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => generateLabel(order)} disabled={isLoading} className="gap-1.5 text-xs">
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                            Étiquette
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => markShipped(order)} className="text-xs gap-1.5">
                            <Truck className="h-3 w-3" />
                            Expédier
                          </Button>
                        </>
                      )}
                      {order.trackingNumber && (
                        <a
                          href={`https://www.laposte.fr/particulier/outils/suivre-vos-envois?code=${order.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="ghost" className="text-xs gap-1.5">
                            <Search className="h-3 w-3" />
                            Suivi
                          </Button>
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Tab 2: Points Relais ─────────────────────────────────────────────────────

function PointsRelaisTab() {
  const { toast } = useToast();
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<RelayPoint[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const hasCoords = (p: RelayPoint) =>
    p.lat && p.lng && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng));

  async function handleSearch() {
    if (!zipCode.trim()) return;
    setLoading(true);
    setPoints([]);
    setSelected(null);
    try {
      const res = await supabase.functions.invoke('colissimo-proxy', {
        body: { action: 'getRelayPoints', zipCode: zipCode.trim() },
      });
      if (res.error || !res.data?.success) throw new Error(res.data?.error || res.data?.details || 'Erreur API');
      setPoints(res.data.points || []);
      if ((res.data.points || []).length === 0) toast({ title: 'Aucun point relais trouvé pour ce code postal' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const selectPoint = (id: string) => {
    setSelected(id);
    const p = points.find(pt => pt.identifiant === id);
    if (p && hasCoords(p) && mapRef.current) {
      mapRef.current.flyTo([parseFloat(p.lat), parseFloat(p.lng)], 16, { duration: 0.8 });
    }
  };

  const firstWithCoords = points.find(hasCoords);
  const mapCenter: [number, number] = firstWithCoords
    ? [parseFloat(firstWithCoords.lat), parseFloat(firstWithCoords.lng)]
    : [46.6, 2.3];
  const mapZoom = firstWithCoords ? 13 : 5;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Code postal (ex: 75001)"
                className="pl-9"
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                maxLength={10}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !zipCode.trim()} className="gap-2 min-w-36">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Recherche...' : 'Rechercher'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {points.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: '620px' }}>
          {/* Map — 2/3 */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden border border-border h-full">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ width: '100%', height: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {points.filter(hasCoords).map(p => (
                <Marker
                  key={p.identifiant}
                  position={[parseFloat(p.lat), parseFloat(p.lng)]}
                  eventHandlers={{ click: () => selectPoint(p.identifiant) }}
                >
                  <Popup>
                    <div className="text-xs space-y-0.5 min-w-36">
                      <p className="font-bold text-sm">{p.nom}</p>
                      <p>{p.adresse1}</p>
                      {p.adresse2 && <p>{p.adresse2}</p>}
                      <p>{p.codePostal} {p.localite}</p>
                      {p.distanceEnMetre && <p className="text-muted-foreground">{formatDistance(p.distanceEnMetre)}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* List — 1/3 */}
          <div className="overflow-y-auto space-y-2 pr-1 h-full">
            <p className="text-sm text-muted-foreground pb-1">{points.length} point{points.length > 1 ? 's' : ''} trouvé{points.length > 1 ? 's' : ''}</p>
            {points.map((p, i) => (
              <Card
                key={p.identifiant}
                className={`cursor-pointer transition-all hover:border-primary/50 ${selected === p.identifiant ? 'border-primary ring-1 ring-primary/30' : ''}`}
                onClick={() => selectPoint(p.identifiant)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-muted-foreground shrink-0">#{i + 1}</span>
                        <p className="text-sm font-semibold leading-tight truncate">{p.nom}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.adresse1}{p.adresse2 ? `, ${p.adresse2}` : ''}</p>
                      <p className="text-xs text-muted-foreground">{p.codePostal} {p.localite}</p>
                    </div>
                    {p.distanceEnMetre && (
                      <Badge variant="secondary" className="text-xs shrink-0">{formatDistance(p.distanceEnMetre)}</Badge>
                    )}
                  </div>
                  {/* Horaires compact */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {DAYS.map(({ key, label }) => {
                      const hours = p[key as keyof RelayPoint] as string;
                      const isOpen = hours && hours !== '00:00-00:00' && hours !== '';
                      return (
                        <div key={key} className="text-center">
                          <p className="text-[9px] font-medium text-muted-foreground">{label}</p>
                          <div className={`text-[8px] rounded px-0.5 py-0.5 leading-none mt-0.5 ${isOpen ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                            {isOpen ? '✓' : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && points.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">Rechercher des points relais</p>
          <p className="text-sm mt-1">Entrez un code postal et appuyez sur Entrée ou cliquez Rechercher</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Configuration ─────────────────────────────────────────────────────

function ConfigurationTab() {
  const { toast } = useToast();
  const { data: settings } = useDesignSettings();
  const save = useSaveDesignSettings();
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const [form, setForm] = useState({
    senderName: '',
    senderAddress: '',
    senderZip: '',
    senderCity: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        senderName: (settings as any).colissimo_sender_name || settings.siteName || '',
        senderAddress: (settings as any).colissimo_sender_address || '',
        senderZip: (settings as any).colissimo_sender_zip || '',
        senderCity: (settings as any).colissimo_sender_city || '',
      });
    }
  }, [settings]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSave() {
    if (!settings) return;
    await save.mutateAsync({
      ...settings,
      colissimo_sender_name: form.senderName,
      colissimo_sender_address: form.senderAddress,
      colissimo_sender_zip: form.senderZip,
      colissimo_sender_city: form.senderCity,
    } as any);
    toast({ title: 'Configuration sauvegardée' });
  }

  async function testConnection() {
    setTestStatus('loading');
    setTestError('');
    try {
      const res = await supabase.functions.invoke('colissimo-proxy', {
        body: { action: 'testConnection' },
      });
      if (res.error) throw new Error(String(res.error));
      if (res.data?.success) {
        setTestStatus('ok');
      } else {
        setTestStatus('error');
        setTestError(res.data?.error || 'Connexion échouée');
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestError(e.message || 'Erreur inconnue');
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Connection status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Identifiants Colissimo Entreprise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Les identifiants Colissimo (login / mot de passe) sont stockés de façon sécurisée dans les secrets backend.
              Pour les modifier, contactez l'administrateur avec les clés{' '}
              <code className="bg-muted px-1 rounded text-xs">COLISSIMO_LOGIN</code> et{' '}
              <code className="bg-muted px-1 rounded text-xs">COLISSIMO_PASSWORD</code>.
            </p>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testStatus === 'loading'}
              className="gap-2"
            >
              {testStatus === 'loading'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              Tester la connexion
            </Button>
            {testStatus === 'ok' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-500 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Connexion réussie — identifiants valides
              </span>
            )}
            {testStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {testError || 'Connexion échouée'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sender address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Adresse expéditeur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ces informations apparaissent sur toutes les étiquettes Colissimo générées.
          </p>

          <div className="space-y-3">
            <div>
              <Label>Nom / Société</Label>
              <Input className="mt-1" placeholder="ex: LVTK6 Concept Store" value={form.senderName} onChange={handleChange('senderName')} />
            </div>
            <div>
              <Label>Adresse (ligne 2)</Label>
              <Input className="mt-1" placeholder="ex: 1 Rue de la Paix" value={form.senderAddress} onChange={handleChange('senderAddress')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code postal</Label>
                <Input className="mt-1" placeholder="75001" value={form.senderZip} onChange={handleChange('senderZip')} maxLength={5} />
              </div>
              <div>
                <Label>Ville</Label>
                <Input className="mt-1" placeholder="Paris" value={form.senderCity} onChange={handleChange('senderCity')} />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sauvegarder
          </Button>
        </CardContent>
      </Card>

      {/* Info box */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Modes de livraison supportés</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li><strong>DOM</strong> — Livraison à domicile Colissimo</li>
              <li><strong>A2P</strong> — Point relais (détecté automatiquement si l'adresse contient "point relais")</li>
            </ul>
            <p className="text-xs mt-2">
              Les étiquettes sont générées au format <strong>PDF 10×15 300dpi</strong>, prêtes pour imprimante thermique.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminColissimo() {
  const { data: settings } = useDesignSettings();
  const senderName = (settings as any)?.colissimo_sender_name || settings?.siteName || 'LVTK6 Concept Store';
  const senderAddress = (settings as any)?.colissimo_sender_address || '1 Rue de la Paix';
  const senderZip = (settings as any)?.colissimo_sender_zip || '75001';
  const senderCity = (settings as any)?.colissimo_sender_city || 'Paris';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Truck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Colissimo</h1>
          <p className="text-muted-foreground text-sm">Gestion des expéditions, points relais et étiquettes</p>
        </div>
      </div>

      <Tabs defaultValue="expeditions">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="expeditions" className="gap-2">
            <Package className="h-4 w-4" />
            Expéditions
          </TabsTrigger>
          <TabsTrigger value="relais" className="gap-2">
            <MapPin className="h-4 w-4" />
            Points Relais
          </TabsTrigger>
          <TabsTrigger value="configuration" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expeditions" className="mt-6">
          <ExpeditionsTab
            senderName={senderName}
            senderAddress={senderAddress}
            senderZip={senderZip}
            senderCity={senderCity}
          />
        </TabsContent>

        <TabsContent value="relais" className="mt-6">
          <PointsRelaisTab />
        </TabsContent>

        <TabsContent value="configuration" className="mt-6">
          <ConfigurationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
