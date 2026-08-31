import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { History, Loader2 } from 'lucide-react';

interface TrackingEvent {
  id: string;
  label: string;
  status_code: string;
  carrier: string | null;
  location: string | null;
  event_at: string;
}

/** Historique des événements de suivi d'une commande (lecture seule). */
export function OrderHistoryPanel({ orderId, createdAt }: { orderId: string; createdAt?: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['order_tracking_events', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_tracking_events')
        .select('id, label, status_code, carrier, location, event_at')
        .eq('order_id', orderId)
        .order('event_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TrackingEvent[];
    },
    enabled: !!orderId,
  });

  const fmt = (d: string) =>
    new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="chamfer-hud bg-muted/30 p-4 space-y-3">
      <h3 className="text-sm font-bold hud-text flex items-center gap-2">
        <History className="h-4 w-4" /> HISTORIQUE
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Chargement...
        </div>
      ) : (
        <ol className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="relative pl-5 text-xs">
              <span className="absolute left-0 top-1 h-2 w-2 rounded-full bg-primary" />
              <div className="font-bold">{e.label}</div>
              <div className="text-muted-foreground">
                {fmt(e.event_at)}
                {e.location ? ` · ${e.location}` : ''}
                {e.carrier ? ` · ${e.carrier}` : ''}
              </div>
            </li>
          ))}
          {createdAt && (
            <li className="relative pl-5 text-xs">
              <span className="absolute left-0 top-1 h-2 w-2 rounded-full bg-muted-foreground" />
              <div className="font-bold">Commande créée</div>
              <div className="text-muted-foreground">{fmt(createdAt)}</div>
            </li>
          )}
          {!events.length && !createdAt && (
            <li className="text-xs text-muted-foreground">Aucun événement enregistré.</li>
          )}
        </ol>
      )}
    </div>
  );
}

export default OrderHistoryPanel;
