import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';


export interface MyOrderItem {
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

export interface MyOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  items: MyOrderItem[];
  address: string;
  city: string;
  zip: string;
  country: string;
}

/** Étapes du suivi colis, dans l'ordre. */
export const TRACKING_STEPS = [
  { key: 'Pending', label: 'Commande reçue' },
  { key: 'Paid', label: 'Paiement validé' },
  { key: 'Processing', label: 'En préparation' },
  { key: 'Shipped', label: 'Expédiée' },
  { key: 'Delivered', label: 'Livrée' },
] as const;

/** Index de l'étape atteinte par la commande. */
export function trackingStepIndex(order: MyOrder): number {
  const s = (order.status || '').toLowerCase();
  if (s === 'delivered') return 4;
  if (s === 'shipped') return 3;
  if (s === 'processing' || s === 'preparation') return 2;
  if ((order.paymentStatus || '').toLowerCase() === 'paid') return 1;
  return 0;
}

/** URL de suivi transporteur. */
export function carrierTrackingUrl(carrier?: string | null, tracking?: string | null): string | null {
  if (!tracking) return null;
  const c = (carrier || '').toLowerCase();
  const t = encodeURIComponent(tracking);
  if (c.includes('mondial')) return `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${t}`;
  if (c.includes('chronopost')) return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${t}`;
  if (c.includes('dhl')) return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${t}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${t}`;
  if (c.includes('dpd')) return `https://www.dpd.fr/trace/${t}`;
  return `https://www.laposte.fr/outils/suivre-vos-envois?code=${t}`;
}

export function useMyOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-orders', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MyOrder[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_number, created_at, status, payment_status, total, subtotal, shipping_cost, tracking_number, shipping_carrier, items, customer_address, customer_city, customer_zip, customer_country',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((o: Record<string, unknown>) => ({
        id: o.id as string,
        orderNumber: o.order_number as string,
        createdAt: o.created_at as string,
        status: o.status as string,
        paymentStatus: o.payment_status as string,
        total: Number(o.total || 0),
        subtotal: Number(o.subtotal || 0),
        shippingCost: Number(o.shipping_cost || 0),
        trackingNumber: (o.tracking_number as string) || null,
        shippingCarrier: (o.shipping_carrier as string) || null,
        items: (o.items as MyOrderItem[]) || [],
        address: (o.customer_address as string) || '',
        city: (o.customer_city as string) || '',
        zip: (o.customer_zip as string) || '',
        country: (o.customer_country as string) || '',
      }));
    },
  });
}

export interface TrackingEvent {
  id: string;
  orderId: string;
  statusCode: string;
  label: string;
  location?: string | null;
  carrier?: string | null;
  eventAt: string;
}

/** Historique des événements transporteur pour les commandes du client. */
export function useMyTrackingEvents(orderIds: string[]) {
  const key = [...orderIds].sort().join(',');
  return useQuery({
    queryKey: ['my-tracking-events', key],
    enabled: orderIds.length > 0,
    queryFn: async (): Promise<Record<string, TrackingEvent[]>> => {
      const { data, error } = await supabase
        .from('order_tracking_events')
        .select('id, order_id, status_code, label, location, carrier, event_at')
        .in('order_id', orderIds)
        .order('event_at', { ascending: false });
      if (error) throw error;
      const grouped: Record<string, TrackingEvent[]> = {};
      (data || []).forEach((r: Record<string, unknown>) => {
        const ev: TrackingEvent = {
          id: r.id as string,
          orderId: r.order_id as string,
          statusCode: r.status_code as string,
          label: r.label as string,
          location: (r.location as string) || null,
          carrier: (r.carrier as string) || null,
          eventAt: r.event_at as string,
        };
        (grouped[ev.orderId] ||= []).push(ev);
      });
      return grouped;
    },
  });
}

/** Abonnement temps réel : commandes + événements de suivi. */
export function useOrdersRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-tracking-events'] });
    };
    const channel = supabase
      .channel('my-orders-tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_tracking_events' }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}

