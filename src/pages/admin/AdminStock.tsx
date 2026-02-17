import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { InventoryProductDialog } from '@/components/admin/InventoryProductDialog';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3, Package, Store, ArrowLeftRight, AlertTriangle,
  RefreshCw, TrendingUp, TrendingDown, Search, Filter,
  Upload, Plus, Pencil, Trash2, FileText, X, Check, FileSpreadsheet,
  ChevronDown, ChevronRight, Download
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

type Location = {
  id: string; name: string; type: string; city: string | null; address: string | null; is_active: boolean;
};
type InventoryItem = {
  id: string; product_id: string; sku: string; name: string; threshold: number; channel: string;
};
type StockLevel = {
  id: string; inventory_id: string; location_id: string; quantity: number; reserved: number;
  last_synced_at: string | null; size: string | null; color: string | null;
  stocked_at: string | null;
};
type Transfer = {
  id: string; inventory_id: string; from_location_id: string; to_location_id: string;
  quantity: number; status: string; notes: string | null; created_at: string; created_by: string;
};
type ProductRow = {
  id: string; name: string; sku: string; sizes: string[] | null; colors: string[] | null;
  image: string; description: string | null; color_options: any;
};

// ── Color map for swatches ──
const COLOR_HEX_MAP: Record<string, string> = {
  'BLACK': '#000000', 'NOIR': '#000000',
  'WHITE': '#FFFFFF', 'BLANC': '#FFFFFF',
  'RED': '#EF4444', 'ROUGE': '#EF4444',
  'BLUE': '#3B82F6', 'BLEU': '#3B82F6',
  'NAVY': '#1E3A5F', 'MARINE': '#1E3A5F',
  'GREEN': '#22C55E', 'VERT': '#22C55E',
  'YELLOW': '#EAB308', 'JAUNE': '#EAB308',
  'ORANGE': '#F97316',
  'PINK': '#EC4899', 'ROSE': '#EC4899',
  'PURPLE': '#A855F7', 'VIOLET': '#A855F7',
  'GREY': '#9CA3AF', 'GRAY': '#9CA3AF', 'GRIS': '#9CA3AF',
  'GREY LIGHT': '#D1D5DB', 'GRAY LIGHT': '#D1D5DB', 'GRIS CLAIR': '#D1D5DB',
  'GREY DARK': '#4B5563', 'GRAY DARK': '#4B5563', 'GRIS FONCE': '#4B5563',
  'BROWN': '#92400E', 'MARRON': '#92400E',
  'BEIGE': '#D2B48C',
  'CREAM': '#FFFDD0', 'CREME': '#FFFDD0',
  'KHAKI': '#BDB76B', 'KAKI': '#BDB76B',
  'BURGUNDY': '#800020', 'BORDEAUX': '#800020',
  'CORAL': '#FF7F50', 'CORAIL': '#FF7F50',
  'TURQUOISE': '#40E0D0',
  'GOLD': '#FFD700', 'OR': '#FFD700',
  'SILVER': '#C0C0C0', 'ARGENT': '#C0C0C0',
  'TAN': '#D2B48C', 'CAMEL': '#C19A6B',
};

function getColorHex(colorName: string): string {
  const upper = colorName.toUpperCase().trim();
  return COLOR_HEX_MAP[upper] || '#888888';
}

function ColorSwatch({ color, size = 14 }: { color: string; size?: number }) {
  const hex = getColorHex(color);
  const isLight = ['WHITE', 'BLANC', 'CREAM', 'CREME', 'BEIGE', 'YELLOW', 'JAUNE'].includes(color.toUpperCase().trim());
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: hex,
        border: isLight ? '1px solid hsl(var(--border))' : 'none',
      }}
      title={color}
    />
  );
}

const VIEWS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'inventory', label: 'Inventaire Global', icon: Package },
  { key: 'boutiques', label: 'Boutiques', icon: Store },
  { key: 'transfers', label: 'Transferts', icon: ArrowLeftRight },
] as const;

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))', 'hsl(var(--destructive))'];

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } };

