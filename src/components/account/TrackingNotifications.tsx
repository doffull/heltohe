import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, Check, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import type { MyOrder, TrackingEvent } from '@/hooks/useMyOrders';

const SEEN_KEY = 'lvtk:tracking-seen-at';

interface Feed extends TrackingEvent {
  orderNumber: string;
}

function readSeen(): number {
  const raw = localStorage.getItem(SEEN_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** Centre de notifications : historique des événements de suivi + alerte sur nouveau statut. */
export default function TrackingNotifications({
  orders,
  eventsByOrder,
}: {
  orders: MyOrder[];
  eventsByOrder: Record<string, TrackingEvent[]>;
}) {
  const [seenAt, setSeenAt] = useState<number>(() => readSeen());
  const [open, setOpen] = useState(false);
  const knownIds = useRef<Set<string> | null>(null);

  const feed = useMemo<Feed[]>(() => {
    const byId = new Map(orders.map((o) => [o.id, o.orderNumber]));
    return Object.values(eventsByOrder)
      .flat()
      .map((ev) => ({ ...ev, orderNumber: byId.get(ev.orderId) || '—' }))
      .sort((a, b) => b.eventAt.localeCompare(a.eventAt));
  }, [orders, eventsByOrder]);

  const unread = feed.filter((ev) => new Date(ev.eventAt).getTime() > seenAt);

  // Alerte quand un nouvel événement arrive (temps réel)
  useEffect(() => {
    if (knownIds.current === null) {
      knownIds.current = new Set(feed.map((e) => e.id));
      return;
    }
    const fresh = feed.filter((e) => !knownIds.current!.has(e.id));
    fresh.forEach((e) => {
      knownIds.current!.add(e.id);
      toast.info(`Colis ${e.orderNumber} : ${e.label}`, {
        description: new Date(e.eventAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }),
        icon: <Package className="h-4 w-4" />,
      });
    });
  }, [feed]);

  function markAllRead() {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, String(now));
    setSeenAt(now);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) markAllRead();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          {unread.length > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          <span className="hidden sm:inline text-xs uppercase tracking-wider">Notifications</span>
          {unread.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Suivi de mes colis</p>
          {feed.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Tout lu
            </button>
          )}
        </div>
        {feed.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground text-center">
            Aucun événement transporteur pour le moment.
          </p>
        ) : (
          <ol className="max-h-80 overflow-y-auto divide-y divide-border">
            {feed.slice(0, 40).map((ev) => {
              const isNew = new Date(ev.eventAt).getTime() > seenAt;
              return (
                <li key={ev.id} className="px-4 py-3 flex gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isNew ? 'bg-foreground' : 'bg-border'}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className={`text-sm ${isNew ? 'font-medium' : 'text-muted-foreground'}`}>{ev.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Commande {ev.orderNumber} ·{' '}
                      {new Date(ev.eventAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </PopoverContent>
    </Popover>
  );
}
