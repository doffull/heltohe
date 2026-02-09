import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '@/types';

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

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
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
      return dbToAppOrder(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
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
    }) => {
      const updateData: Record<string, unknown> = {};
      if (fields.status !== undefined) updateData.status = fields.status;
      if (fields.paymentStatus !== undefined) updateData.payment_status = fields.paymentStatus;
      if (fields.paymentMethod !== undefined) updateData.payment_method = fields.paymentMethod;
      if (fields.notes !== undefined) updateData.notes = fields.notes;
      if (fields.trackingNumber !== undefined) updateData.tracking_number = fields.trackingNumber;
      if (fields.shippingCarrier !== undefined) updateData.shipping_carrier = fields.shippingCarrier;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
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
