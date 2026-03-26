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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Truck, MapPin, Settings2, ExternalLink, Download,
  CheckCircle2, XCircle, Loader2, Search, RefreshCw, Tag,
  Building2, AlertTriangle, Info, Printer, Trash2, ArrowUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Upload,
  FileText, Filter, X,
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useQueryClient } from '@tanstack/react-query';
import { useDesignSettings, useSaveDesignSettings } from '@/hooks/useDesignSettings';
import { useAdminConfig, useSaveAdminConfig } from '@/hooks/useAdminConfig';
import { Order } from '@/types';

// Leaflet
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface Bordereau {
  id: string;
  created_at: string;
  bordereau_date: string;
  package_count: number;
  tracking_numbers: string[];
  pdf_base64: string | null;
}

type SortKey = 'id' | 'orderNumber' | 'date' | 'customer' | 'address' | 'country' | 'shipping' | 'status';
type SortDir = 'asc' | 'desc';

const DAYS = [
  { key: 'horairesOuvertureLundi', label: 'Lun' },
  { key: 'horairesOuvertureMardi', label: 'Mar' },
  { key: 'horairesOuvertureMercredi', label: 'Mer' },
  { key: 'horairesOuvertureJeudi', label: 'Jeu' },
  { key: 'horairesOuvertureVendredi', label: 'Ven' },
  { key: 'horairesOuvertureSamedi', label: 'Sam' },
  { key: 'horairesOuvertureDimanche', label: 'Dim' },
];

const PAGE_SIZE = 20;

