import { useState } from 'react';
import { useOrders, useUpdateOrder } from '@/hooks/useOrders';
import { Order, OrderStatus, PaymentStatus, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, Clock, Truck, CheckCircle, XCircle, Eye, FileText, Save, X, Printer
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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

function generateInvoiceHTML(order: Order): string {
  const itemsRows = order.items.map((item: OrderItem) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.name || item.productId}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${(item.price || 0).toFixed(2)}€</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${((item.price || 0) * item.quantity).toFixed(2)}€</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facture ${order.orderNumber}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin:20px 0}.header{display:flex;justify-content:space-between;margin-bottom:40px}.total-section{text-align:right;margin-top:20px}@media print{body{padding:20px}}</style></head><body>
<div class="header"><div><h1>FACTURE</h1><p><strong>${order.orderNumber}</strong></p><p>Date: ${new Date(order.date).toLocaleDateString('fr-FR')}</p></div><div style="text-align:right"><h2>LVTK6</h2><p>Concept Store</p></div></div>
<div style="margin-bottom:30px"><h3>Client</h3><p>${order.customer.name}<br>${order.customer.email}<br>${order.customer.address}<br>${order.customer.zip} ${order.customer.city}<br>${order.customer.country}</p>${order.customer.phone ? `<p>Tél: ${order.customer.phone}</p>` : ''}</div>
<table><thead><tr><th style="padding:8px;border-bottom:2px solid #333;text-align:left">Article</th><th style="padding:8px;border-bottom:2px solid #333;text-align:center">Qté</th><th style="padding:8px;border-bottom:2px solid #333;text-align:right">Prix unit.</th><th style="padding:8px;border-bottom:2px solid #333;text-align:right">Total</th></tr></thead><tbody>${itemsRows}</tbody></table>
<div class="total-section"><p>Sous-total: ${order.subtotal.toFixed(2)}€</p><p>TVA: ${order.tax.toFixed(2)}€</p><p>Livraison: ${order.shippingCost.toFixed(2)}€</p><p style="font-size:18px;font-weight:bold;margin-top:10px">Total: ${order.total.toFixed(2)}€</p></div>
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">Facture générée automatiquement - LVTK6 Concept Store</div>
</body></html>`;
}

function downloadInvoice(order: Order) {
  const html = generateInvoiceHTML(order);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.print();
    };
  }
}

export default function AdminOrders() {
  const { toast } = useToast();
  const { data: orders = [], isLoading } = useOrders();
  const updateOrder = useUpdateOrder();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState<{
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    shippingCarrier: string;
    trackingNumber: string;
    notes: string;
  } | null>(null);

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || '',
      shippingCarrier: order.shippingCarrier || '',
      trackingNumber: order.trackingNumber || '',
      notes: order.notes || '',
    });
  };

  const handleSave = async () => {
    if (!selectedOrder || !editForm) return;
    try {
      await updateOrder.mutateAsync({
        id: selectedOrder.id,
        status: editForm.status,
        paymentStatus: editForm.paymentStatus,
        paymentMethod: editForm.paymentMethod || undefined,
        shippingCarrier: editForm.shippingCarrier || undefined,
        trackingNumber: editForm.trackingNumber || undefined,
        notes: editForm.notes || undefined,
      });
      toast({ title: 'Commande mise à jour' });
      setSelectedOrder(null);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const getStatusStyle = (status: OrderStatus) => {
    return STATUS_OPTIONS.find(o => o.value === status)?.color || 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold hud-text">COMMANDES</h1>
        <p className="text-muted-foreground mt-1">{orders.length} commandes au total</p>
      </div>

      <div className="chamfer-hud bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune commande</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-xs font-bold hud-text">N° COMMANDE</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">CLIENT</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">DATE</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">TOTAL</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">STATUT</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">PAIEMENT</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <code className="text-sm font-bold">{order.orderNumber}</code>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-sm">{order.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(order.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold">{order.total.toFixed(2)}€</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold ${getStatusStyle(order.status)}`}>
                        {STATUS_OPTIONS.find(o => o.value === order.status)?.label || order.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold ${
                        order.paymentStatus === 'Paid' ? 'text-green-500' : 
                        order.paymentStatus === 'Failed' ? 'text-destructive' : 'text-yellow-500'
                      }`}>
                        {PAYMENT_STATUS_OPTIONS.find(o => o.value === order.paymentStatus)?.label || order.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => downloadInvoice(order)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hud-text">COMMANDE {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && editForm && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="chamfer-hud bg-muted/30 p-4 space-y-2">
                <h3 className="text-sm font-bold hud-text">CLIENT</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">{selectedOrder.customer.name}</p>
                    <p className="text-muted-foreground">{selectedOrder.customer.email}</p>
                    {selectedOrder.customer.phone && <p className="text-muted-foreground">{selectedOrder.customer.phone}</p>}
                  </div>
                  <div>
                    <p>{selectedOrder.customer.address}</p>
                    <p>{selectedOrder.customer.zip} {selectedOrder.customer.city}</p>
                    <p>{selectedOrder.customer.country}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="chamfer-hud bg-muted/30 p-4 space-y-2">
                <h3 className="text-sm font-bold hud-text">ARTICLES</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                      <span>{item.name || item.productId} × {item.quantity}</span>
                      <span className="font-bold">{((item.price || 0) * item.quantity).toFixed(2)}€</span>
                    </div>
                  ))}
                  <div className="pt-2 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Sous-total</span><span>{selectedOrder.subtotal.toFixed(2)}€</span></div>
                    <div className="flex justify-between"><span>TVA</span><span>{selectedOrder.tax.toFixed(2)}€</span></div>
                    <div className="flex justify-between"><span>Livraison</span><span>{selectedOrder.shippingCost.toFixed(2)}€</span></div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span>{selectedOrder.total.toFixed(2)}€</span></div>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Statut commande</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm(p => p ? { ...p, status: v as OrderStatus } : p)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>
                          <div className="flex items-center gap-2"><o.icon className={`h-3 w-3 ${o.color}`} />{o.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Statut paiement</Label>
                  <Select value={editForm.paymentStatus} onValueChange={(v) => setEditForm(p => p ? { ...p, paymentStatus: v as PaymentStatus } : p)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Mode de paiement</Label>
                  <Select value={editForm.paymentMethod || 'none'} onValueChange={(v) => setEditForm(p => p ? { ...p, paymentMethod: v === 'none' ? '' : v } : p)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non spécifié</SelectItem>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Transporteur</Label>
                  <Select value={editForm.shippingCarrier || 'none'} onValueChange={(v) => setEditForm(p => p ? { ...p, shippingCarrier: v === 'none' ? '' : v } : p)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non spécifié</SelectItem>
                      {CARRIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Numéro de suivi</Label>
                <Input value={editForm.trackingNumber} onChange={e => setEditForm(p => p ? { ...p, trackingNumber: e.target.value } : p)} placeholder="Ex: 6A12345678901" />
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Notes</Label>
                <Textarea value={editForm.notes} onChange={e => setEditForm(p => p ? { ...p, notes: e.target.value } : p)} rows={3} placeholder="Notes internes..." />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <Button variant="outline" onClick={() => selectedOrder && downloadInvoice(selectedOrder)}>
                  <Printer className="h-4 w-4 mr-2" />Facture
                </Button>
                <Button onClick={handleSave} disabled={updateOrder.isPending}>
                  <Save className="h-4 w-4 mr-2" />Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
