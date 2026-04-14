import { useState } from 'react';
import { useOrders, useUpdateOrder, useBulkDeleteOrders } from '@/hooks/useOrders';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '@/types';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WordPressSyncDialog } from '@/components/admin/WordPressSyncDialog';
import { 
  Package, Clock, Truck, CheckCircle, XCircle, Eye, FileText, Save, Printer, Mail, ExternalLink, Trash2,
  CreditCard, Banknote, MapPin, FileDown, Tag, Search, Filter, Loader2, RefreshCw, CheckSquare, ArrowUpDown,
  UserCheck, DollarSign, Send, Check, ShieldCheck, AlertTriangle, XOctagon
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationConfig } from '@/hooks/useNotificationConfig';

const STATUS_OPTIONS: { value: OrderStatus; label: string; icon: typeof Clock; color: string }[] = [
  { value: 'Pending', label: 'En attente', icon: Clock, color: 'text-yellow-500' },
  { value: 'Processing', label: 'En cours', icon: Package, color: 'text-blue-500' },
  { value: 'Shipped', label: 'Expédiée', icon: Truck, color: 'text-purple-500' },
  { value: 'Delivered', label: 'Livrée', icon: CheckCircle, color: 'text-green-500' },
  { value: 'Cancelled', label: 'Annulée', icon: XCircle, color: 'text-destructive' },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'Pending', label: 'En attente' },
  { value: 'Paid', label: 'Payé' },
  { value: 'Failed', label: 'Échoué' },
  { value: 'Refunded', label: 'Remboursé' },
];

const CARRIERS = ['Colissimo', 'Chronopost', 'Mondial Relay', 'DHL', 'UPS', 'Autre'];
const PAYMENT_METHODS = ['Carte bancaire', 'Virement', 'PayPal', 'Espèces', 'Autre'];

const COUNTRY_FLAGS: Record<string, string> = {
  'France': '🇫🇷', 'Belgique': '🇧🇪', 'Suisse': '🇨🇭', 'Canada': '🇨🇦',
  'Allemagne': '🇩🇪', 'Espagne': '🇪🇸', 'Italie': '🇮🇹', 'Portugal': '🇵🇹',
  'Royaume-Uni': '🇬🇧', 'États-Unis': '🇺🇸', 'Pays-Bas': '🇳🇱', 'Luxembourg': '🇱🇺',
};

function getCountryFlag(country: string) { return COUNTRY_FLAGS[country] || '🌍'; }

