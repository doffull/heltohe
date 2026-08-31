import { useState, useEffect } from 'react';
import { useCustomers, useUpdateCustomer, useBulkDeleteCustomers, useCustomerEmailLog, CustomerRecord } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';
import { Shield } from 'lucide-react';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { WordPressSyncDialog } from '@/components/admin/WordPressSyncDialog';
import { CustomerImportDialog } from '@/components/admin/CustomerImportDialog';

import { 
  Users, Search, Mail, Phone, Crown, TrendingUp, Eye, Trash2, Filter, ArrowUpDown, RefreshCw, Save, History, Upload
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

import { ROLE_LABELS, ROLE_COLORS, useAllUserRoles, type AppRole } from '@/hooks/useUserRoles';
import { useQueryClient } from '@tanstack/react-query';

const MANAGEABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: 'stock_manager', label: 'Responsable stock' },
  { value: 'preparator', label: 'Préparateur' },
  { value: 'admin', label: 'Admin' },
];

function RoleBadges({ roles }: { roles: AppRole[] }) {
  if (!roles || roles.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map(r => (
        <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]}</span>
      ))}
    </div>
  );
}

function RoleManager({ userId, customerEmail, customerName }: { userId: string; customerEmail: string; customerName: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    setRoles(((data || []).map((r: any) => r.role)) as AppRole[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const toggleRole = async (role: AppRole, checked: boolean) => {
    if (checked) {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
      // Notification email (best-effort)
      supabase.functions.invoke('send-order-notification', {
        body: { notificationType: 'role_assigned', userId, role, customerEmail, customerName },
      }).catch(() => {});
      toast({ title: 'Rôle attribué', description: 'Notification envoyée par email.' });
    } else {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
      if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Rôle retiré' });
    }
    load();
    qc.invalidateQueries({ queryKey: ['all-user-roles'] });
    qc.invalidateQueries({ queryKey: ['role-audit-log'] });
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <Label className="hud-text text-xs flex items-center gap-1"><Shield className="h-3 w-3" /> Rôles équipe</Label>
      {loading ? <p className="text-xs text-muted-foreground">Chargement...</p> : (
        <div className="space-y-2">
          {MANAGEABLE_ROLES.map(r => (
            <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={roles.includes(r.value)} onCheckedChange={(c) => toggleRole(r.value, !!c)} />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
      )}
      {!loading && roles.length > 0 && <UserPasswordManager userId={userId} email={customerEmail} />}
    </div>
  );
}


function CustomerEditForm({ customer, onSaved }: { customer: CustomerRecord; onSaved: (c: CustomerRecord) => void }) {
  const { toast } = useToast();
  const update = useUpdateCustomer();
  const [form, setForm] = useState(customer);

  useEffect(() => { setForm(customer); }, [customer.id]);

  const dirty = JSON.stringify(form) !== JSON.stringify(customer);

  const save = async () => {
    try {
      await update.mutateAsync({
        id: form.id,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        zip: form.zip || null,
        country: form.country || null,
      });
      toast({ title: 'Fiche client enregistrée' });
      onSaved(form);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    }
  };

  const field = (label: string, key: keyof CustomerRecord, placeholder?: string) => (
    <div>
      <Label className="hud-text text-xs">{label}</Label>
      <Input value={(form[key] as string) || ''} placeholder={placeholder} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field('Prénom', 'firstName')}
        {field('Nom', 'lastName')}
        {field('Email', 'email')}
        {field('Téléphone', 'phone', '+33...')}
      </div>
      {field('Adresse', 'address', 'N° et rue')}
      <div className="grid grid-cols-3 gap-3">
        {field('Code postal', 'zip')}
        {field('Ville', 'city')}
        {field('Pays', 'country', 'France')}
      </div>
      <Button size="sm" className="w-full" disabled={!dirty || update.isPending} onClick={save}>
        <Save className="h-4 w-4 mr-2" /> {update.isPending ? 'Enregistrement...' : 'Enregistrer la fiche'}
      </Button>
    </div>
  );
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  paid: 'Paiement confirmé',
  shipped: 'Commande expédiée',
  role_assigned: 'Attribution de rôle',
};

function CustomerEmailHistory({ email }: { email: string }) {
  const { data: logs = [], isLoading } = useCustomerEmailLog(email);
  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <Label className="hud-text text-xs flex items-center gap-1"><History className="h-3 w-3" /> E-mails envoyés</Label>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Chargement...</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun e-mail envoyé à ce client.</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {logs.map((l: any) => (
            <div key={l.id} className="flex items-start justify-between gap-2 text-xs border border-border rounded px-2 py-1.5">
              <div className="min-w-0">
                <p className="font-medium truncate">{l.subject}</p>
                <p className="text-muted-foreground">{EMAIL_TYPE_LABELS[l.email_type] || l.email_type} · {new Date(l.created_at).toLocaleString('fr-FR')}</p>
                {l.error && <p className="text-destructive truncate">{l.error}</p>}
              </div>
              <span className={`shrink-0 px-1.5 py-0.5 rounded uppercase font-bold text-[10px] ${l.status === 'sent' ? 'bg-green-500/20 text-green-500' : 'bg-destructive/20 text-destructive'}`}>{l.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCustomers() {
  const { toast } = useToast();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: rolesByUser } = useAllUserRoles();
  const updateCustomer = useUpdateCustomer();
  const bulkDelete = useBulkDeleteCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);


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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold hud-text">CLIENTS</h1>
          <p className="text-muted-foreground text-xs lg:text-sm mt-1">{customers.length} clients enregistrés</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="w-full sm:w-auto gap-2">
            <Upload className="h-4 w-4" /> Importer des clients
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)} className="w-full sm:w-auto gap-2">
            <RefreshCw className="h-4 w-4" /> Sync WordPress
          </Button>
        </div>
      </div>

      <CustomerImportDialog open={importOpen} onOpenChange={setImportOpen} />


      {/* Filters */}
      <div className="chamfer-hud bg-card/50 p-3 lg:p-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[160px]"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom A-Z</SelectItem>
              <SelectItem value="spent-desc">Dépenses ↓</SelectItem>
              <SelectItem value="spent-asc">Dépenses ↑</SelectItem>
              <SelectItem value="points-desc">Points fidélité</SelectItem>
              <SelectItem value="date-desc">Inscription récente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <div className="admin-scroll-x admin-scroll-shadow min-w-0">
            <table className="w-full min-w-[760px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-4 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                  <th className="text-left p-4 text-xs font-bold hud-text">CLIENT</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">EMAIL</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">RÔLES</th>
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
                    <td className="p-4"><RoleBadges roles={rolesByUser?.get(customer.userId) || []} /></td>
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
          <DialogHeader>
            <DialogTitle className="hud-text">DÉTAILS CLIENT</DialogTitle>
            {selectedCustomer && <RoleBadges roles={rolesByUser?.get(selectedCustomer.userId) || []} />}
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <CustomerEditForm customer={selectedCustomer} onSaved={(c) => setSelectedCustomer(c)} />
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
              <div className="flex items-center justify-between">
                <div><Label className="hud-text text-xs">Points de fidélité</Label><p className="text-2xl font-bold">{selectedCustomer.loyaltyPoints} pts</p></div>
                <div className="text-right"><Label className="hud-text text-xs">Total dépensé</Label><p className="text-xl font-bold flex items-center gap-1 justify-end"><TrendingUp className="h-4 w-4" />{selectedCustomer.totalSpent.toFixed(2)}€</p></div>
              </div>
              <RoleManager userId={selectedCustomer.userId} customerEmail={selectedCustomer.email} customerName={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()} />
              <CustomerEmailHistory email={selectedCustomer.email} />

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
