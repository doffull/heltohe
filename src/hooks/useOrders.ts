import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '@/types';

/** Envoi automatique (best-effort) des e-mails transactionnels Resend. */
export async function triggerOrderEmail(orderId: string, type: 'paid' | 'shipped') {
  try {
    const { error } = await supabase.functions.invoke('send-order-status-email', {
      body: { order_id: orderId, type },
    });
    if (error) console.error('send-order-status-email', error);
  } catch (e) {
    console.error('send-order-status-email', e);
  }
}


// Transform DB order to app order
function dbToAppOrder(db: Record<string, unknown>): Order {
  return {
    id: db.id as string,
    orderNumber: db.order_number as string,
    date: db.created_at as string,
    customer: {
      name: db.customer_name as string,
      email: db.customer_email as string,
      phone: (db.customer_phone as string) || undefined,
      address: db.customer_address as string,
      city: db.customer_city as string,
      zip: db.customer_zip as string,
      country: db.customer_country as string,
    },
    items: (db.items as OrderItem[]) || [],
    subtotal: Number(db.subtotal),
    tax: Number(db.tax),
    shippingCost: Number(db.shipping_cost),
    total: Number(db.total),
    status: db.status as OrderStatus,
    paymentStatus: db.payment_status as PaymentStatus,
    paymentMethod: (db.payment_method as string) || undefined,
    notes: (db.notes as string) || undefined,
    trackingNumber: (db.tracking_number as string) || undefined,
    shippingCarrier: (db.shipping_carrier as string) || undefined,
  };
}

/**
 * Commandes de l'admin.
 * `scope` :
 *  - `paid` (défaut) : uniquement les commandes dont le paiement a abouti.
 *  - `abandoned` : paniers abandonnés (paiement jamais confirmé).
 *  - `all` : tout.
 */
export function useOrders(scope: 'paid' | 'abandoned' | 'all' = 'paid') {
  return useQuery({
    queryKey: ['orders', 'scope', scope],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (scope === 'paid') query = query.eq('payment_status', 'Paid');
      if (scope === 'abandoned') query = query.neq('payment_status', 'Paid');

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(dbToAppOrder);
    },
  });
}


export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return dbToAppOrder(data as Record<string, unknown>);
    },
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return dbToAppOrder(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      if (paymentStatus === 'Paid') await triggerOrderEmail(id, 'paid');
      return dbToAppOrder(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** Passe la commande en expédiée avec transporteur + suivi et envoie l'e-mail de suivi. */
export function useShipOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, carrier, trackingNumber }: { id: string; carrier: string; trackingNumber: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Shipped', shipping_carrier: carrier, tracking_number: trackingNumber })
        .eq('id', id);
      if (error) throw error;
      await triggerOrderEmail(id, 'shipped');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}


export function useUpdateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...fields }: { 
      id: string; 
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      paymentMethod?: string;
      notes?: string;
      trackingNumber?: string;
      shippingCarrier?: string;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      customerAddress?: string;
      customerCity?: string;
      customerZip?: string;
      customerCountry?: string;
      items?: OrderItem[];
      subtotal?: number;
      total?: number;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (fields.status !== undefined) updateData.status = fields.status;
      if (fields.paymentStatus !== undefined) updateData.payment_status = fields.paymentStatus;
      if (fields.paymentMethod !== undefined) updateData.payment_method = fields.paymentMethod;
      if (fields.notes !== undefined) updateData.notes = fields.notes;
      if (fields.trackingNumber !== undefined) updateData.tracking_number = fields.trackingNumber;
      if (fields.shippingCarrier !== undefined) updateData.shipping_carrier = fields.shippingCarrier;
      if (fields.customerName !== undefined) updateData.customer_name = fields.customerName;
      if (fields.customerEmail !== undefined) updateData.customer_email = fields.customerEmail;
      if (fields.customerPhone !== undefined) updateData.customer_phone = fields.customerPhone;
      if (fields.customerAddress !== undefined) updateData.customer_address = fields.customerAddress;
      if (fields.customerCity !== undefined) updateData.customer_city = fields.customerCity;
      if (fields.customerZip !== undefined) updateData.customer_zip = fields.customerZip;
      if (fields.customerCountry !== undefined) updateData.customer_country = fields.customerCountry;
      if (fields.items !== undefined) updateData.items = fields.items;
      if (fields.subtotal !== undefined) updateData.subtotal = fields.subtotal;
      if (fields.total !== undefined) updateData.total = fields.total;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      const updated = dbToAppOrder(data as Record<string, unknown>);
      // E-mails automatiques (best-effort)
      if (fields.paymentStatus === 'Paid') await triggerOrderEmail(id, 'paid');
      if (fields.status === 'Shipped' && updated.trackingNumber) await triggerOrderEmail(id, 'shipped');
      return updated;

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useBulkDeleteOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('orders').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}