function getPaymentIcon(method?: string) {
  if (!method) return <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />;
  const m = method.toLowerCase();
  if (m.includes('paypal')) return <span className="text-xs font-bold text-muted-foreground">PP</span>;
  if (m.includes('carte') || m.includes('cb')) return <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />;
  if (m.includes('virement') || m.includes('espèces')) return <Banknote className="h-3.5 w-3.5 text-muted-foreground" />;
  return <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getShippingIcon(carrier?: string) {
  if (!carrier) return null;
  const c = carrier.toLowerCase();
  if (c.includes('relay') || c.includes('mondial')) return <MapPin className="h-3 w-3" />;
  return <Truck className="h-3 w-3" />;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `il y a ${diffD}j`;
  return `il y a ${Math.floor(diffD / 30)} mois`;
}

function generateDeliverySlipHTML(order: Order): string {
  const itemsRows = order.items.map((item: OrderItem) => `<tr><td style="padding:6px;border-bottom:1px solid #eee;">${item.name || item.productId}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:6px;border-bottom:1px solid #eee;">${item.size || '-'}</td><td style="padding:6px;border-bottom:1px solid #eee;">${item.color || '-'}</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bon de livraison ${order.orderNumber}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#333;font-size:13px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin:15px 0}.header{display:flex;justify-content:space-between;margin-bottom:30px}@media print{body{padding:15px}}</style></head><body><div class="header"><div><h1>BON DE LIVRAISON</h1><p><strong>${order.orderNumber}</strong></p><p>Date: ${new Date(order.date).toLocaleDateString('fr-FR')}</p></div><div style="text-align:right"><h2>LVTK6</h2></div></div><div style="margin-bottom:20px"><h3>Destinataire</h3><p><strong>${order.customer.name}</strong><br>${order.customer.address}<br>${order.customer.zip} ${order.customer.city}<br>${order.customer.country}</p>${order.customer.phone ? `<p>Tél: ${order.customer.phone}</p>` : ''}</div><table><thead><tr><th style="padding:6px;border-bottom:2px solid #333;text-align:left">Article</th><th style="padding:6px;border-bottom:2px solid #333;text-align:center">Qté</th><th style="padding:6px;border-bottom:2px solid #333;text-align:left">Taille</th><th style="padding:6px;border-bottom:2px solid #333;text-align:left">Couleur</th></tr></thead><tbody>${itemsRows}</tbody></table><div style="margin-top:30px;padding:15px;border:1px solid #333"><p><strong>Nombre total d'articles:</strong> ${order.items.reduce((s, i) => s + i.quantity, 0)}</p>${order.trackingNumber ? `<p><strong>N° Suivi:</strong> ${order.trackingNumber}</p>` : ''}${order.shippingCarrier ? `<p><strong>Transporteur:</strong> ${order.shippingCarrier}</p>` : ''}</div><div style="margin-top:30px;font-size:11px;color:#999;text-align:center">Bon de livraison généré automatiquement - LVTK6</div></body></html>`;
}

function generateShippingLabelHTML(order: Order, isReturn = false): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Étiquette ${isReturn ? 'retour' : 'aller'} ${order.orderNumber}</title><style>body{font-family:Arial,sans-serif;padding:20px}.label{border:3px solid #000;padding:25px;max-width:400px;margin:auto}.from,.to{margin-bottom:15px}h3{margin:0 0 5px;text-transform:uppercase;font-size:11px;letter-spacing:2px;color:#666}p{margin:3px 0;font-size:14px}.barcode{text-align:center;margin:15px 0;font-family:monospace;font-size:18px;letter-spacing:4px}@media print{body{padding:0}}</style></head><body><div class="label"><div class="from"><h3>${isReturn ? 'Destinataire (retour)' : 'Expéditeur'}</h3><p><strong>LVTK6 Concept Store</strong></p><p>Paris, France</p></div><hr/><div class="to"><h3>${isReturn ? 'Expéditeur (client)' : 'Destinataire'}</h3><p><strong>${order.customer.name}</strong></p><p>${order.customer.address}</p><p>${order.customer.zip} ${order.customer.city}</p><p>${order.customer.country}</p>${order.customer.phone ? `<p>Tél: ${order.customer.phone}</p>` : ''}</div><hr/><div class="barcode">${order.trackingNumber || order.orderNumber}</div><p style="text-align:center;font-size:11px;color:#666">${order.orderNumber} · ${order.shippingCarrier || 'Standard'}</p></div></body></html>`;
}

function generateInvoiceHTML(order: Order): string {
  const itemsRows = order.items.map((item: OrderItem) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.name || item.productId}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${(item.price || 0).toFixed(2)}€</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${((item.price || 0) * item.quantity).toFixed(2)}€</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facture ${order.orderNumber}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin:20px 0}.header{display:flex;justify-content:space-between;margin-bottom:40px}.total-section{text-align:right;margin-top:20px}@media print{body{padding:20px}}</style></head><body><div class="header"><div><h1>FACTURE</h1><p><strong>${order.orderNumber}</strong></p><p>Date: ${new Date(order.date).toLocaleDateString('fr-FR')}</p></div><div style="text-align:right"><h2>LVTK6</h2><p>Concept Store</p></div></div><div style="margin-bottom:30px"><h3>Client</h3><p>${order.customer.name}<br>${order.customer.email}<br>${order.customer.address}<br>${order.customer.zip} ${order.customer.city}<br>${order.customer.country}</p>${order.customer.phone ? `<p>Tél: ${order.customer.phone}</p>` : ''}</div><table><thead><tr><th style="padding:8px;border-bottom:2px solid #333;text-align:left">Article</th><th style="padding:8px;border-bottom:2px solid #333;text-align:center">Qté</th><th style="padding:8px;border-bottom:2px solid #333;text-align:right">Prix unit.</th><th style="padding:8px;border-bottom:2px solid #333;text-align:right">Total</th></tr></thead><tbody>${itemsRows}</tbody></table><div class="total-section"><p>Sous-total: ${order.subtotal.toFixed(2)}€</p><p>TVA: ${order.tax.toFixed(2)}€</p><p>Livraison: ${order.shippingCost.toFixed(2)}€</p><p style="font-size:18px;font-weight:bold;margin-top:10px">Total: ${order.total.toFixed(2)}€</p></div><div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">Facture générée automatiquement - LVTK6 Concept Store</div></body></html>`;
}

function openPrintWindow(html: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) { win.onload = () => { win.print(); }; }
}

