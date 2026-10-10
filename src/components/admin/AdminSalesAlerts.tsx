import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/** Admin-only, read-only alert listener. No inventory or order mutations. */
export function AdminSalesAlerts() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const seenOrders = useRef(new Set<string>());
  const seenLow = useRef(new Set<string>());
  const initialized = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [orders, products] = await Promise.all([
        supabase.from('orders').select('id,order_number,payment_status,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('products').select('id,name,stock').limit(2000),
      ]);
      if (!alive) return;
      if (!initialized.current) {
        (orders.data || []).forEach(o => { if (String(o.payment_status).toLowerCase() === 'paid') seenOrders.current.add(o.id); });
        (products.data || []).forEach(p => { if (Number(p.stock) <= 0) seenLow.current.add(p.id); });
        initialized.current = true;
        return;
      }
      (orders.data || []).forEach(o => {
        if (String(o.payment_status).toLowerCase() !== 'paid' || seenOrders.current.has(o.id)) return;
        seenOrders.current.add(o.id);
        announce('Nouvelle vente', `Commande ${o.order_number || o.id} payée`);
      });
      (products.data || []).forEach(p => {
        if (Number(p.stock) <= 0 && !seenLow.current.has(p.id)) {
          seenLow.current.add(p.id);
          announce('Rupture de stock', p.name || 'Un produit est épuisé');
        } else if (Number(p.stock) > 0) seenLow.current.delete(p.id);
      });
    };
    function announce(title: string, description: string) {
      toast({ title, description });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        try { new Notification(`HELVETICA · ${title}`, { body: description, tag: `${title}-${description}` }); } catch { /* Browser may block system notifications */ }
      }
    }
    void load();
    const interval = window.setInterval(() => void load(), 20000);
    const channel = supabase.channel('admin-sales-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => void load())
      .subscribe();
    return () => { alive = false; window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [toast]);

  if (permission === 'unsupported') return null;
  return (
    <button type="button" title="Notifications admin de ventes et ruptures de stock" aria-label="Activer les notifications ordinateur" onClick={async () => {
      if (Notification.permission === 'default') setPermission(await Notification.requestPermission());
      else setPermission(Notification.permission);
    }} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-blue-400/25 bg-[#152846] px-3 text-xs font-semibold text-blue-100 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-blue-700/40 active:scale-95">
      {permission === 'granted' ? <BellRing className="h-4 w-4 text-cyan-300" /> : <Bell className="h-4 w-4" />}
      <span className="hidden sm:inline">{permission === 'granted' ? 'Alertes actives' : 'Activer les alertes'}</span>
    </button>
  );
}
