import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Package, ClipboardCheck, Clock, CheckCircle2, UserPlus, Loader2 } from 'lucide-react';

type Preparation = {
  id: string;
  order_id: string;
  status: string;
  assigned_to: string | null;
  assigned_at: string | null;
  prepared_at: string | null;
  notes: string | null;
  created_at: string;
};

type OrderLite = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_city: string;
  items: any[];
  total: number;
  created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: Clock },
  assigned: { label: 'Assignée', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: UserPlus },
  in_progress: { label: 'En cours', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Loader2 },
  ready: { label: 'Prête', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: ClipboardCheck },
};

export default function AdminPreparations() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: preparations = [], isLoading } = useQuery({
    queryKey: ['order-preparations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_preparations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Preparation[];
    },
  });

  const orderIds = preparations.map(p => p.order_id);
  const { data: orders = [] } = useQuery({
    queryKey: ['preparations-orders', orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_city, items, total, created_at')
        .in('id', orderIds);
      if (error) throw error;
      return data as OrderLite[];
    },
    enabled: orderIds.length > 0,
  });

  const { data: preparators = [] } = useQuery({
    queryKey: ['preparators'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_users_by_role', { p_role: 'preparator' });
      if (error) { console.warn(error); return []; }
      return (data as any[]) || [];
    },
  });

  const ordersById = new Map(orders.map(o => [o.id, o]));

  const assignMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('order_preparations')
        .update({
          assigned_to: userId,
          assigned_by: user?.id,
          assigned_at: new Date().toISOString(),
          status: 'assigned',
        })
        .eq('id', id);
      if (error) throw error;
      // Notify preparator
      const prep = preparations.find(p => p.id === id);
      const order = prep ? ordersById.get(prep.order_id) : null;
      const target = (preparators as any[]).find(p => p.user_id === userId);
      if (order && target?.email) {
        await supabase.functions.invoke('send-order-notification', {
          body: {
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerEmail: target.email,
            notificationType: 'preparation_assigned',
          },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-preparations'] });
      toast({ title: '✅ Préparation assignée', description: 'Le préparateur a été notifié' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'ready') updates.prepared_at = new Date().toISOString();
      const { error } = await supabase.from('order_preparations').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-preparations'] });
      toast({ title: 'Statut mis à jour' });
    },
  });

  const filtered = preparations.filter(p => statusFilter === 'all' || p.status === statusFilter);
  const counts = preparations.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold hud-text flex items-center gap-2">
            <Package className="h-5 w-5 lg:h-6 lg:w-6" />
            PRÉPARATIONS
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">
            Commandes payées dont le stock a été réservé et qui doivent être préparées.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous ({preparations.length})</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label} ({counts[k] || 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(STATUS_LABELS).map(([k, v]) => {
          const Icon = v.icon;
          return (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={`p-4 border rounded-lg text-left hover:border-foreground/30 transition-colors ${statusFilter === k ? 'border-foreground' : ''}`}
            >
              <Icon className="h-4 w-4 mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{counts[k] || 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{v.label}</div>
            </button>
          );
        })}
      </div>

      <div className="border rounded-lg admin-scroll-x admin-scroll-shadow min-w-0">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Préparateur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Aucune préparation</TableCell></TableRow>
            )}
            {filtered.map(prep => {
              const order = ordersById.get(prep.order_id);
              const statusInfo = STATUS_LABELS[prep.status] || STATUS_LABELS.pending;
              const assigned = (preparators as any[]).find(p => p.user_id === prep.assigned_to);
              return (
                <TableRow key={prep.id}>
                  <TableCell className="font-mono text-sm">
                    {order?.order_number || prep.order_id.slice(0, 8)}
                    <div className="text-xs text-muted-foreground">{new Date(prep.created_at).toLocaleDateString('fr-FR')}</div>
                  </TableCell>
                  <TableCell>
                    <div>{order?.customer_name || '-'}</div>
                    <div className="text-xs text-muted-foreground">{order?.customer_city}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      {(order?.items || []).map((it: any, i: number) => (
                        <div key={i}>
                          <span className="font-medium">{it.quantity}×</span> {it.name}
                          {it.size && <Badge variant="outline" className="ml-1 text-[10px]">{it.size}</Badge>}
                          {it.color && <Badge variant="outline" className="ml-1 text-[10px]">{it.color}</Badge>}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={prep.assigned_to || ''}
                      onValueChange={(v) => assignMutation.mutate({ id: prep.id, userId: v })}
                      disabled={prep.status === 'ready'}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-xs">
                        <SelectValue placeholder="Assigner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(preparators as any[]).length === 0 && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucun préparateur — créez le rôle</div>
                        )}
                        {(preparators as any[]).map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {prep.status === 'assigned' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: prep.id, status: 'in_progress' })}>
                        Démarrer
                      </Button>
                    )}
                    {(prep.status === 'in_progress' || prep.status === 'assigned') && (
                      <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: prep.id, status: 'ready' })}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Marquer prête
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