function formatDistance(meters: string) {
  const m = parseInt(meters);
  if (isNaN(m)) return '';
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function getShippingStatus(order: Order): 'to_ship' | 'in_transit' | 'delivered' {
  if (order.status === 'Delivered') return 'delivered';
  if (order.trackingNumber || order.status === 'Shipped') return 'in_transit';
  return 'to_ship';
}

function downloadPdf(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printPdf(base64: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url);
  if (win) setTimeout(() => win.print(), 500);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    Pending: { label: 'En attente', cls: 'text-yellow-600 border-yellow-500/40 bg-yellow-500/10' },
    Processing: { label: 'En cours', cls: 'text-blue-600 border-blue-500/40 bg-blue-500/10' },
    Shipped: { label: 'Expédiée', cls: 'text-indigo-600 border-indigo-500/40 bg-indigo-500/10' },
    Delivered: { label: 'Livrée', cls: 'text-green-600 border-green-500/40 bg-green-500/10' },
    Cancelled: { label: 'Annulée', cls: 'text-destructive border-destructive/40 bg-destructive/10' },
  };
  const entry = map[status] || { label: status, cls: 'text-muted-foreground border-border bg-muted' };
  return <Badge variant="outline" className={`text-xs ${entry.cls}`}>{entry.label}</Badge>;
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortHead({ label, sortKey, current, dir, onClick }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => onClick(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? 'text-primary' : 'text-muted-foreground/40'}`} />
      </span>
    </TableHead>
  );
}

// ─── Tab 1: Commandes ─────────────────────────────────────────────────────────

function CommandesTab({ senderName, senderAddress, senderZip, senderCity }: {
  senderName: string; senderAddress: string; senderZip: string; senderCity: string;
}) {
  const { toast } = useToast();
  const { data: orders = [] } = useOrders();
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [shippingFilter, setShippingFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [pdfCache, setPdfCache] = useState<Record<string, string>>({}); // orderId → base64
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPrintLoading, setBulkPrintLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const countries = Array.from(new Set(orders.map((o: Order) => o.customer?.country).filter(Boolean)));
  const shippingMethods = Array.from(new Set(orders.map((o: Order) => o.shippingCarrier || o.paymentMethod).filter(Boolean)));

  // Filter + sort
  const filtered = orders.filter((order: Order) => {
    const ss = getShippingStatus(order);
    const matchStatus = statusFilter === 'all' || statusFilter === ss;
    const matchCountry = countryFilter === 'all' || order.customer?.country === countryFilter;
    const matchShipping = shippingFilter === 'all' || order.shippingCarrier === shippingFilter || order.paymentMethod === shippingFilter;
    const matchSearch = !search ||
      order.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(search.toLowerCase()) ||
      order.trackingNumber?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchCountry && matchShipping && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = '', bv = '';
    if (sortKey === 'date') { av = a.date; bv = b.date; }
    else if (sortKey === 'orderNumber') { av = a.orderNumber; bv = b.orderNumber; }
    else if (sortKey === 'customer') { av = a.customer.name; bv = b.customer.name; }
    else if (sortKey === 'address') { av = a.customer.city; bv = b.customer.city; }
    else if (sortKey === 'country') { av = a.customer.country || ''; bv = b.customer.country || ''; }
    else if (sortKey === 'status') { av = a.status; bv = b.status; }
    const cmp = av.localeCompare(bv);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    to_ship: orders.filter((o: Order) => getShippingStatus(o) === 'to_ship').length,
    in_transit: orders.filter((o: Order) => getShippingStatus(o) === 'in_transit').length,
    delivered: orders.filter((o: Order) => getShippingStatus(o) === 'delivered').length,
  };

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === paginated.length && paginated.length > 0) setSelected(new Set());
    else setSelected(new Set(paginated.map((o: Order) => o.id)));
  };

  async function generateLabel(order: Order, isReturn = false) {
    setLoadingMap(l => ({ ...l, [order.id + (isReturn ? '_ret' : '')]: true }));
    try {
      const res = await supabase.functions.invoke('colissimo-proxy', {
        body: {
          action: 'generateLabel',
          senderName, senderAddress, senderZip, senderCity,
          isReturn,
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

      if (!isReturn) {
        await supabase.from('orders').update({
          tracking_number: trackingNumber,
          shipping_carrier: 'Colissimo',
          status: 'Shipped',
        }).eq('id', order.id);
      }

      if (pdfBase64) {
        setPdfCache(c => ({ ...c, [order.id + (isReturn ? '_ret' : '')]: pdfBase64 }));
        downloadPdf(pdfBase64, `etiquette_${isReturn ? 'retour_' : ''}${order.orderNumber}.pdf`);
      }

      toast({ title: isReturn ? 'Étiquette retour générée' : 'Étiquette générée', description: trackingNumber ? `N° suivi: ${trackingNumber}` : undefined });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingMap(l => ({ ...l, [order.id + (isReturn ? '_ret' : '')]: false }));
    }
  }

  async function deleteTrackingNumber(order: Order) {
    await supabase.from('orders').update({ tracking_number: null, shipping_carrier: null }).eq('id', order.id);
    setPdfCache(c => { const n = { ...c }; delete n[order.id]; return n; });
    toast({ title: 'Numéro de suivi supprimé' });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }

  async function handleBulkPrint() {
    const selectedOrders = paginated.filter((o: Order) => selected.has(o.id));
    if (!selectedOrders.length) return;
    setBulkPrintLoading(true);
    try {
      const pdfs: string[] = [];
      for (const order of selectedOrders) {
        const cacheKey = order.id;
        if (pdfCache[cacheKey]) {
          pdfs.push(pdfCache[cacheKey]);
        } else if (order.trackingNumber) {
          // No cached PDF — regenerate (retrigger via API)
          try {
            const res = await supabase.functions.invoke('colissimo-proxy', {
              body: {
                action: 'generateLabel',
                senderName, senderAddress, senderZip, senderCity,
                isReturn: false,
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
            if (res.data?.pdfBase64) {
              setPdfCache(c => ({ ...c, [cacheKey]: res.data.pdfBase64 }));
              pdfs.push(res.data.pdfBase64);
            }
          } catch {
            // skip orders where generation fails
          }
        } else {
          // No tracking yet — generate fresh label
          try {
            const res = await supabase.functions.invoke('colissimo-proxy', {
              body: {
                action: 'generateLabel',
                senderName, senderAddress, senderZip, senderCity,
                isReturn: false,
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
            if (res.data?.success && res.data.pdfBase64) {
              const { trackingNumber, pdfBase64 } = res.data;
              if (trackingNumber) {
                await supabase.from('orders').update({
                  tracking_number: trackingNumber,
                  shipping_carrier: 'Colissimo',
                  status: 'Shipped',
                }).eq('id', order.id);
              }
              setPdfCache(c => ({ ...c, [cacheKey]: pdfBase64 }));
              pdfs.push(pdfBase64);
            }
          } catch {
            // skip
          }
        }
      }

      if (!pdfs.length) {
        toast({ title: 'Aucune étiquette disponible', description: 'Aucune étiquette n\'a pu être générée pour la sélection.', variant: 'destructive' });
        return;
      }

      // Build combined print page
      const embedsHtml = pdfs.map((pdf, i) =>
        `<embed src="data:application/pdf;base64,${pdf}" type="application/pdf" width="100%" height="100%" style="display:block;${i < pdfs.length - 1 ? 'page-break-after:always;' : ''}"/>`
      ).join('\n');

      const html = `<!DOCTYPE html><html><head><title>Étiquettes Colissimo</title><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#fff}
        .page{width:10cm;height:15cm;page-break-after:always;overflow:hidden}
        .page:last-child{page-break-after:auto}
        embed{width:100%;height:100%}
        @media print{.page{page-break-after:always}}
      </style></head><body>
        ${pdfs.map((pdf, i) =>
          `<div class="page"><embed src="data:application/pdf;base64,${pdf}" type="application/pdf" width="100%" height="100%"/></div>`
        ).join('\n')}
        <script>window.onload=function(){setTimeout(function(){window.print();},600);}<\/script>
      </body></html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        toast({ title: 'Fenêtre bloquée', description: 'Autorisez les popups pour imprimer les étiquettes.', variant: 'destructive' });
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (e: any) {
      toast({ title: 'Erreur impression', description: e.message, variant: 'destructive' });
    } finally {
      setBulkPrintLoading(false);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    try {
      const { error } = await supabase.from('orders').delete().in('id', ids);
      if (error) throw error;
      toast({ title: `${ids.length} commande(s) supprimée(s)` });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelected(new Set());
      setDeleteConfirmOpen(false);
    } catch (e: any) {
      toast({ title: 'Erreur suppression', description: e.message, variant: 'destructive' });
    }
  }

  async function applyBulkAction() {
    if (!bulkAction || !selected.size) return;
    if (bulkAction === 'generate') {
      setBulkLoading(true);
      const toProcess = paginated.filter((o: Order) => selected.has(o.id) && getShippingStatus(o) === 'to_ship');
      for (const order of toProcess) await generateLabel(order);
      setSelected(new Set());
      setBulkLoading(false);
    } else if (bulkAction === 'print_bulk') {
      await handleBulkPrint();
    } else if (bulkAction === 'ship') {
      for (const id of selected) {
        await supabase.from('orders').update({ status: 'Shipped', shipping_carrier: 'Colissimo' }).eq('id', id);
      }
      toast({ title: `${selected.size} commande(s) marquée(s) expédiée(s)` });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelected(new Set());
    } else if (bulkAction === 'delete') {
      for (const id of selected) {
        await supabase.from('orders').update({ tracking_number: null, shipping_carrier: null }).eq('id', id);
      }
      toast({ title: `Suivi supprimé pour ${selected.size} commande(s)` });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelected(new Set());
    } else if (bulkAction === 'delete_orders') {
      setDeleteConfirmOpen(true);
      return; // don't reset bulkAction yet
    }
    setBulkAction('');
  }

  async function handleRefreshStatuses() {
    const inTransit = orders.filter((o: Order) => getShippingStatus(o) === 'in_transit' && o.trackingNumber);
    if (!inTransit.length) { toast({ title: 'Aucune commande en transit à mettre à jour' }); return; }
    setRefreshLoading(true);
    try {
      const res = await supabase.functions.invoke('colissimo-proxy', {
        body: {
          action: 'refreshTrackingStatuses',
          trackingNumbers: inTransit.map((o: Order) => ({ id: o.id, trackingNumber: o.trackingNumber })),
        },
      });
      if (res.error) throw new Error(String(res.error));
      const updated = res.data?.updated || 0;
      toast({ title: `Statuts mis à jour`, description: `${updated} commande(s) mise(s) à jour` });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (e: any) {
      toast({ title: 'Erreur mise à jour statuts', description: e.message, variant: 'destructive' });
    } finally {
      setRefreshLoading(false);
    }
  }

  async function handleImport() {
    if (!importText.trim()) return;
    setImportLoading(true);
    try {
      const lines = importText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const pairs = lines.map(line => {
        const [orderNumber, trackingNumber] = line.split(/[,;\t]/).map(s => s.trim());
        return { orderNumber, trackingNumber };
      }).filter(p => p.orderNumber && p.trackingNumber);

      let count = 0;
      for (const { orderNumber, trackingNumber } of pairs) {
        const { error } = await supabase
          .from('orders')
          .update({ tracking_number: trackingNumber, shipping_carrier: 'Colissimo' })
          .eq('order_number', orderNumber);
        if (!error) count++;
      }
      toast({ title: `Import réussi`, description: `${count} numéro(s) de suivi importé(s)` });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setImportOpen(false);
      setImportText('');
    } catch (e: any) {
      toast({ title: 'Erreur import', description: e.message, variant: 'destructive' });
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Page-level header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Commandes Colissimo</h2>
          <p className="text-sm text-muted-foreground">
            {counts.to_ship} à expédier · {counts.in_transit} en transit · {counts.delivered} livrées
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleRefreshStatuses} disabled={refreshLoading} className="gap-1.5">
            {refreshLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Mettre à jour les statuts
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Importer des numéros de suivi
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
        {/* Bulk actions */}
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="h-8 w-52 text-xs">
            <SelectValue placeholder="Actions groupées" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="generate">Générer les étiquettes</SelectItem>
            <SelectItem value="print_bulk">Imprimer les étiquettes</SelectItem>
            <SelectItem value="ship">Marquer expédiées</SelectItem>
            <SelectItem value="delete">Supprimer les suivis</SelectItem>
            <SelectItem value="delete_orders">Supprimer les commandes</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={applyBulkAction} disabled={!bulkAction || !selected.size || bulkLoading || bulkPrintLoading}>
          {(bulkLoading || bulkPrintLoading) ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Appliquer
        </Button>

        <button
          className="flex items-center gap-1.5 text-xs text-primary hover:underline ml-1"
          onClick={() => setShowFilters(f => !f)}
        >
          <Filter className="h-3.5 w-3.5" />
          {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
        </button>

        {/* spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-8 h-8 text-xs w-48"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{sorted.length} éléments</span>
          <button onClick={() => setPage(1)} disabled={page === 1} className="p-1 hover:text-foreground disabled:opacity-30"><ChevronsLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 hover:text-foreground disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <span>{page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 hover:text-foreground disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1 hover:text-foreground disabled:opacity-30"><ChevronsRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 border border-border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Statut expédition</Label>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="to_ship">À expédier</SelectItem>
                <SelectItem value="in_transit">En transit</SelectItem>
                <SelectItem value="delivered">Livrées</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Pays</Label>
            <Select value={countryFilter} onValueChange={v => { setCountryFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Méthode</Label>
            <Select value={shippingFilter} onValueChange={v => { setShippingFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {shippingMethods.map(m => <SelectItem key={m} value={m!}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => { setStatusFilter('all'); setCountryFilter('all'); setShippingFilter('all'); setSearch(''); setPage(1); }}
          >
            <X className="h-3 w-3" /> Réinitialiser
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-8 pl-3">
                <Checkbox
                  checked={paginated.length > 0 && selected.size === paginated.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <SortHead label="ID" sortKey="id" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHead label="N° commande" sortKey="orderNumber" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHead label="Date" sortKey="date" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHead label="Client" sortKey="customer" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHead label="Adresse" sortKey="address" current={sortKey} dir={sortDir} onClick={handleSort} />
              <SortHead label="Pays" sortKey="country" current={sortKey} dir={sortDir} onClick={handleSort} />
              <TableHead className="whitespace-nowrap text-xs">Méthode de livraison</TableHead>
              <SortHead label="Statut" sortKey="status" current={sortKey} dir={sortDir} onClick={handleSort} />
              <TableHead className="min-w-[220px]">Étiquettes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  Aucune commande correspondant aux filtres
                </TableCell>
              </TableRow>
            )}
            {paginated.map((order: Order) => {
              const shippingStatus = getShippingStatus(order);
              const isLoadingLabel = loadingMap[order.id];
              const isLoadingReturn = loadingMap[order.id + '_ret'];
              const cachedPdf = pdfCache[order.id];

              return (
                <TableRow key={order.id} className={selected.has(order.id) ? 'bg-primary/5' : ''}>
                  <TableCell className="pl-3">
                    <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                  </TableCell>

                  {/* ID (short) */}
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {order.id.slice(0, 8)}
                  </TableCell>

                  {/* Order number */}
                  <TableCell>
                    <span className="font-semibold text-sm text-primary">#{order.orderNumber}</span>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(order.date).toLocaleDateString('fr-FR')}
                  </TableCell>

                  {/* Client */}
                  <TableCell>
                    <div className="font-medium text-sm leading-tight">{order.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                  </TableCell>

                  {/* Address */}
                  <TableCell>
                    <div className="text-xs leading-tight">{order.customer.address}</div>
                    <div className="text-xs text-muted-foreground">{order.customer.zip} {order.customer.city}</div>
                  </TableCell>

                  {/* Country */}
                  <TableCell className="text-sm font-mono">{order.customer.country || 'FR'}</TableCell>

                  {/* Shipping method */}
                  <TableCell className="text-xs text-muted-foreground">
                    {order.shippingCarrier ? (
                      <span className="text-foreground">{order.shippingCarrier}</span>
                    ) : order.paymentMethod ? (
                      order.paymentMethod
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>

                  {/* Order status */}
                  <TableCell><OrderStatusBadge status={order.status} /></TableCell>

                  {/* Étiquettes column */}
                  <TableCell>
                    <div className="space-y-1.5">
                      {/* Aller label */}
                      {!order.trackingNumber ? (
                        <button
                          className="flex items-center gap-1 text-xs text-green-600 hover:underline disabled:opacity-50 font-medium"
                          onClick={() => generateLabel(order)}
                          disabled={isLoadingLabel}
                        >
                          {isLoadingLabel
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <span className="text-green-600 font-bold">+</span>}
                          Générer l'étiquette aller
                        </button>
                      ) : (
                        <div className="space-y-1">
                          {/* Tracking number + actions */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                              href={`https://www.laposte.fr/particulier/outils/suivre-vos-envois?code=${order.trackingNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-green-600 hover:underline font-medium"
                            >
                              {order.trackingNumber}
                            </a>
                            <div className="flex items-center gap-0.5">
                              {/* Info */}
                              <a
                                href={`https://www.laposte.fr/particulier/outils/suivre-vos-envois?code=${order.trackingNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Suivre le colis"
                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </a>
                              {/* Print */}
                              {cachedPdf && (
                                <button
                                  title="Imprimer l'étiquette"
                                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                  onClick={() => printPdf(cachedPdf)}
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {/* Download */}
                              {cachedPdf && (
                                <button
                                  title="Télécharger l'étiquette"
                                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                  onClick={() => downloadPdf(cachedPdf, `etiquette_${order.orderNumber}.pdf`)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {/* Delete */}
                              <button
                                title="Supprimer le numéro de suivi"
                                className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteTrackingNumber(order)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Return label */}
                          <button
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
                            onClick={() => generateLabel(order, true)}
                            disabled={isLoadingReturn}
                          >
                            {isLoadingReturn
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <span className="font-bold">+</span>}
                            Générer l'étiquette retour
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <button onClick={() => setPage(1)} disabled={page === 1} className="p-1 hover:text-foreground disabled:opacity-30"><ChevronsLeft className="h-4 w-4" /></button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 hover:text-foreground disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} sur {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 hover:text-foreground disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1 hover:text-foreground disabled:opacity-30"><ChevronsRight className="h-4 w-4" /></button>
        </div>
      )}

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importer des numéros de suivi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Collez ou saisissez vos numéros de suivi, un par ligne au format :<br />
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">N°_COMMANDE,N°_SUIVI</code>
            </p>
            <Textarea
              placeholder={"1234,8R01234567890\n5678,8R09876543210"}
              className="font-mono text-xs h-40"
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Annuler</Button>
            <Button onClick={handleImport} disabled={importLoading || !importText.trim()} className="gap-2">
              {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete orders confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={open => { setDeleteConfirmOpen(open); if (!open) setBulkAction(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer {selected.size} commande{selected.size > 1 ? 's' : ''} ?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Cette action est <strong className="text-foreground">irréversible</strong>. Les commandes sélectionnées seront définitivement supprimées de la base de données.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setBulkAction(''); }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 2: Création de bordereau ─────────────────────────────────────────────

function CreationBordereauTab({ senderName, senderAddress, senderZip, senderCity }: {
  senderName: string; senderAddress: string; senderZip: string; senderCity: string;
}) {
  const { toast } = useToast();
  const { data: orders = [] } = useOrders();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const [bordereauDate, setBordereauDate] = useState(today);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  // Eligible: shipped with tracking, not yet in a bordereau today
  const eligible = orders.filter((o: Order) => o.trackingNumber && o.status === 'Shipped');

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === eligible.length) setSelected(new Set());
    else setSelected(new Set(eligible.map((o: Order) => o.id)));
  };

  async function handleGenerate() {
    if (!selected.size) { toast({ title: 'Sélectionnez au moins un colis' }); return; }
    setGenerating(true);
    try {
      const selectedOrders = eligible.filter((o: Order) => selected.has(o.id));
      const trackingNumbers = selectedOrders.map((o: Order) => o.trackingNumber!);

      // Save bordereau to DB
      const { error } = await supabase.from('colissimo_bordereaux' as any).insert({
        bordereau_date: bordereauDate,
        package_count: selected.size,
        tracking_numbers: trackingNumbers,
        pdf_base64: null,
      });
      if (error) throw error;

      // Generate PDF from edge function
      const res = await supabase.functions.invoke('colissimo-proxy', {
        body: {
          action: 'generateBordereau',
          senderName, senderAddress, senderZip, senderCity,
          bordereauDate,
          trackingNumbers,
        },
      });

      if (res.data?.pdfBase64) {
        // Update with PDF
        await supabase.from('colissimo_bordereaux' as any).update({ pdf_base64: res.data.pdfBase64 }).eq('bordereau_date', bordereauDate).order('created_at', { ascending: false }).limit(1);
        downloadPdf(res.data.pdfBase64, `bordereau_${bordereauDate}.pdf`);
      } else {
        // Fallback: generate a simple text bordereau
        const lines = [
          `BORDEREAU DE DÉPÔT COLISSIMO — ${new Date(bordereauDate).toLocaleDateString('fr-FR')}`,
          `Expéditeur: ${senderName}`,
          `Adresse: ${senderAddress}, ${senderZip} ${senderCity}`,
          '',
          `Nombre de colis: ${selected.size}`,
          '',
          'Numéros de suivi:',
          ...trackingNumbers.map((t, i) => `  ${i + 1}. ${t}`),
          '',
          'Signature: ___________________________',
          'Date de dépôt: ___________________________',
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bordereau_${bordereauDate}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: 'Bordereau généré', description: `${selected.size} colis — ${new Date(bordereauDate).toLocaleDateString('fr-FR')}` });
      queryClient.invalidateQueries({ queryKey: ['colissimo_bordereaux'] });
      setSelected(new Set());
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Créer un bordereau de dépôt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <Label className="text-sm">Date du bordereau</Label>
              <Input
                type="date"
                className="mt-1 w-44"
                value={bordereauDate}
                onChange={e => setBordereauDate(e.target.value)}
              />
            </div>
            <div className="pt-5 text-sm text-muted-foreground">
              {eligible.length} colis éligibles (expédiés avec numéro de suivi)
            </div>
          </div>

          {eligible.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Aucun colis éligible.<br />Les commandes doivent être en statut "Expédiée" avec un numéro de suivi.</p>
            </div>
          ) : (
            <>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-8 pl-3">
                        <Checkbox
                          checked={selected.size === eligible.length && eligible.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Commande</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>N° suivi</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligible.map((order: Order) => (
                      <TableRow key={order.id} className={selected.has(order.id) ? 'bg-primary/5' : ''}>
                        <TableCell className="pl-3">
                          <Checkbox checked={selected.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                        </TableCell>
                        <TableCell className="font-semibold text-primary">#{order.orderNumber}</TableCell>
                        <TableCell>{order.customer.name}</TableCell>
                        <TableCell className="font-mono text-xs text-green-600">{order.trackingNumber}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(order.date).toLocaleDateString('fr-FR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {selected.size} colis sélectionné{selected.size > 1 ? 's' : ''}
                </p>
                <Button onClick={handleGenerate} disabled={generating || !selected.size} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Générer le bordereau
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 3: Historique des bordereaux ─────────────────────────────────────────

function HistoriqueBordereauxTab() {
  const { toast } = useToast();
  const [bordereaux, setBordereaux] = useState<Bordereau[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailBordereau, setDetailBordereau] = useState<Bordereau | null>(null);

  async function fetchBordereaux() {
    setLoading(true);
    const { data, error } = await (supabase.from('colissimo_bordereaux' as any).select('*').order('created_at', { ascending: false }) as any);
    if (!error) setBordereaux(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchBordereaux(); }, []);

  async function handleDelete(id: string) {
    const { error } = await (supabase.from('colissimo_bordereaux' as any).delete().eq('id', id) as any);
    if (error) { toast({ title: 'Erreur suppression', variant: 'destructive' }); return; }
    toast({ title: 'Bordereau supprimé' });
    fetchBordereaux();
  }

  function downloadBordereauTxt(b: Bordereau) {
    const lines = [
      `BORDEREAU DE DÉPÔT COLISSIMO — ${new Date(b.bordereau_date).toLocaleDateString('fr-FR')}`,
      '',
      `Nombre de colis: ${b.package_count}`,
      `Créé le: ${new Date(b.created_at).toLocaleString('fr-FR')}`,
      '',
      'Numéros de suivi:',
      ...(b.tracking_numbers || []).map((t: string, i: number) => `  ${i + 1}. ${t}`),
      '',
      'Signature: ___________________________',
      'Date de dépôt: ___________________________',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bordereau_${b.bordereau_date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Historique des bordereaux</h2>
        <Button variant="outline" size="sm" onClick={fetchBordereaux} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Date</TableHead>
              <TableHead>Nombre de colis</TableHead>
              <TableHead>Numéros de suivi</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!loading && bordereaux.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>Aucun bordereau généré pour l'instant</p>
                </TableCell>
              </TableRow>
            )}
            {bordereaux.map((b) => (
              <TableRow key={b.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailBordereau(b)}>
                <TableCell className="font-medium">
                  {new Date(b.bordereau_date).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{b.package_count} colis</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {(b.tracking_numbers || []).slice(0, 3).map((t: string) => (
                      <span key={t} className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                    {(b.tracking_numbers || []).length > 3 && (
                      <span className="text-xs text-muted-foreground">+{(b.tracking_numbers || []).length - 3}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(b.created_at).toLocaleString('fr-FR')}
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {b.pdf_base64 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => downloadPdf(b.pdf_base64!, `bordereau_${b.bordereau_date}.pdf`)}
                      >
                        <Download className="h-3 w-3" />
                        PDF
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-7"
                      onClick={() => downloadBordereauTxt(b)}
                    >
                      <Download className="h-3 w-3" />
                      TXT
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      onClick={() => handleDelete(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bordereau detail dialog */}
      <Dialog open={!!detailBordereau} onOpenChange={open => { if (!open) setDetailBordereau(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bordereau du {detailBordereau ? new Date(detailBordereau.bordereau_date).toLocaleDateString('fr-FR') : ''}
            </DialogTitle>
          </DialogHeader>
          {detailBordereau && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Colis:</span>
                <Badge variant="secondary">{detailBordereau.package_count}</Badge>
                <span className="text-muted-foreground">Créé le:</span>
                <span>{new Date(detailBordereau.created_at).toLocaleString('fr-FR')}</span>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Numéros de suivi ({(detailBordereau.tracking_numbers || []).length})</p>
                <div className="max-h-60 overflow-y-auto space-y-1.5 border border-border rounded-lg p-3">
                  {(detailBordereau.tracking_numbers || []).map((t: string, i: number) => (
                    <div key={t} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground text-xs">{i + 1}.</span>
                      <a
                        href={`https://www.laposte.fr/particulier/outils/suivre-vos-envois?code=${t}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline flex-1"
                      >
                        {t}
                      </a>
                      <a
                        href={`https://www.laposte.fr/particulier/outils/suivre-vos-envois?code=${t}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                {detailBordereau.pdf_base64 && (
                  <Button variant="outline" className="gap-1.5" onClick={() => downloadPdf(detailBordereau.pdf_base64!, `bordereau_${detailBordereau.bordereau_date}.pdf`)}>
                    <Download className="h-4 w-4" />
                    Télécharger PDF
                  </Button>
                )}
                <Button variant="outline" className="gap-1.5" onClick={() => downloadBordereauTxt(detailBordereau)}>
                  <Download className="h-4 w-4" />
                  Télécharger TXT
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 4: Points Relais ─────────────────────────────────────────────────────

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
          <div className="lg:col-span-2 rounded-xl overflow-hidden border border-border h-full">
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ width: '100%', height: '100%' }} ref={mapRef}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {points.filter(hasCoords).map(p => (
                <Marker key={p.identifiant} position={[parseFloat(p.lat), parseFloat(p.lng)]} eventHandlers={{ click: () => selectPoint(p.identifiant) }}>
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

// ─── Tab 5: Configuration ─────────────────────────────────────────────────────

function ConfigurationTab() {
  const { toast } = useToast();
  const { data: adminConfig } = useAdminConfig();
  const saveAdminConfig = useSaveAdminConfig();
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const [form, setForm] = useState({
    senderName: '',
    senderAddress: '',
    senderZip: '',
    senderCity: '',
  });

  useEffect(() => {
    if (adminConfig) {
      setForm({
        senderName: adminConfig.colissimoSenderName || '',
        senderAddress: adminConfig.colissimoSenderAddress || '',
        senderZip: adminConfig.colissimoSenderZip || '',
        senderCity: adminConfig.colissimoSenderCity || '',
      });
    }
  }, [adminConfig]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSave() {
    await saveAdminConfig.mutateAsync({
      ...adminConfig,
      colissimoSenderName: form.senderName,
      colissimoSenderAddress: form.senderAddress,
      colissimoSenderZip: form.senderZip,
      colissimoSenderCity: form.senderCity,
    });
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
      if (res.data?.success) setTestStatus('ok');
      else { setTestStatus('error'); setTestError(res.data?.error || 'Connexion échouée'); }
    } catch (e: any) {
      setTestStatus('error');
      setTestError(e.message || 'Erreur inconnue');
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
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
              Clés à configurer :{' '}
              <code className="bg-muted px-1 rounded text-xs">COLISSIMO_LOGIN</code> et{' '}
              <code className="bg-muted px-1 rounded text-xs">COLISSIMO_PASSWORD</code>.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" onClick={testConnection} disabled={testStatus === 'loading'} className="gap-2">
              {testStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tester la connexion
            </Button>
            {testStatus === 'ok' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-500 font-medium">
                <CheckCircle2 className="h-4 w-4" />Connexion réussie
              </span>
            )}
            {testStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />{testError || 'Connexion échouée'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Adresse expéditeur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Ces informations apparaissent sur toutes les étiquettes Colissimo.</p>
          <div className="space-y-3">
            <div>
              <Label>Nom / Société</Label>
              <Input className="mt-1" placeholder="ex: LVTK6 Concept Store" value={form.senderName} onChange={handleChange('senderName')} />
            </div>
            <div>
              <Label>Adresse</Label>
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
          <Button onClick={handleSave} disabled={saveAdminConfig.isPending} className="gap-2">
            {saveAdminConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sauvegarder
          </Button>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Modes supportés</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li><strong>DOM</strong> — Livraison à domicile Colissimo</li>
              <li><strong>A2P</strong> — Point relais (auto-détecté si l'adresse contient "point relais")</li>
              <li><strong>REPA</strong> — Retour expéditeur</li>
            </ul>
            <p className="text-xs mt-2">Étiquettes au format <strong>PDF 10×15 300dpi</strong>, prêtes pour imprimante thermique.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminColissimo() {
  const { data: adminConfig } = useAdminConfig();
  const { data: settings } = useDesignSettings();
  const senderName = adminConfig?.colissimoSenderName || settings?.siteName || 'LVTK6 Concept Store';
  const senderAddress = adminConfig?.colissimoSenderAddress || '1 Rue de la Paix';
  const senderZip = adminConfig?.colissimoSenderZip || '75001';
  const senderCity = adminConfig?.colissimoSenderCity || 'Paris';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Truck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Colissimo</h1>
          <p className="text-muted-foreground text-sm">Gestion des expéditions, bordereaux, points relais et étiquettes</p>
        </div>
      </div>

      <Tabs defaultValue="commandes">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="commandes" className="gap-2 text-xs">
            <Package className="h-4 w-4" />
            Commandes
          </TabsTrigger>
          <TabsTrigger value="bordereau" className="gap-2 text-xs">
            <FileText className="h-4 w-4" />
            Création de bordereau
          </TabsTrigger>
          <TabsTrigger value="historique" className="gap-2 text-xs">
            <Tag className="h-4 w-4" />
            Historique des bordereaux
          </TabsTrigger>
          <TabsTrigger value="relais" className="gap-2 text-xs">
            <MapPin className="h-4 w-4" />
            Points Relais
          </TabsTrigger>
          <TabsTrigger value="configuration" className="gap-2 text-xs">
            <Settings2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commandes" className="mt-6">
          <CommandesTab senderName={senderName} senderAddress={senderAddress} senderZip={senderZip} senderCity={senderCity} />
        </TabsContent>

        <TabsContent value="bordereau" className="mt-6">
          <CreationBordereauTab senderName={senderName} senderAddress={senderAddress} senderZip={senderZip} senderCity={senderCity} />
        </TabsContent>

        <TabsContent value="historique" className="mt-6">
          <HistoriqueBordereauxTab />
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
