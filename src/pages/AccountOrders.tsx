import { Package, Truck, Copy, ExternalLink, Check, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  useMyOrders,
  useMyTrackingEvents,
  useOrdersRealtime,
  TRACKING_STEPS,
  trackingStepIndex,
  carrierTrackingUrl,
  type MyOrder,
  type TrackingEvent,
} from '@/hooks/useMyOrders';


function StatusBadge({ order }: { order: MyOrder }) {
  const step = trackingStepIndex(order);
  const label = TRACKING_STEPS[step].label;
  return (
    <Badge variant={step >= 4 ? 'default' : step >= 3 ? 'secondary' : 'outline'} className="uppercase tracking-wider text-[10px]">
      {label}
    </Badge>
  );
}

function TrackingTimeline({ order }: { order: MyOrder }) {
  const current = trackingStepIndex(order);
  return (
    <ol className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0">
      {TRACKING_STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.key} className="flex sm:flex-col sm:flex-1 items-center gap-3 sm:gap-2 sm:text-center">
            <div className="flex sm:flex-col items-center sm:w-full">
              <span
                className={`h-7 w-7 shrink-0 flex items-center justify-center rounded-full border text-[11px] font-bold ${
                  done ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
            </div>
            <span className={`text-xs ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function OrderCard({ order, events = [] }: { order: MyOrder; events?: TrackingEvent[] }) {
  const url = carrierTrackingUrl(order.shippingCarrier, order.trackingNumber);

  return (
    <article className="chamfer-hud bg-card/50 p-5 sm:p-6 space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold hud-text text-sm sm:text-base">Commande {order.orderNumber}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} ·{' '}
            {order.total.toFixed(2)} €
          </p>
        </div>
        <StatusBadge order={order} />
      </header>

      <div className="relative border-t border-border pt-5">
        <TrackingTimeline order={order} />
      </div>

      {order.trackingNumber ? (
        <div className="bg-muted/40 border border-border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Transporteur</span>
            <span className="font-bold">{order.shippingCarrier || 'Colissimo'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">N° de suivi</span>
            <span className="font-mono font-bold break-all">{order.trackingNumber}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {url && (
              <Button asChild size="sm" className="flex-1">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Truck className="h-4 w-4 mr-2" /> Suivre mon colis
                  <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(order.trackingNumber || '');
                toast.success('Numéro de suivi copié');
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Copier
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Le numéro de suivi apparaîtra ici dès l'expédition (vous recevrez aussi un e-mail).
        </p>
      )}

      <div className="border-t border-border pt-4 space-y-2">
        {order.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="font-medium">{it.name}</span>
              {(it.size || it.color) && (
                <span className="text-muted-foreground text-xs">
                  {' '}
                  — {[it.size, it.color].filter(Boolean).join(' / ')}
                </span>
              )}
            </span>
            <span className="text-muted-foreground shrink-0">
              ×{it.quantity} · {(Number(it.price) * Number(it.quantity)).toFixed(2)} €
            </span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2">
          Livraison : {order.address}, {order.zip} {order.city} {order.country}
        </p>
      </div>

      {events.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <Radio className="h-3 w-3" aria-hidden="true" /> Historique du colis
          </h3>
          <ol className="space-y-3">
            {events.map((ev, i) => (
              <li key={ev.id} className="flex gap-3">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 0 ? 'bg-foreground' : 'bg-border'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className={`text-sm ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>{ev.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(ev.eventAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

export default function AccountOrders() {
  const { data: orders, isLoading } = useMyOrders();
  useOrdersRealtime();
  const { data: eventsByOrder } = useMyTrackingEvents((orders || []).map((o) => o.id));


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold hud-text mb-2">MES COMMANDES</h1>
        <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Suivez en direct l'avancement de vos colis.</p>

        {isLoading ? (
          <div className="chamfer-hud bg-card/50 p-12 flex justify-center">
            <div className="h-6 w-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="chamfer-hud bg-card/50 p-8 sm:p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Vous n'avez pas encore passé de commande.</p>
            <Button asChild>
              <Link to="/boutique">Découvrir la boutique</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
