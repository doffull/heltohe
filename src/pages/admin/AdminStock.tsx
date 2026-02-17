import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3, Package, Store, ArrowLeftRight, AlertTriangle,
  RefreshCw, TrendingUp, TrendingDown, Search, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { cn } from '@/lib/utils';

type Location = {
  id: string; name: string; type: string; city: string | null; is_active: boolean;
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
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const fetchAll = async () => {
    setLoading(true);
    const [locRes, invRes, slRes, trRes] = await Promise.all([
      supabase.from('locations').select('*').order('name'),
      supabase.from('inventory').select('*').order('name'),
      supabase.from('stock_levels').select('*'),
      supabase.from('stock_transfers').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (locRes.data) setLocations(locRes.data as Location[]);
    if (invRes.data) setInventory(invRes.data as InventoryItem[]);
    if (slRes.data) setStockLevels(slRes.data as StockLevel[]);
    if (trRes.data) setTransfers(trRes.data as Transfer[]);
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
          {view === 'inventory' && <InventoryView key="inv" items={filteredInventory} stockLevels={stockLevels} locations={locations} channelFilter={channelFilter} setChannelFilter={setChannelFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm} getStockForItem={getStockForItem} />}
          {view === 'boutiques' && <BoutiquesView key="bout" boutiques={boutiqueLocations} stockLevels={stockLevels} inventory={inventory} />}
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

// ── Inventory ──
function InventoryView({ items, stockLevels, locations, channelFilter, setChannelFilter, searchTerm, setSearchTerm, getStockForItem }: any) {
  return (
    <motion.div {...fadeIn} transition={{ duration: 0.4 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Inventaire Global</h2>
        <div className="flex gap-2">
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
    </motion.div>
  );
}

// ── Boutiques ──
function BoutiquesView({ boutiques, stockLevels, inventory }: any) {
  const [selected, setSelected] = useState<string>('');

  const boutiqueData = boutiques.map((b: Location) => {
    const levels = stockLevels.filter((sl: StockLevel) => sl.location_id === b.id);
    const totalStock = levels.reduce((s: number, sl: StockLevel) => s + sl.quantity, 0);
    const productCount = levels.length;
    return { ...b, totalStock, productCount, levels };
  });

  const selectedBoutique = boutiqueData.find((b: any) => b.id === selected);

  return (
    <motion.div {...fadeIn} transition={{ duration: 0.4 }} className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Boutiques</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {boutiqueData.map((b: any) => (
          <Card
            key={b.id}
            className={cn("cursor-pointer transition-all hover:shadow-md", selected === b.id && "ring-2 ring-primary")}
            onClick={() => setSelected(b.id)}
          >
            <CardContent className="p-4">
              <p className="font-medium text-sm truncate">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.city}</p>
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

      {selectedBoutique && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardHeader><CardTitle className="text-sm">Détails — {selectedBoutique.name}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Réservé</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBoutique.levels.map((sl: StockLevel) => {
                    const inv = inventory.find((i: InventoryItem) => i.id === sl.inventory_id);
                    return (
                      <TableRow key={sl.id}>
                        <TableCell>{inv?.name || 'Inconnu'}</TableCell>
                        <TableCell className="text-right font-mono">{sl.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{sl.reserved}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{sl.quantity - sl.reserved}</TableCell>
                      </TableRow>
                    );
                  })}
                  {selectedBoutique.levels.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun stock dans cette boutique</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}
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