export default function AdminStock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<string>('dashboard');
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const fetchAll = async () => {
    setLoading(true);
    const [locRes, invRes, slRes, trRes, prodRes] = await Promise.all([
      supabase.from('locations').select('*').order('name'),
      supabase.from('inventory').select('*').order('name'),
      supabase.from('stock_levels').select('*'),
      supabase.from('stock_transfers').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('products').select('id, name, sku, sizes, colors, image, description, color_options'),
    ]);
    if (locRes.data) setLocations(locRes.data as Location[]);
    if (invRes.data) setInventory(invRes.data as InventoryItem[]);
    if (slRes.data) setStockLevels(slRes.data as unknown as StockLevel[]);
    if (trRes.data) setTransfers(trRes.data as Transfer[]);
    if (prodRes.data) setProducts(prodRes.data as ProductRow[]);
    setLastSync(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Realtime + 10min refresh
  useEffect(() => {
    const interval = setInterval(fetchAll, 10 * 60 * 1000);
    const channel = supabase
      .channel('stock-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_levels' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transfers' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => fetchAll())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  // Derived data
  const webLocation = locations.find(l => l.type === 'web');
  const b2bLocation = locations.find(l => l.type === 'b2b');
  const boutiqueLocations = locations.filter(l => l.type === 'boutique');

  const totalStockByType = useMemo(() => {
    const web = stockLevels.filter(sl => sl.location_id === webLocation?.id).reduce((s, sl) => s + sl.quantity, 0);
    const boutique = stockLevels.filter(sl => boutiqueLocations.some(bl => bl.id === sl.location_id)).reduce((s, sl) => s + sl.quantity, 0);
    const b2b = stockLevels.filter(sl => sl.location_id === b2bLocation?.id).reduce((s, sl) => s + sl.quantity, 0);
    return { web, boutique, b2b, total: web + boutique + b2b };
  }, [stockLevels, locations]);

  const lowStockItems = useMemo(() => {
    return inventory.filter(inv => {
      const totalQty = stockLevels.filter(sl => sl.inventory_id === inv.id).reduce((s, sl) => s + sl.quantity, 0);
      return totalQty < inv.threshold;
    });
  }, [inventory, stockLevels]);

  const stockPerBoutique = useMemo(() => {
    return boutiqueLocations.map(loc => ({
      name: loc.name.length > 20 ? loc.name.slice(0, 18) + '…' : loc.name,
      fullName: loc.name,
      stock: stockLevels.filter(sl => sl.location_id === loc.id).reduce((s, sl) => s + sl.quantity, 0),
    })).sort((a, b) => b.stock - a.stock).slice(0, 5);
  }, [stockLevels, boutiqueLocations]);

  const filteredInventory = useMemo(() => {
    let items = inventory;
    if (channelFilter !== 'all') items = items.filter(i => i.channel === channelFilter || i.channel === 'both');
    if (searchTerm) items = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return items;
  }, [inventory, channelFilter, searchTerm]);

  const getStockForItem = (invId: string, locId?: string) => {
    const levels = stockLevels.filter(sl => sl.inventory_id === invId && (locId ? sl.location_id === locId : true));
    return levels.reduce((s, sl) => s + sl.quantity, 0);
  };

  if (loading) return <StockSkeleton />;

  return (
    <div className="flex gap-6">
      {/* Sidebar nav */}
      <div className="hidden md:flex flex-col gap-1 w-52 shrink-0">
        {VIEWS.map(v => (
          <Button
            key={v.key}
            variant={view === v.key ? 'default' : 'ghost'}
            className="justify-start gap-3"
            onClick={() => setView(v.key)}
          >
            <v.icon className="h-4 w-4" />
            {v.label}
          </Button>
        ))}
        <div className="mt-4 px-3">
          <p className="text-xs text-muted-foreground">Dernière sync</p>
          <p className="text-xs font-mono text-muted-foreground">{lastSync.toLocaleTimeString('fr-FR')}</p>
          <Button variant="outline" size="sm" className="mt-2 w-full gap-2" onClick={fetchAll}>
            <RefreshCw className="h-3 w-3" /> Rafraîchir
          </Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden w-full">
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="w-full grid grid-cols-4">
            {VIEWS.map(v => <TabsTrigger key={v.key} value={v.key}><v.icon className="h-4 w-4" /></TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && <DashboardView key="dash" totalStock={totalStockByType} lowStockItems={lowStockItems} stockPerBoutique={stockPerBoutique} inventory={inventory} stockLevels={stockLevels} />}
          {view === 'inventory' && <InventoryView key="inv" items={filteredInventory} stockLevels={stockLevels} locations={locations} channelFilter={channelFilter} setChannelFilter={setChannelFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm} getStockForItem={getStockForItem} inventory={inventory} onRefresh={fetchAll} products={products} />}
          {view === 'boutiques' && <BoutiquesView key="bout" boutiques={boutiqueLocations} allLocations={locations} stockLevels={stockLevels} inventory={inventory} products={products} onRefresh={fetchAll} />}
          {view === 'transfers' && <TransfersView key="trans" transfers={transfers} locations={locations} inventory={inventory} user={user} onCreated={fetchAll} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Dashboard ──
function DashboardView({ totalStock, lowStockItems, stockPerBoutique, inventory, stockLevels }: any) {
  const pieData = [
    { name: 'Web', value: totalStock.web },
    { name: 'Boutiques', value: totalStock.boutique },
    { name: 'B2B', value: totalStock.b2b },
  ].filter(d => d.value > 0);

  return (
    <motion.div {...fadeIn} transition={{ duration: 0.4 }} className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard Stock</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Stock Total" value={totalStock.total} icon={<Package className="h-5 w-5" />} />
        <KpiCard title="Stock Web" value={totalStock.web} icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard title="Stock Boutiques" value={totalStock.boutique} icon={<Store className="h-5 w-5" />} />
        <KpiCard title="Alertes Stock" value={lowStockItems.length} icon={<AlertTriangle className="h-5 w-5" />} variant="destructive" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Répartition Web vs Boutiques vs B2B</CardTitle></CardHeader>
          <CardContent className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center pt-20">Aucune donnée de stock disponible</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Top 5 Boutiques par Stock</CardTitle></CardHeader>
          <CardContent className="h-64">
            {stockPerBoutique.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockPerBoutique}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center pt-20">Aucune donnée</p>}
          </CardContent>
        </Card>
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Alertes Stock Bas</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item: any) => (
                <Badge key={item.id} variant="destructive" className="animate-pulse">
                  {item.name} — Seuil: {item.threshold}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function KpiCard({ title, value, icon, variant }: { title: string; value: number; icon: React.ReactNode; variant?: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <Card className={cn("relative overflow-hidden", variant === 'destructive' && value > 0 && "border-destructive/50")}>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/30 pointer-events-none" />
        <CardContent className="p-6 flex items-center justify-between relative">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold mt-1">{value.toLocaleString('fr-FR')}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">{icon}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Inventory with Import ──
function InventoryView({ items, stockLevels, locations, channelFilter, setChannelFilter, searchTerm, setSearchTerm, getStockForItem, inventory, onRefresh, products }: any) {
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ inventoryId: string; productId: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (item: InventoryItem) => {
    setEditTarget({ inventoryId: item.id, productId: item.product_id });
    setProductDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('stock_levels').delete().eq('inventory_id', deleteTarget.id);
      await supabase.from('inventory').delete().eq('id', deleteTarget.id);
      await supabase.from('products').delete().eq('id', deleteTarget.product_id);
      toast({ title: 'Produit supprimé de l\'inventaire' });
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedTypes = ['pdf', 'csv', 'xls', 'xlsx'];
    if (!allowedTypes.includes(ext)) {
      toast({ title: 'Format non supporté', description: 'Formats acceptés : PDF, CSV, XLS, XLSX', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux', description: 'Maximum 10 Mo', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setExtractedProducts([]);
    setSelectedIds(new Set());

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const fileType = ext === 'xlsx' || ext === 'xls' ? 'xlsx' : ext;

      const { data, error } = await supabase.functions.invoke('parse-products-pdf', {
        body: { fileBase64: base64, fileType },
      });

      if (error) throw error;
      if (data?.products?.length > 0) {
        setExtractedProducts(data.products);
        setSelectedIds(new Set(data.products.map((_: any, i: number) => i)));
        toast({ title: `${data.products.length} produits extraits` });
      } else {
        toast({ title: 'Aucun produit trouvé', description: 'Le fichier ne contient pas de produits exploitables', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur d\'import', description: err.message || 'Erreur inconnue', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const toggleProduct = (idx: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === extractedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(extractedProducts.map((_, i) => i)));
    }
  };

  const handleSaveImported = async () => {
    const selected = extractedProducts.filter((_, i) => selectedIds.has(i));
    if (selected.length === 0) return;

    setSaving(true);
    try {
      let created = 0;
      for (const p of selected) {
        const { data: prod, error: prodErr } = await supabase.from('products').insert({
          name: p.name || 'Sans nom',
          sku: p.sku || `IMP-${Date.now()}`,
          price: p.price || 0,
          sale_price: p.salePrice || null,
          category: p.category || 'Autre',
          description: p.description || '',
          material: p.material || '',
          subtitle: p.subtitle || '',
          sizes: p.sizes || [],
          colors: p.colors || [],
          stock: p.stock || 50,
          image: '/placeholder.svg',
        }).select('id').single();

        if (prodErr || !prod) continue;

        const { data: inv, error: invErr } = await supabase.from('inventory').insert({
          product_id: prod.id,
          sku: p.sku || `IMP-${Date.now()}`,
          name: p.name || 'Sans nom',
          threshold: 10,
          channel: 'b2c',
        }).select('id').single();

        if (invErr || !inv) continue;

        const webLoc = locations.find((l: Location) => l.type === 'web');
        if (webLoc) {
          await supabase.from('stock_levels').insert({
            inventory_id: inv.id,
            location_id: webLoc.id,
            quantity: p.stock || 50,
            reserved: 0,
          });
        }

        created++;
      }

      toast({ title: `${created} produits importés avec succès` });
      setImportOpen(false);
      setExtractedProducts([]);
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div {...fadeIn} transition={{ duration: 0.4 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Inventaire Global</h2>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => { setEditTarget(null); setProductDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Ajouter un produit
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Importer fichier
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-48" />
          </div>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
              <SelectItem value="both">B2B+B2C</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Image</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Tailles</TableHead>
              <TableHead>Couleurs</TableHead>
              <TableHead className="text-right">Stock Total</TableHead>
              <TableHead className="text-right">Seuil</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Aucun produit en inventaire</TableCell></TableRow>
            ) : items.map((item: InventoryItem) => {
              const total = getStockForItem(item.id);
              const isLow = total < item.threshold;
              const matchedProduct = (products as ProductRow[])?.find(p => p.id === item.product_id);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {matchedProduct?.image && matchedProduct.image !== '/placeholder.svg' ? (
                      <img src={matchedProduct.image} alt={item.name} className="w-8 h-8 rounded object-cover border border-border" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell><Badge variant="outline">{item.channel.toUpperCase()}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-0.5">
                      {matchedProduct?.sizes?.map((s: string) => (
                        <span key={s} className="px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded">{s}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {matchedProduct?.colors?.map((c: string) => (
                        <ColorSwatch key={c} color={c} size={16} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{total}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{item.threshold}</TableCell>
                  <TableCell>
                    {isLow ? (
                      <Badge variant="destructive" className="animate-pulse">Bas</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Import en masse</DialogTitle>
            <DialogDescription>Importez des produits depuis un fichier PDF, CSV ou Excel. L'IA extraira automatiquement les données.</DialogDescription>
          </DialogHeader>

          {extractedProducts.length === 0 ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Glissez un fichier ou cliquez pour sélectionner</p>
                <p className="text-xs text-muted-foreground mb-4">Formats acceptés : PDF, CSV, XLS, XLSX (max 10 Mo)</p>
                <label className="cursor-pointer">
                  <Button variant="outline" disabled={importing} asChild>
                    <span>{importing ? 'Analyse en cours...' : 'Choisir un fichier'}</span>
                  </Button>
                  <input type="file" accept=".pdf,.csv,.xls,.xlsx" className="hidden" onChange={handleFileUpload} disabled={importing} />
                </label>
              </div>
              {importing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Extraction des produits par IA en cours...
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{extractedProducts.length} produits trouvés — {selectedIds.size} sélectionnés</p>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selectedIds.size === extractedProducts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedProducts.map((p, i) => (
                      <TableRow key={i} className="cursor-pointer" onClick={() => toggleProduct(i)}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(i)} onCheckedChange={() => toggleProduct(i)} />
                        </TableCell>
                        <TableCell className="font-medium text-sm">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="text-xs">{p.category}</TableCell>
                        <TableCell className="text-right text-sm">{p.price}€</TableCell>
                        <TableCell className="text-right text-sm">{p.stock || 50}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setExtractedProducts([]); setSelectedIds(new Set()); }}>
                  Recommencer
                </Button>
                <Button onClick={handleSaveImported} disabled={saving || selectedIds.size === 0}>
                  {saving ? 'Import en cours...' : `Importer ${selectedIds.size} produit(s)`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Create/Edit Dialog */}
      <InventoryProductDialog
        open={productDialogOpen}
        onOpenChange={(open) => { setProductDialogOpen(open); if (!open) setEditTarget(null); }}
        onSaved={onRefresh}
        locations={locations}
        editData={editTarget}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera le produit <strong>{deleteTarget?.name}</strong> de l'inventaire ainsi que tous les niveaux de stock associés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ── Size×Color Stock Grid Component ──
function SizeColorGrid({
  inventoryId,
  locationId,
  productSizes,
  productColors,
  stockLevels,
  onRefresh,
  productName,
  locationName,
}: {
  inventoryId: string;
  locationId: string;
  productSizes: string[];
  productColors: string[];
  stockLevels: StockLevel[];
  onRefresh: () => void;
  productName?: string;
  locationName?: string;
}) {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ color: string; size: string; qty: number; valid: boolean }[]>([]);

  const relevantLevels = stockLevels.filter(
    sl => sl.inventory_id === inventoryId && sl.location_id === locationId && sl.size && sl.color
  );

  const getQty = (color: string, size: string) => {
    const sl = relevantLevels.find(l => l.color === color && l.size === size);
    return sl?.quantity ?? 0;
  };

  const getSlId = (color: string, size: string) => {
    return relevantLevels.find(l => l.color === color && l.size === size)?.id;
  };

  const getStockedAt = (color: string, size: string) => {
    return relevantLevels.find(l => l.color === color && l.size === size)?.stocked_at;
  };

  const getColorTotal = (color: string) => {
    return productSizes.reduce((sum, size) => sum + getQty(color, size), 0);
  };

  const cellKey = (color: string, size: string) => `${color}__${size}`;

  const handleCellSave = async (color: string, size: string, newQty: number) => {
    setSaving(true);
    const existingId = getSlId(color, size);
    if (existingId) {
      if (newQty === 0) {
        await supabase.from('stock_levels').delete().eq('id', existingId);
      } else {
        await supabase.from('stock_levels').update({ quantity: newQty }).eq('id', existingId);
      }
    } else if (newQty > 0) {
      await supabase.from('stock_levels').insert({
        inventory_id: inventoryId,
        location_id: locationId,
        quantity: newQty,
        reserved: 0,
        size,
        color,
        stocked_at: new Date().toISOString(),
      });
    }
    setSaving(false);
    setEditingCell(null);
    onRefresh();
  };

  const handleDeleteColor = async (color: string) => {
    const toDelete = relevantLevels.filter(l => l.color === color);
    for (const sl of toDelete) {
      await supabase.from('stock_levels').delete().eq('id', sl.id);
    }
    toast({ title: `Couleur ${color} supprimée` });
    onRefresh();
  };

  // ── CSV Export ──
  const handleExportCsv = () => {
    const rows = [['Couleur', 'Taille', 'Quantite', 'Reserve', 'Date mise en stock'].join(',')];
    const colors = productColors.length > 0 ? productColors : ['DÉFAUT'];
    const sizes = productSizes.length > 0 ? productSizes : ['UNIQUE'];
    colors.forEach(color => {
      sizes.forEach(size => {
        const sl = relevantLevels.find(l => l.color === color && l.size === size);
        const qty = sl?.quantity ?? 0;
        const reserved = sl?.reserved ?? 0;
        const stockedAt = sl?.stocked_at ? new Date(sl.stocked_at).toLocaleDateString('fr-FR') : '';
        rows.push([color, size, qty, reserved, stockedAt].join(','));
      });
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `stock_${(locationName || 'loc').replace(/\s+/g, '_')}_${(productName || 'prod').replace(/\s+/g, '_')}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exporté' });
  };

  // ── CSV Import ──
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      // Skip header if present
      const startIdx = lines[0]?.toLowerCase().includes('couleur') ? 1 : 0;
      const preview = lines.slice(startIdx).map(line => {
        const parts = line.split(',').map(p => p.trim());
        const color = parts[0] || '';
        const size = parts[1] || '';
        const qty = parseInt(parts[2]) || 0;
        const colorValid = productColors.length === 0 || productColors.includes(color);
        const sizeValid = productSizes.length === 0 || productSizes.includes(size);
        return { color, size, qty, valid: colorValid && sizeValid && qty >= 0 };
      });
      setCsvPreview(preview);
      setCsvImportOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    setSaving(true);
    let count = 0;
    for (const row of csvPreview) {
      if (!row.valid || row.qty <= 0) continue;
      const existingId = getSlId(row.color, row.size);
      if (existingId) {
        await supabase.from('stock_levels').update({ quantity: row.qty }).eq('id', existingId);
      } else {
        await supabase.from('stock_levels').insert({
          inventory_id: inventoryId,
          location_id: locationId,
          quantity: row.qty,
          reserved: 0,
          size: row.size,
          color: row.color,
          stocked_at: new Date().toISOString(),
        });
      }
      count++;
    }
    setSaving(false);
    setCsvImportOpen(false);
    setCsvPreview([]);
    toast({ title: `${count} lignes importées` });
    onRefresh();
  };

  if (productColors.length === 0 && productSizes.length === 0) {
    return <p className="text-xs text-muted-foreground py-2 px-4">Aucune variante configurée pour ce produit.</p>;
  }

  const sizes = productSizes.length > 0 ? productSizes : ['UNIQUE'];

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        {/* CSV buttons */}
        <div className="flex gap-2 px-3 py-2 border-b border-border/50">
          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={handleExportCsv}>
            <Download className="h-3 w-3" /> Exporter CSV
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" className="gap-1 h-7 text-xs pointer-events-none" asChild>
              <span><Upload className="h-3 w-3" /> Importer CSV</span>
            </Button>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
          </label>
        </div>

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-2 px-3 font-medium">Couleur</th>
              {sizes.map(s => (
                <th key={s} className="text-center py-2 px-2 font-medium min-w-[50px]">{s}</th>
              ))}
              <th className="text-center py-2 px-3 font-semibold">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {(productColors.length > 0 ? productColors : ['DÉFAUT']).map(color => {
              const total = getColorTotal(color);
              return (
                <tr key={color} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <ColorSwatch color={color} size={12} />
                      <span className="font-medium">{color}</span>
                    </div>
                  </td>
                  {sizes.map(size => {
                    const key = cellKey(color, size);
                    const qty = getQty(color, size);
                    const stockedAt = getStockedAt(color, size);
                    const isEditing = editingCell === key;
                    return (
                      <td key={size} className="text-center py-1 px-1">
                        {isEditing ? (
                          <div className="flex items-center gap-0.5 justify-center">
                            <Input
                              type="number"
                              min={0}
                              value={editValue}
                              onChange={e => setEditValue(parseInt(e.target.value) || 0)}
                              className="w-14 h-6 text-center text-xs p-0"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleCellSave(color, size, editValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                            />
                            <Button
                              variant="ghost" size="icon" className="h-5 w-5"
                              onClick={() => handleCellSave(color, size, editValue)}
                              disabled={saving}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "cursor-pointer hover:text-primary font-mono inline-block min-w-[30px] py-1 rounded hover:bg-primary/10 transition-colors",
                                  qty === 0 && "text-muted-foreground/40"
                                )}
                                onClick={() => { setEditingCell(key); setEditValue(qty); }}
                              >
                                {qty || '—'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {stockedAt
                                ? `Entrée : ${new Date(stockedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                : 'Pas de date d\'entrée'}
                            </TooltipContent>
                          </UITooltip>
                        )}
                      </td>
                    );
                  })}
                  <td className={cn("text-center py-2 px-3 font-bold font-mono", total < 10 && total > 0 && "text-destructive")}>
                    {total}
                  </td>
                  <td>
                    <Button
                      variant="ghost" size="icon" className="h-5 w-5 text-destructive/60 hover:text-destructive"
                      onClick={() => handleDeleteColor(color)}
                      title="Supprimer cette couleur"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* CSV Import Preview Dialog */}
        <Dialog open={csvImportOpen} onOpenChange={setCsvImportOpen}>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Aperçu import CSV</DialogTitle>
              <DialogDescription>{csvPreview.length} lignes détectées</DialogDescription>
            </DialogHeader>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.map((row, i) => (
                    <TableRow key={i} className={!row.valid ? 'bg-destructive/10' : ''}>
                      <TableCell className="text-xs">{row.color}</TableCell>
                      <TableCell className="text-xs">{row.size}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{row.qty}</TableCell>
                      <TableCell>
                        {row.valid
                          ? <Badge variant="secondary" className="text-[10px]">OK</Badge>
                          : <Badge variant="destructive" className="text-[10px]">Inconnu</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCsvImportOpen(false); setCsvPreview([]); }}>Annuler</Button>
              <Button onClick={handleConfirmImport} disabled={saving || csvPreview.filter(r => r.valid && r.qty > 0).length === 0}>
                {saving ? 'Import...' : `Importer ${csvPreview.filter(r => r.valid && r.qty > 0).length} lignes`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ── Boutiques (CRUD + product management + size/color grid + delivery notes) ──
function BoutiquesView({ boutiques, allLocations, stockLevels, inventory, products, onRefresh }: any) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string>('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Boutique CRUD state
  const [boutiqueDialog, setBoutiqueDialog] = useState(false);
  const [editingBoutique, setEditingBoutique] = useState<Location | null>(null);
  const [boutiqueForm, setBoutiqueForm] = useState({ name: '', city: '', address: '', type: 'boutique', is_active: true });
  const [savingBoutique, setSavingBoutique] = useState(false);
  const [deletingBoutique, setDeletingBoutique] = useState<string | null>(null);

  // Product management state
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [addProductInvId, setAddProductInvId] = useState('');
  const [addProductQty, setAddProductQty] = useState(50);
  const [addProductMode, setAddProductMode] = useState<'global' | 'variants'>('global');
  const [variantGrid, setVariantGrid] = useState<Record<string, Record<string, number>>>({});
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);

  const openCreateBoutique = () => {
    setEditingBoutique(null);
    setBoutiqueForm({ name: '', city: '', address: '', type: 'boutique', is_active: true });
    setBoutiqueDialog(true);
  };

  const openEditBoutique = (b: Location) => {
    setEditingBoutique(b);
    setBoutiqueForm({ name: b.name, city: b.city || '', address: b.address || '', type: b.type, is_active: b.is_active });
    setBoutiqueDialog(true);
  };

  const saveBoutique = async () => {
    if (!boutiqueForm.name.trim()) {
      toast({ title: 'Nom requis', variant: 'destructive' });
      return;
    }
    setSavingBoutique(true);
    if (editingBoutique) {
      const { error } = await supabase.from('locations').update({
        name: boutiqueForm.name,
        city: boutiqueForm.city || null,
        address: boutiqueForm.address || null,
        type: boutiqueForm.type,
        is_active: boutiqueForm.is_active,
      }).eq('id', editingBoutique.id);
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else toast({ title: 'Boutique modifiée' });
    } else {
      const { error } = await supabase.from('locations').insert({
        name: boutiqueForm.name,
        city: boutiqueForm.city || null,
        address: boutiqueForm.address || null,
        type: boutiqueForm.type,
        is_active: boutiqueForm.is_active,
      });
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else toast({ title: 'Boutique créée' });
    }
    setSavingBoutique(false);
    setBoutiqueDialog(false);
    onRefresh();
  };

  const handleDeleteBoutique = async (id: string) => {
    const hasStock = stockLevels.some((sl: StockLevel) => sl.location_id === id && sl.quantity > 0);
    if (hasStock) {
      toast({ title: 'Impossible', description: 'Cette boutique contient du stock. Transférez-le d\'abord.', variant: 'destructive' });
      return;
    }
    await supabase.from('stock_levels').delete().eq('location_id', id);
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Boutique supprimée' });
      if (selected === id) setSelected('');
    }
    setDeletingBoutique(null);
    onRefresh();
  };

  // When product selection changes, build variant grid
  const selectedProduct = useMemo(() => {
    const inv = inventory.find((i: InventoryItem) => i.id === addProductInvId);
    if (!inv) return null;
    return products.find((p: ProductRow) => p.id === inv.product_id);
  }, [addProductInvId, inventory, products]);

  useEffect(() => {
    if (selectedProduct && addProductMode === 'variants') {
      const colors = selectedProduct.colors?.length ? selectedProduct.colors : [];
      const sizes = selectedProduct.sizes?.length ? selectedProduct.sizes : [];
      if (colors.length > 0 && sizes.length > 0) {
        const grid: Record<string, Record<string, number>> = {};
        colors.forEach((c: string) => {
          grid[c] = {};
          sizes.forEach((s: string) => { grid[c][s] = 0; });
        });
        setVariantGrid(grid);
      }
    }
  }, [selectedProduct, addProductMode]);

  // Add product to boutique
  const handleAddProduct = async () => {
    if (!addProductInvId || !selected) return;
    setSavingProduct(true);

    if (addProductMode === 'variants' && selectedProduct?.colors?.length && selectedProduct?.sizes?.length) {
      // Create one stock_level per color×size combination with qty > 0
      let created = 0;
      for (const [color, sizes] of Object.entries(variantGrid)) {
        for (const [size, qty] of Object.entries(sizes)) {
          if (qty > 0) {
            await supabase.from('stock_levels').insert({
              inventory_id: addProductInvId,
              location_id: selected,
              quantity: qty,
              reserved: 0,
              size,
              color,
            });
            created++;
          }
        }
      }
      if (created > 0) toast({ title: `${created} variantes ajoutées` });
      else toast({ title: 'Aucune quantité saisie', variant: 'destructive' });
    } else {
      // Global stock (no size/color)
      const existing = stockLevels.find((sl: StockLevel) => sl.inventory_id === addProductInvId && sl.location_id === selected && !sl.size && !sl.color);
      if (existing) {
        toast({ title: 'Ce produit existe déjà dans cette boutique', variant: 'destructive' });
        setSavingProduct(false);
        return;
      }
      const { error } = await supabase.from('stock_levels').insert({
        inventory_id: addProductInvId,
        location_id: selected,
        quantity: addProductQty,
        reserved: 0,
      });
      if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      else toast({ title: 'Produit ajouté à la boutique' });
    }

    setSavingProduct(false);
    setAddProductOpen(false);
    setAddProductInvId('');
    setAddProductQty(50);
    setAddProductMode('global');
    setVariantGrid({});
    onRefresh();
  };

  // Update stock quantity inline (global stock only)
  const handleUpdateStock = async (slId: string, newQty: number) => {
    const { error } = await supabase.from('stock_levels').update({ quantity: newQty }).eq('id', slId);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else toast({ title: 'Quantité mise à jour' });
    setEditingStockId(null);
    onRefresh();
  };

  // Remove ALL stock_levels for a product in this boutique
  const handleRemoveProduct = async (inventoryId: string) => {
    const toDelete = stockLevels.filter((sl: StockLevel) => sl.inventory_id === inventoryId && sl.location_id === selected);
    for (const sl of toDelete) {
      await supabase.from('stock_levels').delete().eq('id', sl.id);
    }
    toast({ title: 'Produit retiré de la boutique' });
    onRefresh();
  };

  const toggleExpand = (invId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      next.has(invId) ? next.delete(invId) : next.add(invId);
      return next;
    });
  };

  // Generate delivery note with size/color breakdown
  const generateDeliveryNote = (boutique: any) => {
    const levels = stockLevels.filter((sl: StockLevel) => sl.location_id === boutique.id) as StockLevel[];

    // Group by inventory_id
    const grouped: Record<string, StockLevel[]> = {};
    levels.forEach(sl => {
      if (!grouped[sl.inventory_id]) grouped[sl.inventory_id] = [];
      grouped[sl.inventory_id].push(sl);
    });

    const now = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    let totalQty = 0;
    let totalDispo = 0;

    let productsHtml = '';
    for (const [invId, sls] of Object.entries(grouped)) {
      const inv = inventory.find((i: InventoryItem) => i.id === invId);
      const prod = products.find((p: ProductRow) => p.id === inv?.product_id);
      const prodTotal = sls.reduce((s, sl) => s + sl.quantity, 0);
      const prodDispo = sls.reduce((s, sl) => s + (sl.quantity - sl.reserved), 0);
      totalQty += prodTotal;
      totalDispo += prodDispo;

      const hasVariants = sls.some(sl => sl.size || sl.color);

      productsHtml += `<tr style="background:#f0f0f0;"><td colspan="2" style="padding:8px 12px;font-weight:700;">${inv?.name || 'Inconnu'}</td><td style="padding:8px;font-family:monospace;font-size:11px;">${inv?.sku || '-'}</td><td style="text-align:right;padding:8px;font-weight:700;">${prodTotal}</td><td style="text-align:right;padding:8px;">${prodDispo}</td></tr>`;

      if (hasVariants) {
        // Get unique colors and sizes
        const colors = [...new Set(sls.filter(sl => sl.color).map(sl => sl.color!))];
        const sizes = [...new Set(sls.filter(sl => sl.size).map(sl => sl.size!))];

        if (colors.length > 0 && sizes.length > 0) {
          productsHtml += `<tr><td colspan="5" style="padding:4px 12px 8px;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr><td style="padding:4px 8px;font-weight:600;">Couleur</td>`;
          sizes.forEach(s => { productsHtml += `<td style="text-align:center;padding:4px;font-weight:600;">${s}</td>`; });
          productsHtml += `<td style="text-align:center;padding:4px;font-weight:700;">Total</td><td style="text-align:center;padding:4px;font-weight:600;">Date entrée</td></tr></thead><tbody>`;

          colors.forEach(color => {
            const hex = getColorHex(color);
            let colorTotal = 0;
            const colorStockedDates: string[] = [];
            productsHtml += `<tr><td style="padding:3px 8px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${hex};margin-right:6px;vertical-align:middle;${['WHITE','BLANC','CREAM','CREME','BEIGE','YELLOW','JAUNE'].includes(color.toUpperCase()) ? 'border:1px solid #ccc;' : ''}"></span>${color}</td>`;
            sizes.forEach(size => {
              const sl = sls.find(s => s.color === color && s.size === size);
              const qty = sl?.quantity || 0;
              colorTotal += qty;
              if (sl?.stocked_at) colorStockedDates.push(sl.stocked_at);
              productsHtml += `<td style="text-align:center;padding:3px;">${qty || '—'}</td>`;
            });
            const latestDate = colorStockedDates.length > 0
              ? new Date(colorStockedDates.sort().reverse()[0]).toLocaleDateString('fr-FR')
              : '—';
            productsHtml += `<td style="text-align:center;padding:3px;font-weight:700;">${colorTotal}</td><td style="text-align:center;padding:3px;font-size:10px;">${latestDate}</td></tr>`;
          });
          productsHtml += `</tbody></table></td></tr>`;
        }
      }
    }

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bon de livraison — ${boutique.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #111; }
  .header { border-bottom: 3px solid #111; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #111; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 13px; }
  .totals { margin-top: 30px; padding-top: 20px; border-top: 2px solid #111; display: flex; gap: 40px; font-size: 14px; }
  .totals strong { font-size: 20px; }
  .footer { margin-top: 60px; font-size: 11px; color: #666; text-align: center; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    <h1>Bon de Livraison</h1>
    <div class="meta">
      <div><strong>Boutique :</strong> ${boutique.name}</div>
      <div><strong>Date :</strong> ${now}</div>
      <div><strong>Ville :</strong> ${boutique.city || '-'}</div>
      <div><strong>Adresse :</strong> ${boutique.address || '-'}</div>
    </div>
  </div>
  <table>
    <thead><tr><th colspan="2">Produit</th><th>SKU</th><th style="text-align:right">Qté</th><th style="text-align:right">Disponible</th></tr></thead>
    <tbody>${productsHtml}</tbody>
  </table>
  <div class="totals">
    <div>Références : <strong>${Object.keys(grouped).length}</strong></div>
    <div>Total unités : <strong>${totalQty}</strong></div>
    <div>Total disponible : <strong>${totalDispo}</strong></div>
  </div>
  <div class="footer">Document généré le ${now} — Bon de livraison interne</div>
  <script>window.onload = () => window.print();</script>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const boutiqueData = (boutiques as Location[]).concat(allLocations.filter((l: Location) => l.type === 'web' || l.type === 'b2b')).map((b: Location) => {
    const levels = stockLevels.filter((sl: StockLevel) => sl.location_id === b.id);
    const totalStock = levels.reduce((s: number, sl: StockLevel) => s + sl.quantity, 0);
    // Count unique inventory items
    const uniqueInvIds = new Set(levels.map((sl: StockLevel) => sl.inventory_id));
    return { ...b, totalStock, productCount: uniqueInvIds.size, levels };
  });

  const selectedBoutique = boutiqueData.find((b: any) => b.id === selected);

  // Group stock levels by inventory_id for accordion display
  const groupedLevels = useMemo(() => {
    if (!selectedBoutique) return [];
    const levels = selectedBoutique.levels as StockLevel[];
    const groups: Record<string, { inv: InventoryItem | undefined; prod: ProductRow | undefined; levels: StockLevel[]; totalQty: number }> = {};
    levels.forEach(sl => {
      if (!groups[sl.inventory_id]) {
        const inv = inventory.find((i: InventoryItem) => i.id === sl.inventory_id);
        const prod = products.find((p: ProductRow) => p.id === inv?.product_id);
        groups[sl.inventory_id] = { inv, prod, levels: [], totalQty: 0 };
      }
      groups[sl.inventory_id].levels.push(sl);
      groups[sl.inventory_id].totalQty += sl.quantity;
    });
    return Object.entries(groups).map(([invId, data]) => ({ invId, ...data }));
  }, [selectedBoutique, inventory, products]);

  return (
    <motion.div {...fadeIn} transition={{ duration: 0.4 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Boutiques</h2>
        <Button className="gap-2" onClick={openCreateBoutique}>
          <Plus className="h-4 w-4" /> Ajouter une boutique
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {boutiqueData.map((b: any) => (
          <Card
            key={b.id}
            className={cn("cursor-pointer transition-all hover:shadow-md relative group", selected === b.id && "ring-2 ring-primary")}
            onClick={() => setSelected(b.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.city || '-'} · <Badge variant="outline" className="text-[10px] px-1">{b.type}</Badge></p>
                  {!b.is_active && <Badge variant="secondary" className="text-[10px] mt-1">Inactif</Badge>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditBoutique(b); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {b.type === 'boutique' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingBoutique(b.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); generateDeliveryNote(b); }}>
                    <FileText className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between mt-3">
                <div>
                  <p className="text-2xl font-bold">{b.totalStock}</p>
                  <p className="text-xs text-muted-foreground">unités</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{b.productCount}</p>
                  <p className="text-xs text-muted-foreground">produits</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Boutique detail with accordion product management */}
      {selectedBoutique && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Détails — {selectedBoutique.name}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => generateDeliveryNote(selectedBoutique)}>
                    <FileText className="h-3 w-3" /> Bon de livraison
                  </Button>
                  <Button size="sm" className="gap-1" onClick={() => setAddProductOpen(true)}>
                    <Plus className="h-3 w-3" /> Ajouter produit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {groupedLevels.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Aucun stock dans cette boutique</p>
              ) : (
                groupedLevels.map(({ invId, inv, prod, levels: grpLevels, totalQty }) => {
                  const isExpanded = expandedProducts.has(invId);
                  const hasVariants = grpLevels.some(sl => sl.size || sl.color);
                  const globalLevel = grpLevels.find(sl => !sl.size && !sl.color);
                  const productColors = prod?.colors || [];
                  const productSizes = prod?.sizes || [];

                  return (
                    <div key={invId} className="border rounded-lg overflow-hidden">
                      {/* Main row */}
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                          isExpanded && "bg-muted/30"
                        )}
                        onClick={() => toggleExpand(invId)}
                      >
                        <div className="shrink-0">
                          {hasVariants || (productColors.length > 0 && productSizes.length > 0) ? (
                            isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : <div className="w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{inv?.name || 'Inconnu'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{inv?.sku || '-'}</p>
                        </div>
                        {/* Color swatches preview */}
                        {productColors.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {productColors.slice(0, 6).map((c: string) => (
                              <ColorSwatch key={c} color={c} size={10} />
                            ))}
                            {productColors.length > 6 && <span className="text-[10px] text-muted-foreground">+{productColors.length - 6}</span>}
                          </div>
                        )}
                        <div className="text-right shrink-0">
                          {globalLevel && !hasVariants ? (
                            editingStockId === globalLevel.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <Input type="number" min={0} value={editQty} onChange={e => setEditQty(parseInt(e.target.value) || 0)} className="w-20 h-7 text-right text-xs" />
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdateStock(globalLevel.id, editQty)}><Check className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingStockId(null)}><X className="h-3 w-3" /></Button>
                              </div>
                            ) : (
                              <span
                                className="font-mono font-bold text-lg cursor-pointer hover:text-primary"
                                onClick={e => { e.stopPropagation(); setEditingStockId(globalLevel.id); setEditQty(globalLevel.quantity); }}
                              >
                                {globalLevel.quantity}
                              </span>
                            )
                          ) : (
                            <span className="font-mono font-bold text-lg">{totalQty}</span>
                          )}
                          <p className="text-[10px] text-muted-foreground">unités</p>
                        </div>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0"
                          onClick={e => { e.stopPropagation(); handleRemoveProduct(invId); }}
                          title="Retirer ce produit"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Expanded: size×color grid */}
                      {isExpanded && (productColors.length > 0 || productSizes.length > 0) && (
                        <div className="border-t bg-background">
                          <SizeColorGrid
                            inventoryId={invId}
                            locationId={selected}
                            productSizes={productSizes}
                            productColors={productColors}
                            stockLevels={stockLevels}
                            onRefresh={onRefresh}
                            productName={inv?.name}
                            locationName={selectedBoutique?.name}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Boutique Create/Edit Dialog */}
      <Dialog open={boutiqueDialog} onOpenChange={setBoutiqueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBoutique ? 'Modifier la boutique' : 'Nouvelle boutique'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={boutiqueForm.name} onChange={e => setBoutiqueForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: CC Parly 2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ville</Label>
                <Input value={boutiqueForm.city} onChange={e => setBoutiqueForm(f => ({ ...f, city: e.target.value }))} placeholder="Paris" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={boutiqueForm.type} onValueChange={v => setBoutiqueForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boutique">Boutique</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Textarea value={boutiqueForm.address} onChange={e => setBoutiqueForm(f => ({ ...f, address: e.target.value }))} placeholder="Adresse complète" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={boutiqueForm.is_active} onCheckedChange={v => setBoutiqueForm(f => ({ ...f, is_active: v }))} />
              <Label>Actif</Label>
            </div>
            <Button className="w-full" onClick={saveBoutique} disabled={savingBoutique}>
              {savingBoutique ? 'Enregistrement...' : editingBoutique ? 'Enregistrer les modifications' : 'Créer la boutique'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog with variant grid */}
      <Dialog open={addProductOpen} onOpenChange={(open) => {
        setAddProductOpen(open);
        if (!open) { setAddProductInvId(''); setAddProductMode('global'); setVariantGrid({}); }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un produit à la boutique</DialogTitle>
            <DialogDescription>Sélectionnez un produit et définissez le stock initial par variante ou globalement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produit</Label>
              <Select value={addProductInvId} onValueChange={v => { setAddProductInvId(v); setAddProductMode('global'); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un produit..." /></SelectTrigger>
                <SelectContent>
                  {inventory.map((inv: InventoryItem) => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.name} ({inv.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && selectedProduct.colors?.length > 0 && selectedProduct.sizes?.length > 0 && (
              <div>
                <Label className="mb-2 block">Mode de saisie du stock</Label>
                <div className="flex gap-2">
                  <Button
                    variant={addProductMode === 'global' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAddProductMode('global')}
                  >
                    Stock global
                  </Button>
                  <Button
                    variant={addProductMode === 'variants' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAddProductMode('variants')}
                  >
                    Par taille × couleur
                  </Button>
                </div>
              </div>
            )}

            {addProductMode === 'global' ? (
              <div>
                <Label>Quantité initiale</Label>
                <Input type="number" min={0} value={addProductQty} onChange={e => setAddProductQty(parseInt(e.target.value) || 0)} />
              </div>
            ) : selectedProduct && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium">Couleur</th>
                      {(selectedProduct.sizes || []).map((s: string) => (
                        <th key={s} className="text-center py-2 px-2 font-medium">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedProduct.colors || []).map((color: string) => (
                      <tr key={color} className="border-t border-border/50">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <ColorSwatch color={color} size={12} />
                            <span>{color}</span>
                          </div>
                        </td>
                        {(selectedProduct.sizes || []).map((size: string) => (
                          <td key={size} className="text-center py-1 px-1">
                            <Input
                              type="number"
                              min={0}
                              value={variantGrid[color]?.[size] ?? 0}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setVariantGrid(prev => ({
                                  ...prev,
                                  [color]: { ...prev[color], [size]: val },
                                }));
                              }}
                              className="w-14 h-6 text-center text-xs p-0 mx-auto"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button className="w-full" onClick={handleAddProduct} disabled={savingProduct || !addProductInvId}>
              {savingProduct ? 'Ajout en cours...' : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBoutique} onOpenChange={() => setDeletingBoutique(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette boutique ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le stock restant doit être transféré avant la suppression.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingBoutique && handleDeleteBoutique(deletingBoutique)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ── Transfers ──
function TransfersView({ transfers, locations, inventory, user, onCreated }: any) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ inventory_id: '', from_location_id: '', to_location_id: '', quantity: 1, notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!form.inventory_id || !form.from_location_id || !form.to_location_id || form.quantity < 1) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }
    if (form.from_location_id === form.to_location_id) {
      toast({ title: 'Erreur', description: 'Origine et destination identiques', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('stock_transfers').insert({
      inventory_id: form.inventory_id,
      from_location_id: form.from_location_id,
      to_location_id: form.to_location_id,
      quantity: form.quantity,
      notes: form.notes || null,
      created_by: user?.id,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Transfert créé' });
      setOpen(false);
      setForm({ inventory_id: '', from_location_id: '', to_location_id: '', quantity: 1, notes: '' });
      onCreated();
    }
  };

  const getLocationName = (id: string) => locations.find((l: Location) => l.id === id)?.name || id;
  const getInvName = (id: string) => inventory.find((i: InventoryItem) => i.id === id)?.name || id;

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_transit: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <motion.div {...fadeIn} transition={{ duration: 0.4 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Transferts</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><ArrowLeftRight className="h-4 w-4" /> Nouveau Transfert</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau Transfert de Stock</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Produit</Label>
                <Select value={form.inventory_id} onValueChange={v => setForm(f => ({ ...f, inventory_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{inventory.map((i: InventoryItem) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Origine</Label>
                  <Select value={form.from_location_id} onValueChange={v => setForm(f => ({ ...f, from_location_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="De..." /></SelectTrigger>
                    <SelectContent>{locations.map((l: Location) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Destination</Label>
                  <Select value={form.to_location_id} onValueChange={v => setForm(f => ({ ...f, to_location_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Vers..." /></SelectTrigger>
                    <SelectContent>{locations.map((l: Location) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Quantité</Label>
                <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionnel..." />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Création...' : 'Créer le Transfert'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Vers</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun transfert</TableCell></TableRow>
            ) : transfers.map((t: Transfer) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{getInvName(t.inventory_id)}</TableCell>
                <TableCell className="text-sm">{getLocationName(t.from_location_id)}</TableCell>
                <TableCell className="text-sm">{getLocationName(t.to_location_id)}</TableCell>
                <TableCell className="text-right font-mono">{t.quantity}</TableCell>
                <TableCell>
                  <span className={cn("px-2 py-1 rounded text-xs font-medium", statusColor[t.status] || '')}>{t.status}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('fr-FR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
}

// ── Skeleton ──
function StockSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
