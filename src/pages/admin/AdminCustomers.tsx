import { useState } from 'react';
import { useCustomers, useUpdateCustomer, useBulkDeleteCustomers, CustomerRecord } from '@/hooks/useCustomers';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, Search, Mail, Phone, Crown, TrendingUp, Eye, Trash2, Filter
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-orange-500/20 text-orange-500',
  silver: 'bg-gray-400/20 text-gray-400',
  gold: 'bg-yellow-500/20 text-yellow-500',
  platinum: 'bg-purple-500/20 text-purple-500',
};

export default function AdminCustomers() {
  const { toast } = useToast();
  const { data: customers = [], isLoading } = useCustomers();
  const updateCustomer = useUpdateCustomer();
  const bulkDelete = useBulkDeleteCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  let filtered = customers.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.email.toLowerCase().includes(q) && !`${c.firstName} ${c.lastName}`.toLowerCase().includes(q)) return false;
    }
    if (tierFilter !== 'all' && c.loyaltyTier !== tierFilter) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    if (sortBy === 'spent-desc') return b.totalSpent - a.totalSpent;
    if (sortBy === 'spent-asc') return a.totalSpent - b.totalSpent;
    if (sortBy === 'points-desc') return b.loyaltyPoints - a.loyaltyPoints;
    if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return 0;
  });

  const { selectedIds, toggle, toggleAll, clear, allSelected, someSelected, count, ids } = useBulkSelection(filtered);

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${count} client(s) ? Cette action est irréversible.`)) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast({ title: `${count} client(s) supprimé(s)` });
      clear();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleUpdateTier = async (id: string, tier: string) => {
    try {
      await updateCustomer.mutateAsync({ id, loyalty_tier: tier as any });
      toast({ title: 'Niveau mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold hud-text">CLIENTS</h1>
          <p className="text-muted-foreground mt-1">{customers.length} clients enregistrés</p>
        </div>
      </div>

      {/* Filters */}
      <div className="chamfer-hud bg-card/50 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[150px]"><Filter className="h-3 w-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous niveaux</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {['bronze', 'silver', 'gold', 'platinum'].map(tier => {
          const tierCount = customers.filter(c => c.loyaltyTier === tier).length;
          return (
            <div key={tier} className="chamfer-hud bg-card/50 p-4 flex items-center gap-3">
              <Crown className={`h-5 w-5 ${TIER_COLORS[tier]?.split(' ')[1]}`} />
              <div>
                <p className="text-lg font-bold">{tierCount}</p>
                <p className="text-xs text-muted-foreground uppercase">{tier}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <div className="chamfer-hud bg-primary/10 border border-primary/30 p-3 flex items-center gap-4">
          <span className="text-sm font-bold">{count} sélectionné(s)</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
            <Trash2 className="h-3 w-3 mr-2" />Supprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={clear}>Désélectionner</Button>
        </div>
      )}

      {/* Table */}
      <div className="chamfer-hud bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-4 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                  <th className="text-left p-4 text-xs font-bold hud-text">CLIENT</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">EMAIL</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">NIVEAU</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">POINTS</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">TOTAL DÉPENSÉ</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${selectedIds.has(customer.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-4"><Checkbox checked={selectedIds.has(customer.id)} onCheckedChange={() => toggle(customer.id)} /></td>
                    <td className="p-4">
                      <p className="font-medium text-sm">{customer.firstName} {customer.lastName}</p>
                      <p className="text-xs text-muted-foreground">Depuis {new Date(customer.createdAt).toLocaleDateString('fr-FR')}</p>
                    </td>
                    <td className="p-4 text-sm">{customer.email}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded uppercase ${TIER_COLORS[customer.loyaltyTier] || ''}`}>{customer.loyaltyTier}</span>
                    </td>
                    <td className="p-4 text-right font-bold text-sm">{customer.loyaltyPoints}</td>
                    <td className="p-4 text-right font-bold text-sm">{customer.totalSpent.toFixed(2)}€</td>
                    <td className="p-4 text-right flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(customer)} title="Voir"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => window.location.href = `mailto:${customer.email}`} title="Contacter">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="hud-text">DÉTAILS CLIENT</DialogTitle></DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="hud-text text-xs">Nom</Label><p className="text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</p></div>
                <div><Label className="hud-text text-xs">Email</Label><p className="text-sm flex items-center gap-1"><Mail className="h-3 w-3" />{selectedCustomer.email}</p></div>
                {selectedCustomer.phone && <div><Label className="hud-text text-xs">Téléphone</Label><p className="text-sm flex items-center gap-1"><Phone className="h-3 w-3" />{selectedCustomer.phone}</p></div>}
                <div><Label className="hud-text text-xs">Total dépensé</Label><p className="text-sm font-bold flex items-center gap-1"><TrendingUp className="h-3 w-3" />{selectedCustomer.totalSpent.toFixed(2)}€</p></div>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Niveau de fidélité</Label>
                <Select value={selectedCustomer.loyaltyTier} onValueChange={(v) => { handleUpdateTier(selectedCustomer.id, v); setSelectedCustomer({ ...selectedCustomer, loyaltyTier: v }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="hud-text text-xs">Points de fidélité</Label><p className="text-2xl font-bold">{selectedCustomer.loyaltyPoints} pts</p></div>
              <div className="pt-2 border-t border-border">
                <Button variant="outline" className="w-full" onClick={() => window.location.href = `mailto:${selectedCustomer.email}`}>
                  <Mail className="h-4 w-4 mr-2" /> Envoyer un email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