function getColissimoUrl(tracking: string) {
  return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(tracking)}`;
}

interface EditForm {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  shippingCarrier: string;
  trackingNumber: string;
  notes: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerZip: string;
  customerCountry: string;
  items: OrderItem[];
}

export default function AdminOrders() {
  const { toast } = useToast();
  const { data: orders = [], isLoading } = useOrders();
  const { data: designSettings } = useDesignSettings();
  const updateOrder = useUpdateOrder();
  const bulkDelete = useBulkDeleteOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [trackingInput, setTrackingInput] = useState<string>('');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationPopoverOpen, setVerificationPopoverOpen] = useState<string | null>(null);
  const { data: notifConfig } = useNotificationConfig();

  // Quick validation helpers
  const getValidationFlags = (order: Order): { identity: boolean; payment: boolean; shipping: boolean } => {
    const flags = (order as any).validationFlags || (order as any).validation_flags;
    return flags || { identity: false, payment: false, shipping: false };
  };

  // Send notification if configured
  const sendNotificationIfNeeded = async (order: Order, type: 'identity_verified' | 'payment_verified' | 'all_validated') => {
    if (!notifConfig) return;
    const shouldNotify = 
      (type === 'identity_verified' && notifConfig.notify_on_identity_verified) ||
      (type === 'payment_verified' && notifConfig.notify_on_payment_verified) ||
      (type === 'all_validated' && notifConfig.notify_on_all_validated);
    if (!shouldNotify) return;
    try {
      await supabase.functions.invoke('send-order-notification', {
        body: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          customerPhone: order.customer.phone,
          notificationType: type,
        },
      });
    } catch (e) {
      console.error('Notification error:', e);
    }
  };

  // AI identity verification
  const handleAIVerify = async (order: Order) => {
    setVerifyingOrderId(order.id);
    setVerificationResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-customer-info', {
        body: {
          customerName: order.customer.name,
          customerEmail: order.customer.email,
          customerPhone: order.customer.phone,
          customerAddress: order.customer.address,
          customerCity: order.customer.city,
          customerZip: order.customer.zip,
          customerCountry: order.customer.country,
        },
      });
      if (error) throw error;
      setVerificationResult(data);
      setVerificationPopoverOpen(order.id);

      // Auto-validate if score >= 80
      if (data?.status === 'valid' || (data?.score && data.score >= 80)) {
        const currentFlags = getValidationFlags(order);
        if (!currentFlags.identity) {
          const newFlags = { ...currentFlags, identity: true };
          await supabase.from('orders').update({ validation_flags: newFlags }).eq('id', order.id);
          await sendNotificationIfNeeded(order, 'identity_verified');
          
          if (newFlags.payment && newFlags.shipping) {
            await sendNotificationIfNeeded(order, 'all_validated');
          }
          toast({ title: '✅ Identité vérifiée par IA', description: `Score: ${data.score}/100` });
        }
      }
    } catch (e: any) {
      toast({ title: 'Erreur vérification IA', description: e.message, variant: 'destructive' });
    } finally {
      setVerifyingOrderId(null);
    }
  };

  const handleQuickValidate = async (order: Order, flag: 'identity' | 'payment' | 'shipping', value?: string) => {
    const currentFlags = getValidationFlags(order);
    const newFlags = { ...currentFlags, [flag]: true };
    
    try {
      const updates: any = { id: order.id };
      
      if (flag === 'payment') {
        updates.paymentStatus = 'Paid';
      }
      if (flag === 'shipping' && value) {
        updates.trackingNumber = value;
        updates.status = 'Shipped';
      }
      
      await supabase.from('orders').update({ validation_flags: newFlags }).eq('id', order.id);
      
      if (Object.keys(updates).length > 1) {
        await updateOrder.mutateAsync(updates);
      }

      // Send step notification
      if (flag === 'identity') await sendNotificationIfNeeded(order, 'identity_verified');
      if (flag === 'payment') await sendNotificationIfNeeded(order, 'payment_verified');

      // Auto-complete if all 3 validated
      if (newFlags.identity && newFlags.payment && newFlags.shipping) {
        await updateOrder.mutateAsync({ id: order.id, status: 'Delivered' });
        await sendNotificationIfNeeded(order, 'all_validated');
        toast({ title: '✅ Commande validée complètement' });
      } else {
        const labels = { identity: 'Identité', payment: 'Paiement', shipping: 'Expédition' };
        toast({ title: `✓ ${labels[flag]} validé` });
      }
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };
  let filteredOrders = orders.filter(o => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!o.orderNumber.toLowerCase().includes(q) && !o.customer.name.toLowerCase().includes(q) && !o.customer.email.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
    return true;
  });

  // Sort
  filteredOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'total-desc') return b.total - a.total;
    if (sortBy === 'total-asc') return a.total - b.total;
    if (sortBy === 'status') return a.status.localeCompare(b.status);
    return 0;
  });

  const { selectedIds, toggle, toggleAll, clear, allSelected, someSelected, count, ids } = useBulkSelection(filteredOrders);

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${count} commande(s) ? Cette action est irréversible.`)) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast({ title: `${count} commande(s) supprimée(s)` });
      clear();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status, paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || '', shippingCarrier: order.shippingCarrier || '',
      trackingNumber: order.trackingNumber || '', notes: order.notes || '',
      customerName: order.customer.name, customerEmail: order.customer.email,
      customerPhone: order.customer.phone || '', customerAddress: order.customer.address,
      customerCity: order.customer.city, customerZip: order.customer.zip,
      customerCountry: order.customer.country, items: order.items.map(i => ({ ...i })),
    });
  };

  const recalcTotals = (items: OrderItem[]) => items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  const updateItem = (index: number, updates: Partial<OrderItem>) => {
    if (!editForm) return;
    const newItems = [...editForm.items];
    newItems[index] = { ...newItems[index], ...updates };
    setEditForm({ ...editForm, items: newItems });
  };

  const removeItem = (index: number) => {
    if (!editForm) return;
    setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!selectedOrder || !editForm) return;
    const subtotal = recalcTotals(editForm.items);
    const total = subtotal + selectedOrder.tax + selectedOrder.shippingCost;
    try {
      await updateOrder.mutateAsync({
        id: selectedOrder.id, status: editForm.status, paymentStatus: editForm.paymentStatus,
        paymentMethod: editForm.paymentMethod || undefined, shippingCarrier: editForm.shippingCarrier || undefined,
        trackingNumber: editForm.trackingNumber || undefined, notes: editForm.notes || undefined,
        customerName: editForm.customerName, customerEmail: editForm.customerEmail,
        customerPhone: editForm.customerPhone || undefined, customerAddress: editForm.customerAddress,
        customerCity: editForm.customerCity, customerZip: editForm.customerZip,
        customerCountry: editForm.customerCountry, items: editForm.items, subtotal, total,
      });
      toast({ title: 'Commande mise à jour' });
      setSelectedOrder(null);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleResendConfirmation = async () => {
    if (!selectedOrder) return;
    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-order-confirmation', {
        body: {
          orderNumber: selectedOrder.orderNumber,
          customerName: selectedOrder.customer.name,
          customerEmail: selectedOrder.customer.email,
          items: selectedOrder.items.map(i => ({ name: i.name, price: i.price || 0, quantity: i.quantity, size: i.size, color: i.color })),
          subtotal: selectedOrder.subtotal,
          shippingCost: selectedOrder.shippingCost,
          total: selectedOrder.total,
          deliveryMode: 'home',
          emailType: 'resend_confirmation',
        },
      });
      if (error) throw error;
      toast({ title: 'Email de confirmation renvoyé', description: `À ${selectedOrder.customer.email}` });
    } catch (err: any) {
      toast({ title: 'Erreur envoi email', description: err.message, variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  };

  const handleMarkAsPaid = async (order?: Order) => {
    const targetOrder = order || selectedOrder;
    if (!targetOrder) return;
    setIsMarkingPaid(true);
    try {
      await updateOrder.mutateAsync({ id: targetOrder.id, paymentStatus: 'Paid' });

      // Send payment confirmation email
      const { error } = await supabase.functions.invoke('send-order-confirmation', {
        body: {
          orderNumber: targetOrder.orderNumber,
          customerName: targetOrder.customer.name,
          customerEmail: targetOrder.customer.email,
          items: targetOrder.items.map(i => ({ name: i.name, price: i.price || 0, quantity: i.quantity, size: i.size, color: i.color })),
          subtotal: targetOrder.subtotal,
          shippingCost: targetOrder.shippingCost,
          total: targetOrder.total,
          deliveryMode: 'home',
          emailType: 'payment_confirmation',
        },
      });
      if (error) console.error('Payment email error:', error);
      
      toast({ title: '✅ Paiement marqué', description: `Email de confirmation envoyé à ${targetOrder.customer.email}` });
      if (editForm) {
        setEditForm({ ...editForm, paymentStatus: 'Paid' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleGenerateColissimoLabel = async () => {
    if (!selectedOrder) return;
    setIsGeneratingLabel(true);
    try {
      const { data, error } = await supabase.functions.invoke('colissimo-proxy', {
        body: {
          action: 'generateLabel',
          order: {
            orderNumber: selectedOrder.orderNumber,
            customer: {
              name: editForm?.customerName || selectedOrder.customer.name,
              email: editForm?.customerEmail || selectedOrder.customer.email,
              phone: editForm?.customerPhone || selectedOrder.customer.phone,
              address: editForm?.customerAddress || selectedOrder.customer.address,
              city: editForm?.customerCity || selectedOrder.customer.city,
              zip: editForm?.customerZip || selectedOrder.customer.zip,
            },
          },
        },
      });

      if (error) throw error;

      if (data?.trackingNumber && editForm) {
        setEditForm({ ...editForm, trackingNumber: data.trackingNumber, shippingCarrier: 'Colissimo' });
        await updateOrder.mutateAsync({
          id: selectedOrder.id,
          trackingNumber: data.trackingNumber,
          shippingCarrier: 'Colissimo',
        });
        toast({ title: 'Numéro de suivi enregistré', description: data.trackingNumber });
      }

      if (data?.pdfBase64) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `colissimo-${selectedOrder.orderNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Étiquette Colissimo téléchargée' });
      } else {
        toast({
          title: 'Étiquette générée',
          description: data?.trackingNumber ? `N° suivi: ${data.trackingNumber}` : 'Vérifiez vos identifiants Colissimo',
        });
      }
    } catch (err) {
      console.error('Colissimo label error:', err);
      toast({ title: 'Erreur génération étiquette', description: String(err), variant: 'destructive' });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const getStatusInfo = (status: OrderStatus) => STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold hud-text">COMMANDES</h1>
          <p className="text-muted-foreground text-xs lg:text-sm mt-1">{orders.length} commandes au total</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)} className="w-full sm:w-auto gap-2">
          <RefreshCw className="h-4 w-4" /> Sync WordPress
        </Button>
      </div>

      {/* Filters */}
      <div className="chamfer-hud bg-card/50 p-3 lg:p-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="N° commande, client..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous paiements</SelectItem>
              {PAYMENT_STATUS_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[150px]"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Récent → Ancien</SelectItem>
              <SelectItem value="date-asc">Ancien → Récent</SelectItem>
              <SelectItem value="total-desc">Total ↓</SelectItem>
              <SelectItem value="total-asc">Total ↑</SelectItem>
              <SelectItem value="status">Par statut</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <div className="chamfer-hud bg-primary/10 border border-primary/30 p-3 flex items-center gap-4">
          <span className="text-sm font-bold">{count} sélectionnée(s)</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
            <Trash2 className="h-3 w-3 mr-2" />Supprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={clear}>Désélectionner</Button>
        </div>
      )}

      <div className="chamfer-hud bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune commande</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-3 w-8"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                  <th className="text-left p-3 text-xs font-bold hud-text">COMMANDE</th>
                  <th className="text-left p-3 text-xs font-bold hud-text">CLIENT</th>
                  <th className="text-right p-3 text-xs font-bold hud-text">TOTAL</th>
                  <th className="text-left p-3 text-xs font-bold hud-text">STATUT</th>
                  <th className="text-center p-3 text-xs font-bold hud-text">VALIDATION</th>
                  <th className="text-right p-3 text-xs font-bold hud-text">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon;
                  const flags = getValidationFlags(order);
                  const allValid = flags.identity && flags.payment && flags.shipping;
                  return (
                    <tr key={order.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${selectedIds.has(order.id) ? 'bg-primary/5' : ''}`}>
                      <td className="p-3"><Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggle(order.id)} /></td>
                      <td className="p-3">
                        <code className="text-xs font-bold">{order.orderNumber}</code>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(order.date)}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-xs">{order.customer.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{order.customer.email}</p>
                      </td>
                      <td className="p-3 text-right"><span className="text-sm font-bold">{order.total.toFixed(2)}€</span></td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
                          <span className={`text-[10px] font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 justify-center">
                          <Popover open={verificationPopoverOpen === order.id} onOpenChange={(open) => { if (!open) setVerificationPopoverOpen(null); }}>
                            <PopoverTrigger asChild>
                              <button 
                                onClick={() => !flags.identity && handleAIVerify(order)} 
                                disabled={flags.identity || verifyingOrderId === order.id} 
                                className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-bold transition-all ${flags.identity ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/30'}`} 
                                title="Vérification IA"
                              >
                                {verifyingOrderId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                {flags.identity && <Check className="h-2.5 w-2.5" />}
                              </button>
                            </PopoverTrigger>
                            {verificationResult && verificationPopoverOpen === order.id && (
                              <PopoverContent className="w-72 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  {verificationResult.status === 'valid' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                  {verificationResult.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                  {verificationResult.status === 'invalid' && <XOctagon className="h-4 w-4 text-destructive" />}
                                  <span className="font-bold text-sm">Score: {verificationResult.score}/100</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{verificationResult.summary}</p>
                                {verificationResult.issues?.length > 0 && (
                                  <div className="space-y-1">
                                    {verificationResult.issues.map((issue: any, i: number) => (
                                      <div key={i} className={`text-[10px] p-1.5 rounded ${issue.severity === 'error' ? 'bg-destructive/10 text-destructive' : issue.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-muted text-muted-foreground'}`}>
                                        <strong>{issue.field}:</strong> {issue.message}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {verificationResult.status !== 'valid' && !flags.identity && (
                                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => { handleQuickValidate(order, 'identity'); setVerificationPopoverOpen(null); }}>
                                    Forcer la validation
                                  </Button>
                                )}
                              </PopoverContent>
                            )}
                          </Popover>
                          <button onClick={() => !flags.payment && handleQuickValidate(order, 'payment')} disabled={flags.payment} className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-bold transition-all ${flags.payment ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/30'}`} title="Paiement">
                            <DollarSign className="h-3 w-3" />{flags.payment && <Check className="h-2.5 w-2.5" />}
                          </button>
                          {trackingOrderId === order.id ? (
                            <div className="flex items-center gap-1">
                              <Input value={trackingInput} onChange={e => setTrackingInput(e.target.value)} placeholder="N° suivi" className="h-6 w-20 text-[10px] px-1" autoFocus onKeyDown={e => { if (e.key === 'Enter' && trackingInput) { handleQuickValidate(order, 'shipping', trackingInput); setTrackingOrderId(null); setTrackingInput(''); }}} />
                              <button onClick={() => { if (trackingInput) { handleQuickValidate(order, 'shipping', trackingInput); setTrackingOrderId(null); setTrackingInput(''); }}} className="p-1 bg-purple-500 text-white rounded"><Check className="h-2.5 w-2.5" /></button>
                            </div>
                          ) : (
                            <button onClick={() => { if (!flags.shipping) { setTrackingOrderId(order.id); setTrackingInput(order.trackingNumber || ''); }}} disabled={flags.shipping} className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-bold transition-all ${flags.shipping ? 'bg-purple-500 text-white' : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/30'}`} title="Expédition">
                              <Send className="h-3 w-3" />{flags.shipping && <Check className="h-2.5 w-2.5" />}
                            </button>
                          )}
                          {allValid && <span className="text-green-500 font-bold text-[10px]">✓</span>}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-0.5 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(order)} title="Voir"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPrintWindow(generateInvoiceHTML(order))} title="Facture"><FileText className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.location.href = `mailto:${order.customer.email}`} title="Email"><Mail className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hud-text flex items-center gap-3">
              COMMANDE {selectedOrder?.orderNumber}
              {selectedOrder && (
                <button
                  onClick={() => window.location.href = `mailto:${selectedOrder.customer.email}?subject=Commande ${selectedOrder.orderNumber}`}
                  className="text-sm font-normal text-primary hover:underline flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" /> Contacter
                </button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && editForm && (
            <div className="space-y-6">
              <div className="chamfer-hud bg-muted/30 p-4 space-y-3">
                <h3 className="text-sm font-bold hud-text flex items-center gap-2">CLIENT <span className="text-base">{getCountryFlag(editForm.customerCountry)}</span></h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={editForm.customerName} onChange={e => setEditForm({ ...editForm, customerName: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={editForm.customerEmail} onChange={e => setEditForm({ ...editForm, customerEmail: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Téléphone</Label><Input value={editForm.customerPhone} onChange={e => setEditForm({ ...editForm, customerPhone: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Pays</Label><Input value={editForm.customerCountry} onChange={e => setEditForm({ ...editForm, customerCountry: e.target.value })} /></div>
                  <div className="space-y-1 col-span-2"><Label className="text-xs">Adresse</Label><Input value={editForm.customerAddress} onChange={e => setEditForm({ ...editForm, customerAddress: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Code postal</Label><Input value={editForm.customerZip} onChange={e => setEditForm({ ...editForm, customerZip: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Ville</Label><Input value={editForm.customerCity} onChange={e => setEditForm({ ...editForm, customerCity: e.target.value })} /></div>
                </div>
              </div>

              <div className="chamfer-hud bg-muted/30 p-4 space-y-3">
                <h3 className="text-sm font-bold hud-text">ARTICLES</h3>
                <div className="space-y-2">
                  {editForm.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-2 border-b border-border last:border-0">
                      <span className="flex-1 truncate">{item.name || item.productId}</span>
                      <div className="flex items-center gap-1"><Label className="text-xs">Qté</Label><Input type="number" value={item.quantity} onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })} className="w-16 h-8" min={1} /></div>
                      <div className="flex items-center gap-1"><Label className="text-xs">Prix</Label><Input type="number" value={item.price} onChange={(e) => updateItem(i, { price: Number(e.target.value) })} className="w-20 h-8" min={0} step={0.01} /></div>
                      <span className="font-bold w-20 text-right">{((item.price || 0) * item.quantity).toFixed(2)}€</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <div className="pt-2 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Sous-total</span><span>{recalcTotals(editForm.items).toFixed(2)}€</span></div>
                    <div className="flex justify-between"><span>TVA</span><span>{selectedOrder.tax.toFixed(2)}€</span></div>
                    <div className="flex justify-between"><span>Livraison</span><span>{selectedOrder.shippingCost.toFixed(2)}€</span></div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span>{(recalcTotals(editForm.items) + selectedOrder.tax + selectedOrder.shippingCost).toFixed(2)}€</span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="hud-text text-xs">Statut commande</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as OrderStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}><div className="flex items-center gap-2"><o.icon className={`h-3 w-3 ${o.color}`} />{o.label}</div></SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label className="hud-text text-xs">Statut paiement</Label>
                  <Select value={editForm.paymentStatus} onValueChange={(v) => setEditForm({ ...editForm, paymentStatus: v as PaymentStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label className="hud-text text-xs">Mode de paiement</Label>
                  <Select value={editForm.paymentMethod || 'none'} onValueChange={(v) => setEditForm({ ...editForm, paymentMethod: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Non spécifié</SelectItem>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label className="hud-text text-xs">Transporteur</Label>
                  <Select value={editForm.shippingCarrier || 'none'} onValueChange={(v) => setEditForm({ ...editForm, shippingCarrier: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Non spécifié</SelectItem>{CARRIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2"><Label className="hud-text text-xs">Numéro de suivi</Label>
                <div className="flex gap-2">
                  <Input value={editForm.trackingNumber} onChange={e => setEditForm({ ...editForm, trackingNumber: e.target.value })} placeholder="Ex: 6A12345678901" className="flex-1" />
                  {editForm.trackingNumber && (editForm.shippingCarrier === 'Colissimo' || editForm.shippingCarrier === 'Chronopost') && (
                    <Button variant="outline" size="sm" asChild><a href={getColissimoUrl(editForm.trackingNumber)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Suivre</a></Button>
                  )}
                </div>
              </div>

              <div className="space-y-2"><Label className="hud-text text-xs">Notes</Label><Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} placeholder="Notes internes..." /></div>

              <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => selectedOrder && openPrintWindow(generateDeliverySlipHTML(selectedOrder))}><FileDown className="h-4 w-4 mr-1" />Bon de livraison</Button>
                <Button variant="outline" size="sm" onClick={() => selectedOrder && openPrintWindow(generateShippingLabelHTML(selectedOrder))}><Tag className="h-4 w-4 mr-1" />Étiquette aller</Button>
                <Button variant="outline" size="sm" onClick={() => selectedOrder && openPrintWindow(generateShippingLabelHTML(selectedOrder, true))}><Tag className="h-4 w-4 mr-1" />Étiquette retour</Button>
                <Button variant="outline" size="sm" onClick={() => selectedOrder && openPrintWindow(generateInvoiceHTML(selectedOrder))}><Printer className="h-4 w-4 mr-1" />Facture</Button>
                {/* Resend confirmation */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                  className="border-blue-500/40 text-blue-500 hover:bg-blue-500/10"
                >
                  {isResending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Envoi...</> : <><RefreshCw className="h-4 w-4 mr-1" />Renvoyer confirmation</>}
                </Button>
                {/* Mark as paid */}
                {editForm.paymentStatus !== 'Paid' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkAsPaid()}
                    disabled={isMarkingPaid}
                    className="border-green-500/40 text-green-500 hover:bg-green-500/10"
                  >
                    {isMarkingPaid ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Traitement...</> : <><CheckSquare className="h-4 w-4 mr-1" />Marquer comme payé</>}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateColissimoLabel}
                  disabled={isGeneratingLabel}
                  className="border-primary/40 text-primary hover:bg-primary/10"
                >
                  {isGeneratingLabel ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Génération...</>
                  ) : (
                    <><Truck className="h-4 w-4 mr-1" />Étiquette Colissimo</>
                  )}
                </Button>
                <Button onClick={handleSave} disabled={updateOrder.isPending}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <WordPressSyncDialog open={syncOpen} onOpenChange={setSyncOpen} syncType="orders" />
    </div>
  );
}
