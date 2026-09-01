import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PackageSearch, RefreshCw, Truck } from 'lucide-react';

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number | null;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  created_at: string;
}

interface PaypalRow {
  order_id: string | null;
  paypal_order_id: string | null;
  capture_id: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  environment: string | null;
  refunded_amount: number | null;
  created_at: string;
}

interface PayplugRow {
  order_id: string | null;
  payplug_payment_id: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  is_live: boolean | null;
  failure_message: string | null;
  created_at: string;
}

const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

function statusTone(status: string | null): string {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    case 'shipped':
      return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
    case 'processing':
    case 'paid':
      return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    case 'cancelled':
    case 'refunded':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function payTone(status: string | null): string {
  const s = (status || '').toLowerCase();
  if (['completed', 'captured', 'paid', 'succeeded', 'approved'].includes(s)) {
    return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  }
  if (['failed', 'declined', 'expired', 'cancelled', 'voided'].includes(s)) {
    return 'bg-destructive/15 text-destructive border-destructive/30';
  }
  return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
}

const money = (v: number | null | undefined, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(Number(v || 0));

export default function AdminOrderTracking() {
  const [search, setSearch] = useState('');

  const orders = useQuery({
    queryKey: ['admin-order-tracking-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_number, customer_name, customer_email, total, status, payment_status, payment_method, tracking_number, shipping_carrier, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
    refetchInterval: 30_000,
  });

  const paypal = useQuery({
    queryKey: ['admin-order-tracking-paypal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paypal_transactions')
        .select('order_id, paypal_order_id, capture_id, status, amount, currency, environment, refunded_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(800);
      if (error) throw error;
      return (data || []) as PaypalRow[];
    },
    refetchInterval: 30_000,
  });

  const payplug = useQuery({
    queryKey: ['admin-order-tracking-payplug'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payplug_transactions')
        .select('order_id, payplug_payment_id, status, amount, currency, is_live, failure_message, created_at')
        .order('created_at', { ascending: false })
        .limit(800);
      if (error) throw error;
      return (data || []) as PayplugRow[];
    },
    refetchInterval: 30_000,
  });

  const paypalByOrder = useMemo(() => {
    const map = new Map<string, PaypalRow>();
    (paypal.data || []).forEach((t) => {
      if (t.order_id && !map.has(t.order_id)) map.set(t.order_id, t);
    });
    return map;
  }, [paypal.data]);

  const payplugByOrder = useMemo(() => {
    const map = new Map<string, PayplugRow>();
    (payplug.data || []).forEach((t) => {
      if (t.order_id && !map.has(t.order_id)) map.set(t.order_id, t);
    });
    return map;
  }, [payplug.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orders.data || [];
    if (!q) return list;
    return list.filter((o) =>
      [o.order_number, o.customer_name, o.customer_email, o.tracking_number, o.status, o.payment_method]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [orders.data, search]);

  const counters = useMemo(() => {
    const list = orders.data || [];
    const byStatus: Record<string, number> = {};
    list.forEach((o) => {
      const s = (o.status || 'pending').toLowerCase();
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    return byStatus;
  }, [orders.data]);

  const refreshAll = () => {
    orders.refetch();
    paypal.refetch();
    payplug.refetch();
  };

  const loading = orders.isLoading || paypal.isLoading || payplug.isLoading;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            Suivi des commandes
          </h1>
          <p className="text-sm text-muted-foreground">État de chaque commande et statut du paiement PayPal / PayPlug</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="gap-2 text-xs uppercase tracking-wider">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUS_STEPS.map((s) => (
          <Card key={s}>
            <CardHeader className="pb-1">
              <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {STATUS_LABELS[s]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counters[s] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-wider">Commandes</CardTitle>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (n° commande, client, e-mail, n° de suivi…)"
            className="mt-2 h-9 text-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <ul className="divide-y divide-border">
                {filtered.map((o) => {
                  const pp = paypalByOrder.get(o.id);
                  const plg = payplugByOrder.get(o.id);
                  return (
                    <li key={o.id} className="p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold">{o.order_number}</span>
                            <Badge variant="outline" className={`text-[10px] ${statusTone((o.status || '').toLowerCase())}`}>
                              {STATUS_LABELS[(o.status || 'pending').toLowerCase()] || o.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {o.customer_name || '—'} · {o.customer_email || '—'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{money(o.total)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(o.created_at).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <Badge variant="outline" className="text-[10px]">
                          Paiement : {o.payment_status || '—'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          Moyen : {o.payment_method || '—'}
                        </Badge>
                        {o.tracking_number && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Truck className="h-3 w-3" />
                            {o.shipping_carrier || 'Colissimo'} · {o.tracking_number}
                          </Badge>
                        )}
                      </div>

                      {(pp || plg) && (
                        <div className="grid gap-2 md:grid-cols-2">
                          {pp && (
                            <div className="rounded border border-border p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest">PayPal</span>
                                <Badge variant="outline" className={`text-[10px] ${payTone(pp.status)}`}>
                                  {pp.status || '—'}
                                </Badge>
                              </div>
                              <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground font-mono break-all">
                                <div>Order : {pp.paypal_order_id || '—'}</div>
                                <div>Capture : {pp.capture_id || '—'}</div>
                                <div>
                                  {money(pp.amount, pp.currency || 'EUR')} · {pp.environment || '—'}
                                  {Number(pp.refunded_amount || 0) > 0 && ` · remboursé ${money(pp.refunded_amount, pp.currency || 'EUR')}`}
                                </div>
                              </div>
                            </div>
                          )}
                          {plg && (
                            <div className="rounded border border-border p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest">PayPlug</span>
                                <Badge variant="outline" className={`text-[10px] ${payTone(plg.status)}`}>
                                  {plg.status || '—'}
                                </Badge>
                              </div>
                              <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground font-mono break-all">
                                <div>Paiement : {plg.payplug_payment_id || '—'}</div>
                                <div>
                                  {money(plg.amount ? Number(plg.amount) / 100 : 0, plg.currency || 'EUR')} ·{' '}
                                  {plg.is_live ? 'live' : 'test'}
                                </div>
                                {plg.failure_message && <div className="text-destructive">{plg.failure_message}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="p-10 text-center text-xs text-muted-foreground">Aucune commande trouvée</li>
                )}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
