import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3, Package, Store, ArrowLeftRight, AlertTriangle,
  RefreshCw, TrendingUp, TrendingDown, Search, Filter,
  Upload, Plus, Pencil, Trash2, FileText, X, Check, FileSpreadsheet
} from 'lucide-react';
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
  last_synced_at: string | null;
};
type Transfer = {
  id: string; inventory_id: string; from_location_id: string; to_location_id: string;
  quantity: number; status: string; notes: string | null; created_at: string; created_by: string;
};
type ProductRow = {
  id: string; name: string; sku: string; sizes: string[] | null; colors: string[] | null;
};

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
      supabase.from('products').select('id, name, sku, sizes, colors'),
    ]);
    if (locRes.data) setLocations(locRes.data as Location[]);
    if (invRes.data) setInventory(invRes.data as InventoryItem[]);
    if (slRes.data) setStockLevels(slRes.data as StockLevel[]);
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
          {view === 'inventory' && <InventoryView key="inv" items={filteredInventory} stockLevels={stockLevels} locations={locations} channelFilter={channelFilter} setChannelFilter={setChannelFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm} getStockForItem={getStockForItem} inventory={inventory} onRefresh={fetchAll} />}
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
function InventoryView({ items, stockLevels, locations, channelFilter, setChannelFilter, searchTerm, setSearchTerm, getStockForItem, inventory, onRefresh }: any) {
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

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
        // 1. Create product
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

        // 2. Create inventory entry
        const { data: inv, error: invErr } = await supabase.from('inventory').insert({
          product_id: prod.id,
          sku: p.sku || `IMP-${Date.now()}`,
          name: p.name || 'Sans nom',
          threshold: 10,
          channel: 'b2c',
        }).select('id').single();

        if (invErr || !inv) continue;

        // 3. Create stock_level for web location
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
              <TableHead>Produit</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Stock Total</TableHead>
              <TableHead className="text-right">Seuil</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun produit en inventaire</TableCell></TableRow>
            ) : items.map((item: InventoryItem) => {
              const total = getStockForItem(item.id);
              const isLow = total < item.threshold;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell><Badge variant="outline">{item.channel.toUpperCase()}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{total}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{item.threshold}</TableCell>
                  <TableCell>
                    {isLow ? (
                      <Badge variant="destructive" className="animate-pulse">Bas</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
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
    </motion.div>
  );
}

// ── Boutiques (CRUD + product management + delivery notes) ──
function BoutiquesView({ boutiques, allLocations, stockLevels, inventory, products, onRefresh }: any) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string>('');

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
    // Delete stock_levels first, then location
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

  // Add product to boutique
  const handleAddProduct = async () => {
    if (!addProductInvId || !selected) return;
    setSavingProduct(true);
    const existing = stockLevels.find((sl: StockLevel) => sl.inventory_id === addProductInvId && sl.location_id === selected);
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
    setSavingProduct(false);
    setAddProductOpen(false);
    setAddProductInvId('');
    setAddProductQty(50);
    onRefresh();
  };

  // Update stock quantity inline
  const handleUpdateStock = async (slId: string, newQty: number) => {
    const { error } = await supabase.from('stock_levels').update({ quantity: newQty }).eq('id', slId);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else toast({ title: 'Quantité mise à jour' });
    setEditingStockId(null);
    onRefresh();
  };

  // Remove product from boutique
  const handleRemoveProduct = async (slId: string) => {
    const { error } = await supabase.from('stock_levels').delete().eq('id', slId);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else toast({ title: 'Produit retiré de la boutique' });
    onRefresh();
  };

  // Generate delivery note
  const generateDeliveryNote = (boutique: any) => {
    const levels = stockLevels.filter((sl: StockLevel) => sl.location_id === boutique.id);
    const totalQty = levels.reduce((s: number, sl: StockLevel) => s + sl.quantity, 0);
    const totalDispo = levels.reduce((s: number, sl: StockLevel) => s + (sl.quantity - sl.reserved), 0);

    const rows = levels.map((sl: StockLevel) => {
      const inv = inventory.find((i: InventoryItem) => i.id === sl.inventory_id);
      const prod = products.find((p: ProductRow) => p.id === inv?.product_id);
      return { sku: inv?.sku || '-', name: inv?.name || 'Inconnu', qty: sl.quantity, reserved: sl.reserved, dispo: sl.quantity - sl.reserved, sizes: prod?.sizes?.join(', ') || '-', colors: prod?.colors?.join(', ') || '-' };
    });

    const now = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Bon de livraison — ${boutique.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #111; }
  .header { border-bottom: 3px solid #111; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #111; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 8px 12px; border-bottom: 1px solid #ddd; font-size: 13px; }
  tr:nth-child(even) { background: #f9f9f9; }
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
    <thead><tr><th>SKU</th><th>Produit</th><th>Tailles</th><th>Couleurs</th><th style="text-align:right">Qté</th><th style="text-align:right">Réservé</th><th style="text-align:right">Disponible</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td style="font-family:monospace">${r.sku}</td><td>${r.name}</td><td>${r.sizes}</td><td>${r.colors}</td><td style="text-align:right">${r.qty}</td><td style="text-align:right">${r.reserved}</td><td style="text-align:right;font-weight:600">${r.dispo}</td></tr>`).join('')}</tbody>
  </table>
  <div class="totals">
    <div>Références : <strong>${rows.length}</strong></div>
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
    const productCount = levels.length;
    return { ...b, totalStock, productCount, levels };
  });

  const selectedBoutique = boutiqueData.find((b: any) => b.id === selected);

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

      {/* Boutique detail with product management */}
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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Tailles</TableHead>
                    <TableHead>Couleurs</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Réservé</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBoutique.levels.map((sl: StockLevel) => {
                    const inv = inventory.find((i: InventoryItem) => i.id === sl.inventory_id);
                    const prod = products.find((p: ProductRow) => p.id === inv?.product_id);
                    const isEditing = editingStockId === sl.id;
                    return (
                      <TableRow key={sl.id}>
                        <TableCell className="font-medium">{inv?.name || 'Inconnu'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{inv?.sku || '-'}</TableCell>
                        <TableCell className="text-xs">{prod?.sizes?.join(', ') || '-'}</TableCell>
                        <TableCell className="text-xs">{prod?.colors?.join(', ') || '-'}</TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Input type="number" min={0} value={editQty} onChange={e => setEditQty(parseInt(e.target.value) || 0)} className="w-20 h-7 text-right" />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdateStock(sl.id, editQty)}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingStockId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-mono cursor-pointer hover:text-primary" onClick={() => { setEditingStockId(sl.id); setEditQty(sl.quantity); }}>{sl.quantity}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{sl.reserved}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{sl.quantity - sl.reserved}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingStockId(sl.id); setEditQty(sl.quantity); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveProduct(sl.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {selectedBoutique.levels.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Aucun stock dans cette boutique</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
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

      {/* Add Product Dialog */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un produit à la boutique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produit</Label>
              <Select value={addProductInvId} onValueChange={setAddProductInvId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un produit..." /></SelectTrigger>
                <SelectContent>
                  {inventory.map((inv: InventoryItem) => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.name} ({inv.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantité initiale</Label>
              <Input type="number" min={0} value={addProductQty} onChange={e => setAddProductQty(parseInt(e.target.value) || 0)} />
            </div>
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
