import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Truck, ExternalLink, Radio, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/context/CurrencyContext';
import {
  useMyOrders,
  useMyTrackingEvents,
  useOrdersRealtime,
  TRACKING_STEPS,
  trackingStepIndex,
  carrierTrackingUrl,
  type MyOrder,
} from '@/hooks/useMyOrders';

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'progress', label: 'En cours' },
  { key: 'shipped', label: 'Expédiées' },
  { key: 'delivered', label: 'Livrées' },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

function matches(order: MyOrder, filter: FilterKey): boolean {
  const step = trackingStepIndex(order);
  if (filter === 'progress') return step < 3;
  if (filter === 'shipped') return step === 3;
  if (filter === 'delivered') return step >= 4;
  return true;
}

/** /compte/suivi — tableau de suivi de toutes les commandes du client. */
export default function AccountOrderTracking() {
  useOrdersRealtime();
  const { data: orders = [], isLoading } = useMyOrders();
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const ids = useMemo(() => orders.map(o => o.id), [orders]);
  const { data: eventsByOrder = {} } = useMyTrackingEvents(ids);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (!matches(o, filter)) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.trackingNumber || '').toLowerCase().includes(q)
      );
    });
  }, [orders, filter, search]);

  return (
    <main className="container mx-auto px-4 py-8 sm:py-12 space-y-6">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="text-xs -ml-2">
          <Link to="/compte"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Mon compte</Link>
        </Button>
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Truck className="h-5 w-5" /> Suivi de mes commandes
        </h1>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-primary animate-pulse" /> Mise à jour en temps réel
        </p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative max-w-xs w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="N° de commande ou de suivi"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {FILTERS.map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            className="text-xs"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement de vos commandes…</p>}
      {!isLoading && !rows.length && (
        <div className="chamfer-hud bg-card/50 p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Aucune commande à afficher pour ce filtre.</p>
          <Button asChild variant="outline"><Link to="/boutique">Découvrir la boutique</Link></Button>
        </div>
      )}

      <div className="chamfer-hud bg-card/50 divide-y divide-border">
        {rows.map(o => {
          const step = trackingStepIndex(o);
          const url = carrierTrackingUrl(o.shippingCarrier, o.trackingNumber);
          const events = eventsByOrder[o.id] || [];
          const open = openId === o.id;
          return (
            <div key={o.id} className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold font-mono">#{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {' · '}{format(o.total)}
                  </p>
                </div>
                <Badge
                  variant={step >= 4 ? 'default' : step >= 3 ? 'secondary' : 'outline'}
                  className="uppercase tracking-wider text-[10px]"
                >
                  {TRACKING_STEPS[step].label}
                </Badge>
                {o.trackingNumber ? (
                  <span className="text-xs font-mono text-muted-foreground">{o.trackingNumber}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Suivi à venir</span>
                )}
                {url && (
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Suivre <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setOpenId(open ? null : o.id)}
                >
                  {open ? 'Masquer' : 'Détail'}
                </Button>
              </div>

              {open && (
                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Articles</p>
                    {o.items.map((it, i) => (
                      <p key={i} className="text-sm">
                        {it.quantity} × {it.name}
                        {it.size ? ` — ${it.size}` : ''}{it.color ? ` / ${it.color}` : ''}
                      </p>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">
                      Livraison : {o.address}, {o.zip} {o.city} ({o.country})
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Historique transporteur</p>
                    {!events.length && <p className="text-sm text-muted-foreground">Aucun événement pour le moment.</p>}
                    {events.map(ev => (
                      <p key={ev.id} className="text-sm">
                        <span className="text-muted-foreground font-mono text-xs mr-2">
                          {new Date(ev.eventAt).toLocaleString('fr-FR')}
                        </span>
                        {ev.label}{ev.location ? ` — ${ev.location}` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
