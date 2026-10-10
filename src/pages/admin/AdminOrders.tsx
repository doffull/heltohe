import { useEffect, useRef, useState } from 'react';
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
import { normalizeInvoiceBrand } from '@/lib/invoiceSettings';
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
import { OrderHistoryPanel } from '@/components/admin/OrderHistoryPanel';
import { SendEmailDialog, type SendEmailTarget } from '@/components/admin/SendEmailDialog';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';
import { countryFlag, normalizeCountryCode } from '@/lib/colissimo-countries';
import { CountryCombobox } from '@/components/checkout/CountryCombobox';


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

/** Default only for French addresses without an explicitly selected carrier. */
const suggestedCarrier = (country: string | null | undefined, carrier: string | null | undefined) =>
  carrier?.trim() || (normalizeCountryCode(country || '') === 'FR' ? 'Colissimo' : '');

/**
 * Moyens de paiement — les `value` sont EXACTEMENT ce que la base contient.
 *
 * ⚠️ Cette liste portait auparavant des libellés (« Carte bancaire », « PayPal »…)
 * qui ne correspondaient à aucune valeur écrite : la RPC insère `manual`, les edge
 * functions `paypal` / `payplug`, l'écran de test `test`. Radix ne trouvant aucun
 * `SelectItem` correspondant, le champ restait vide sur toutes les commandes.
 *
 * ⚠️ Ne pas « corriger » ces valeurs en libellés : elles sont réécrites telles
 * quelles par `handleSave`, et `payment_method` n'est PAS normalisé par le trigger
 * `normalize_order_statuses` (contrairement à `status` et `payment_status`).
 */
const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'manual', label: 'Virement / manuel' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'payplug', label: 'PayPlug (carte bancaire)' },
  { value: 'test', label: 'Test' },
];

/**
 * Options du sélecteur, complétées par la valeur courante si elle est inconnue.
 *
 * Les commandes importées de WooCommerce portent le libellé brut de la boutique
 * d'origine (`payment_method_title`), qui n'a pas de liste fixe. Sans ce repli,
 * elles retomberaient dans le bug qu'on vient de corriger.
 */
function paymentMethodOptions(current?: string) {
  if (!current || PAYMENT_METHODS.some(m => m.value === current)) return PAYMENT_METHODS;
  return [...PAYMENT_METHODS, { value: current, label: current }];
}

const COUNTRY_FLAGS: Record<string, string> = {
  'France': '🇫🇷', 'Belgique': '🇧🇪', 'Suisse': '🇨🇭', 'Canada': '🇨🇦',
  'Allemagne': '🇩🇪', 'Espagne': '🇪🇸', 'Italie': '🇮🇹', 'Portugal': '🇵🇹',
  'Royaume-Uni': '🇬🇧', 'États-Unis': '🇺🇸', 'Pays-Bas': '🇳🇱', 'Luxembourg': '🇱🇺',
};

/**
 * Drapeau du pays, accepté sous ses deux écritures : le code ISO enregistré
 * depuis le 14/09/2026, et les libellés en toutes lettres de l'historique.
 */
function getCountryFlag(country: string) {
  if (COUNTRY_FLAGS[country]) return COUNTRY_FLAGS[country];
  return countryFlag(normalizeCountryCode(country));
}

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
  const itemsRows = order.items.map((item: OrderItem) => `<tr><td style="padding:6px;border-bottom:1px solid #eee;width:56px;">${item.image ? `<img src="${item.image}" alt="" style="width:46px;height:46px;object-fit:cover;border:1px solid #eee;display:block" />` : ''}</td><td style="padding:6px;border-bottom:1px solid #eee;">${item.name || item.productId}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:6px;border-bottom:1px solid #eee;">${item.size || '-'}</td><td style="padding:6px;border-bottom:1px solid #eee;">${item.color || '-'}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right;">${(item.price || 0).toFixed(2)}€</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bon de livraison ${order.orderNumber}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#333;font-size:13px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin:15px 0}.header{display:flex;justify-content:space-between;margin-bottom:30px}@media print{body{padding:15px}}</style></head><body><div class="header"><div><h1>BON DE LIVRAISON</h1><p><strong>${order.orderNumber}</strong></p><p>Date: ${new Date(order.date).toLocaleDateString('fr-FR')}</p></div><div style="text-align:right"><h2>HELVETICA-MP</h2></div></div><div style="margin-bottom:20px"><h3>Destinataire</h3><p><strong>${order.customer.name}</strong><br>${order.customer.address}<br>${order.customer.zip} ${order.customer.city}<br>${order.customer.country}</p>${order.customer.phone ? `<p>Tél: ${order.customer.phone}</p>` : ''}</div><table><thead><tr><th style="padding:6px;border-bottom:2px solid #333;text-align:left">Photo</th><th style="padding:6px;border-bottom:2px solid #333;text-align:left">Article</th><th style="padding:6px;border-bottom:2px solid #333;text-align:center">Qté</th><th style="padding:6px;border-bottom:2px solid #333;text-align:left">Taille</th><th style="padding:6px;border-bottom:2px solid #333;text-align:left">Couleur</th><th style="padding:6px;border-bottom:2px solid #333;text-align:right">Prix</th></tr></thead><tbody>${itemsRows}</tbody></table><div style="margin-top:30px;padding:15px;border:1px solid #333"><p><strong>Nombre total d'articles:</strong> ${order.items.reduce((s, i) => s + i.quantity, 0)}</p>${order.trackingNumber ? `<p><strong>N° Suivi:</strong> ${order.trackingNumber}</p>` : ''}${order.shippingCarrier ? `<p><strong>Transporteur:</strong> ${order.shippingCarrier}</p>` : ''}</div><div style="margin-top:30px;font-size:11px;color:#999;text-align:center">Bon de livraison généré automatiquement - HELVETICA-MP</div></body></html>`;
}

function generateShippingLabelHTML(order: Order, isReturn = false): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Étiquette ${isReturn ? 'retour' : 'aller'} ${order.orderNumber}</title><style>body{font-family:Arial,sans-serif;padding:20px}.label{border:3px solid #000;padding:25px;max-width:400px;margin:auto}.from,.to{margin-bottom:15px}h3{margin:0 0 5px;text-transform:uppercase;font-size:11px;letter-spacing:2px;color:#666}p{margin:3px 0;font-size:14px}.barcode{text-align:center;margin:15px 0;font-family:monospace;font-size:18px;letter-spacing:4px}@media print{body{padding:0}}</style></head><body><div class="label"><div class="from"><h3>${isReturn ? 'Destinataire (retour)' : 'Expéditeur'}</h3><p><strong>HELVETICA-MP</strong></p><p>Paris, France</p></div><hr/><div class="to"><h3>${isReturn ? 'Expéditeur (client)' : 'Destinataire'}</h3><p><strong>${order.customer.name}</strong></p><p>${order.customer.address}</p><p>${order.customer.zip} ${order.customer.city}</p><p>${order.customer.country}</p>${order.customer.phone ? `<p>Tél: ${order.customer.phone}</p>` : ''}</div><hr/><div class="barcode">${order.trackingNumber || order.orderNumber}</div><p style="text-align:center;font-size:11px;color:#666">${order.orderNumber} · ${order.shippingCarrier || 'Standard'}</p></div></body></html>`;
}

function generateInvoiceHTML(order: Order, brandRaw?: unknown): string {
  const brand = normalizeInvoiceBrand(brandRaw);
  const itemsRows = order.items.map((item: OrderItem) => {
    const variant = [item.color ? `Couleur: ${item.color}` : '', item.size ? `Taille: ${item.size}` : ''].filter(Boolean).join(' · ');
    const img = item.image
      ? `<img src="${item.image}" alt="${item.name || ''}" style="width:54px;height:54px;object-fit:cover;border:1px solid #eee;border-radius:2px;display:block" />`
      : `<div style="width:54px;height:54px;border:1px solid #eee;border-radius:2px"></div>`;
    return `<tr><td style="padding:8px;border-bottom:1px solid #eee;width:64px;">${img}</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${item.name || item.productId}</strong>${variant ? `<br><span style="font-size:11px;color:#777">${variant}</span>` : ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${(item.price || 0).toFixed(2)}€</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${((item.price || 0) * item.quantity).toFixed(2)}€</td></tr>`;
  }).join('');
  const seller = [
    brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${brand.companyName}" style="max-height:52px;margin-bottom:6px" />` : '',
    `<h2 style="margin:0">${brand.companyName}</h2>`,
    brand.tagline ? `<p style="margin:2px 0">${brand.tagline}</p>` : '',
    brand.addressLines ? `<p style="margin:2px 0;font-size:12px;color:#666">${brand.addressLines.replace(/\n/g, '<br>')}</p>` : '',
    brand.siret ? `<p style="margin:2px 0;font-size:11px;color:#888">SIRET : ${brand.siret}</p>` : '',
    brand.vatNumber ? `<p style="margin:2px 0;font-size:11px;color:#888">TVA : ${brand.vatNumber}</p>` : '',
  ].join('');
  // Numéro FA- attribué au paiement (§32). Les commandes payées avant le
  // 25/09/2026 n'en ont pas : leur facture garde le numéro de commande.
  const invoiceRef = order.invoiceNumber || order.orderNumber;
  const invoiceDate = order.invoicedAt || order.date;
  const promoLabel = order.promoCode ? `Remise (code ${order.promoCode.replace(/[&<>"]/g, "")})` : "Remise promotionnelle";
  const promoLine = order.discountAmount && order.discountAmount > 0 ? `<p style="color:#047857"><strong>${promoLabel} : -${order.discountAmount.toFixed(2)}€</strong></p>` : "";
  const shippingLabel = order.shippingCost === 0 ? "Livraison offerte" : "Livraison";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facture ${invoiceRef}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin:20px 0}.header{display:flex;justify-content:space-between;margin-bottom:40px}.total-section{text-align:right;margin-top:20px}@media print{body{padding:20px}}</style></head><body><div class="header"><div><h1>FACTURE</h1><p><strong>${invoiceRef}</strong></p>${order.invoiceNumber ? `<p>Commande : ${order.orderNumber}</p>` : ''}<p>Date: ${new Date(invoiceDate).toLocaleDateString('fr-FR')}</p></div><div style="text-align:right">${seller}</div></div><div style="margin-bottom:30px"><h3>Client</h3><p>${order.customer.name}<br>${order.customer.email}<br>${order.customer.address}<br>${order.customer.zip} ${order.customer.city}<br>${order.customer.country}</p>${order.customer.phone ? `<p>Tél: ${order.customer.phone}</p>` : ''}</div><table><thead><tr><th style="padding:8px;border-bottom:2px solid #333;text-align:left">Photo</th><th style="padding:8px;border-bottom:2px solid #333;text-align:left">Article</th><th style="padding:8px;border-bottom:2px solid #333;text-align:center">Qté</th><th style="padding:8px;border-bottom:2px solid #333;text-align:right">Prix unit.</th><th style="padding:8px;border-bottom:2px solid #333;text-align:right">Total</th></tr></thead><tbody>${itemsRows}</tbody></table><div class="total-section"><p>Sous-total: ${order.subtotal.toFixed(2)}€</p>${brand.showVat ? `<p>dont TVA: ${order.tax.toFixed(2)}€</p>` : ''}${promoLine}<p>${shippingLabel}: ${order.shippingCost.toFixed(2)}€</p><p style="font-size:18px;font-weight:bold;margin-top:10px">Total: ${order.total.toFixed(2)}€</p></div><div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">${brand.footerNote}</div></body></html>`;
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
  // Les commandes dont le paiement n'a jamais abouti sont masquées par défaut.
  const [scope, setScope] = useState<'paid' | 'abandoned'>('paid');
  const { data: orders = [], isLoading } = useOrders(scope);
  const { data: designSettings } = useDesignSettings();

  // Pas de facture sans paiement : le numéro FA- n'existe qu'une fois payée (§32).
  const printInvoice = (order: Order) => {
    if (order.paymentStatus !== 'Paid') {
      toast({ title: 'Facture indisponible', description: 'La facture est émise au paiement de la commande.', variant: 'destructive' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    openPrintWindow(generateInvoiceHTML(order, (designSettings as any)?.invoiceBrand));
  };
  const updateOrder = useUpdateOrder();
  const bulkDelete = useBulkDeleteOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [mailTargets, setMailTargets] = useState<SendEmailTarget[] | null>(null);
  const [bulkTrackingOpen, setBulkTrackingOpen] = useState(false);
  const [bulkTrackingText, setBulkTrackingText] = useState('');

  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? '',
  );

  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [labelOrderId, setLabelOrderId] = useState<string | null>(null);

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
      if (error) throw new Error(await edgeErrorMessage(error));
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
      if (flag === 'payment') {
        await sendNotificationIfNeeded(order, 'payment_verified');
        // Reserve stock + notify stock manager
        try {
          const { data: rData } = await supabase.rpc('reserve_order_stock', { p_order_id: order.id });
          if (rData && !(rData as any).error) {
            // ── Notification « 📦 Nouvelle commande à préparer » — DÉSACTIVÉE
            //    le 15/09/2026. Décision client : seule « 🛍️ Nouvelle commande »
            //    (au paiement) subsiste. La réservation de stock, elle, continue
            //    de s'appliquer — c'est uniquement l'e-mail qui est suspendu.
            //
            // await supabase.functions.invoke('send-order-notification', {
            //   body: {
            //     orderId: order.id, orderNumber: order.orderNumber,
            //     customerName: order.customer.name, customerEmail: order.customer.email,
            //     customerPhone: order.customer.phone,
            //     notificationType: 'stock_reservation_created',
            //   },
            // });
            toast({ title: '📦 Stock réservé' });
          }
        } catch (e) { console.error('Stock reservation failed:', e); }
      }
      if (flag === 'shipping') {
        try { await supabase.rpc('consume_order_stock', { p_order_id: order.id }); } catch (e) { console.error(e); }
      }

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
      if (!o.orderNumber.toLowerCase().includes(q) && !(o.invoiceNumber || '').toLowerCase().includes(q) && !o.customer.name.toLowerCase().includes(q) && !o.customer.email.toLowerCase().includes(q)) return false;
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

  const handleBulkAIVerify = async () => {
    const selected = filteredOrders.filter(o => selectedIds.has(o.id));
    setBulkProcessing('identity');
    let ok = 0, fail = 0;
    for (const order of selected) {
      try {
        const { data, error } = await supabase.functions.invoke('verify-customer-info', {
          body: {
            customerName: order.customer.name, customerEmail: order.customer.email,
            customerPhone: order.customer.phone, customerAddress: order.customer.address,
            customerCity: order.customer.city, customerZip: order.customer.zip,
            customerCountry: order.customer.country,
          },
        });
        if (error) { fail++; continue; }
        if (data?.status === 'valid' || (data?.score && data.score >= 80)) {
          const flags = getValidationFlags(order);
          if (!flags.identity) {
            const newFlags = { ...flags, identity: true };
            await supabase.from('orders').update({ validation_flags: newFlags }).eq('id', order.id);
            await sendNotificationIfNeeded(order, 'identity_verified');
            if (newFlags.payment && newFlags.shipping) {
              await updateOrder.mutateAsync({ id: order.id, status: 'Delivered' });
              await sendNotificationIfNeeded(order, 'all_validated');
            }
          }
          ok++;
        } else { fail++; }
      } catch { fail++; }
    }
    setBulkProcessing(null);
    toast({ title: `Vérification IA : ${ok} validée(s), ${fail} échouée(s)` });
    clear();
  };

  const handleBulkValidatePayment = async () => {
    const selected = filteredOrders.filter(o => selectedIds.has(o.id));
    setBulkProcessing('payment');
    let ok = 0;
    for (const order of selected) {
      try {
        const flags = getValidationFlags(order);
        if (!flags.payment) {
          const newFlags = { ...flags, payment: true };
          await supabase.from('orders').update({ validation_flags: newFlags, payment_status: 'Paid' }).eq('id', order.id);
          await sendNotificationIfNeeded(order, 'payment_verified');
          try {
            const { data: rData } = await supabase.rpc('reserve_order_stock', { p_order_id: order.id });
            if (rData && !(rData as any).error) {
              // Notification « 📦 Nouvelle commande à préparer » — DÉSACTIVÉE le
              // 15/09/2026, même décision que ci-dessus.
              //
              // await supabase.functions.invoke('send-order-notification', {
              //   body: {
              //     orderId: order.id, orderNumber: order.orderNumber,
              //     customerName: order.customer.name, customerEmail: order.customer.email,
              //     customerPhone: order.customer.phone,
              //     notificationType: 'stock_reservation_created',
              //   },
              // });
            }
          } catch (e) { console.error(e); }
          if (newFlags.identity && newFlags.shipping) {
            await updateOrder.mutateAsync({ id: order.id, status: 'Delivered' });
            await sendNotificationIfNeeded(order, 'all_validated');
          }
        }
        ok++;
      } catch {}
    }
    setBulkProcessing(null);
    toast({ title: `${ok} paiement(s) validé(s)` });
    clear();
  };

  const handleBulkValidateShipping = async () => {
    const selected = filteredOrders.filter(o => selectedIds.has(o.id));
    setBulkProcessing('shipping');
    let ok = 0;
    for (const order of selected) {
      try {
        const flags = getValidationFlags(order);
        if (!flags.shipping) {
          const newFlags = { ...flags, shipping: true };
          await supabase.from('orders').update({ validation_flags: newFlags, status: 'Shipped' }).eq('id', order.id);
          if (newFlags.identity && newFlags.payment) {
            await updateOrder.mutateAsync({ id: order.id, status: 'Delivered' });
            await sendNotificationIfNeeded(order, 'all_validated');
          }
        }
        ok++;
      } catch {}
    }
    setBulkProcessing(null);
    toast({ title: `${ok} expédition(s) validée(s)` });
    clear();
  };

  /** Génère les étiquettes Colissimo de toutes les commandes sélectionnées. */
  const handleBulkLabels = async () => {
    const selected = filteredOrders.filter(o => selectedIds.has(o.id));
    setBulkProcessing('labels');
    let ok = 0, fail = 0;
    for (const order of selected) {
      if (order.trackingNumber) continue;
      try {
        await generateLabelForOrder(order);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkProcessing(null);
    toast({ title: `Étiquettes : ${ok} générée(s)`, description: fail ? `${fail} échec(s).` : undefined });
    clear();
  };

  /** Saisie/import en masse des numéros de suivi (une ligne « N°commande;suivi »). */
  const handleBulkTracking = async () => {
    const map = new Map<string, string>();
    bulkTrackingText.split(/\r?\n/).forEach(line => {
      const [num, track] = line.split(/[;,\t]/).map(s => (s || '').trim());
      if (num && track) map.set(num.toUpperCase(), track);
    });
    if (map.size === 0) {
      toast({ title: 'Aucune ligne valide', description: 'Format attendu : N°commande;numéro de suivi', variant: 'destructive' });
      return;
    }
    setBulkProcessing('tracking');
    let ok = 0;
    for (const order of orders) {
      const track = map.get(order.orderNumber.toUpperCase());
      if (!track) continue;
      try {
        await updateOrder.mutateAsync({
          id: order.id,
          trackingNumber: track,
          shippingCarrier: order.shippingCarrier || 'Colissimo',
          status: 'Shipped',
        });
        ok++;
      } catch { /* ligne ignorée */ }
    }
    setBulkProcessing(null);
    setBulkTrackingOpen(false);
    setBulkTrackingText('');
    toast({ title: `${ok} suivi(s) enregistré(s)`, description: "E-mails d'expédition envoyés." });
  };

  /** Actualise le statut de suivi des commandes sélectionnées. */
  const handleBulkRefreshTracking = async () => {
    const selected = filteredOrders.filter(o => selectedIds.has(o.id) && o.trackingNumber);
    setBulkProcessing('refresh');
    let ok = 0;
    for (const order of selected) {
      const { error } = await supabase.functions.invoke('poll-carrier-tracking', {
        body: { order_id: order.id },
      });
      if (!error) ok++;
    }
    setBulkProcessing(null);
    toast({ title: `Suivi actualisé pour ${ok} commande(s)` });
  };

  /** Ouvre la fenêtre d'e-mail pour tous les clients sélectionnés. */
  /** Supprime les paniers abandonnés de plus de 24 h. */
  const handlePurgeAbandoned = async () => {
    setBulkProcessing('purge');
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { error, count } = await supabase
      .from('orders')
      .delete({ count: 'exact' })
      .neq('payment_status', 'Paid')
      .lt('created_at', cutoff);
    setBulkProcessing(null);
    if (error) {
      toast({ title: 'Purge impossible', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${count ?? 0} panier(s) abandonné(s) supprimé(s)` });
    clear();
  };

  const openBulkEmail = () => {

    const selected = filteredOrders.filter(o => selectedIds.has(o.id));
    setMailTargets(
      selected.map(o => ({
        email: o.customer.email,
        firstName: o.customer.name?.split(' ')[0],
        orderNumber: o.orderNumber,
        total: o.total.toFixed(2),
        trackingNumber: o.trackingNumber,
        orderId: o.id,
      })),
    );
  };



  // Ouverture directe d'une fiche depuis un lien (`/admin/commandes?order=<id>`,
  // ex. depuis /admin/colissimo). Une commande non payée n'est pas dans la vue
  // « payées » par défaut : on bascule alors une fois sur les paniers abandonnés.
  const deepLinkId = useRef<string | null>(new URLSearchParams(window.location.search).get('order'));
  const deepLinkTriedAbandoned = useRef(false);
  useEffect(() => {
    const id = deepLinkId.current;
    if (!id || isLoading) return;
    const target = orders.find((o: Order) => o.id === id);
    if (target) {
      deepLinkId.current = null;
      openDetail(target);
      return;
    }
    if (scope === 'paid' && !deepLinkTriedAbandoned.current) {
      deepLinkTriedAbandoned.current = true;
      setScope('abandoned');
      return;
    }
    deepLinkId.current = null;
    toast({ title: 'Commande introuvable', description: 'Elle a peut-être été supprimée.', variant: 'destructive' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, isLoading, scope]);

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status, paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || '', shippingCarrier: suggestedCarrier(order.customer.country, order.shippingCarrier),
      trackingNumber: order.trackingNumber || '', notes: order.notes || '',
      customerName: order.customer.name, customerEmail: order.customer.email,
      customerPhone: order.customer.phone || '', customerAddress: order.customer.address,
      customerCity: order.customer.city, customerZip: order.customer.zip,
      customerCountry: order.customer.country, items: order.items.map(i => ({ ...i })),
    });
  };

  const recalcTotals = (items: OrderItem[]) => items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  // ⚠️ Les prix sont TTC : `tax` est la TVA INCLUSE (total × 0,2 / 1,2), calculée
  // comme dans `validate_and_create_order`. Jusqu'au 28/09/2026 on écrivait
  // `total = subtotal + tax + port` : chaque enregistrement depuis cette fiche
  // ajoutait la TVA une seconde fois (109 € → 127,17 €) et effaçait au passage
  // la remise d'un code promo. On garde désormais la remise d'origine
  // (somme des articles d'origine − sous-total enregistré) et on recalcule la
  // TVA incluse à partir du nouveau total.
  const computeTotals = (order: Order, items: OrderItem[]) => {
    const discount = Math.max(0, recalcTotals(order.items) - order.subtotal);
    const subtotal = Math.max(0, recalcTotals(items) - discount);
    const total = subtotal + (order.shippingCost || 0);
    const tax = Math.round((total * 0.2 / 1.2) * 100) / 100;
    return { subtotal, total, tax };
  };

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
    const { subtotal, total, tax } = computeTotals(selectedOrder, editForm.items);
    try {
      await updateOrder.mutateAsync({
        id: selectedOrder.id, status: editForm.status, paymentStatus: editForm.paymentStatus,
        paymentMethod: editForm.paymentMethod || undefined, shippingCarrier: suggestedCarrier(editForm.customerCountry, editForm.shippingCarrier) || undefined,
        trackingNumber: editForm.trackingNumber || undefined, notes: editForm.notes || undefined,
        customerName: editForm.customerName, customerEmail: editForm.customerEmail,
        customerPhone: editForm.customerPhone || undefined, customerAddress: editForm.customerAddress,
        customerCity: editForm.customerCity, customerZip: editForm.customerZip,
        customerCountry: editForm.customerCountry, items: editForm.items, subtotal, total, tax,
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
      if (error) throw new Error(await edgeErrorMessage(error));
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

  /**
   * Génère l'étiquette Colissimo d'une commande, enregistre le n° de suivi,
   * passe la commande en « Expédiée » et déclenche l'e-mail d'expédition
   * (qui reprend automatiquement le n° de suivi enregistré).
   */
  const generateLabelForOrder = async (order: Order, form?: typeof editForm) => {
    setLabelOrderId(order.id);
    setIsGeneratingLabel(true);
    try {
      // L'étiquette est demandée à partir du seul identifiant : la fonction
      // relit la commande en base et y trouve le pays, les poids réels et de
      // quoi composer la déclaration douanière.
      //
      // ⚠️ Cet appel recopiait auparavant l'adresse champ par champ vers
      // `colissimo-proxy` — sans `country`. Le pays corrigé en administration
      // n'arrivait donc jamais jusqu'à Colissimo, et l'étiquette d'une commande
      // suisse repartait en France (COLISSIMO_ARBITRAGE.md, P2). Passer par
      // l'identifiant supprime la classe entière de ces oublis : il n'y a plus
      // qu'une seule source, la base.
      const { data, error } = await supabase.functions.invoke('create-colissimo-label', {
        body: { order_id: order.id },
      });

      if (error) throw new Error(await edgeErrorMessage(error));

      // `reused: true` ⇒ l'étiquette existait déjà et a été rendue telle quelle.
      // Rien n'a changé pour la cliente : ni écriture, ni e-mail. Sans ce test,
      // chaque clic réaffranchissait et renvoyait un « votre commande est en
      // route » avec un numéro neuf (§31).
      if (data?.reused) {
        toast({
          title: 'Étiquette déjà générée',
          description: data.trackingNumber
            ? `Suivi ${data.trackingNumber} — étiquette existante rouverte, aucun e-mail envoyé`
            : 'Étiquette existante rouverte, aucun e-mail envoyé',
        });
      } else if (data?.trackingNumber) {
        if (form) setEditForm({ ...form, trackingNumber: data.trackingNumber, shippingCarrier: 'Colissimo', status: 'Shipped' });
        // L'e-mail d'expédition est envoyé par useUpdateOrder, qui ne le fait
        // désormais que sur une vraie transition (départ, ou suivi modifié).
        await updateOrder.mutateAsync({
          id: order.id,
          trackingNumber: data.trackingNumber,
          shippingCarrier: 'Colissimo',
          status: 'Shipped',
        });
        toast({ title: 'Étiquette générée', description: `Suivi ${data.trackingNumber} — e-mail d'expédition envoyé` });
      }

      if (data?.pdfBase64) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `colissimo-${order.orderNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (!data?.trackingNumber) {
        toast({
          title: 'Étiquette indisponible',
          description: 'Vérifiez vos identifiants Colissimo',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Colissimo label error:', err);
      toast({ title: 'Erreur génération étiquette', description: String(err), variant: 'destructive' });
    } finally {
      setIsGeneratingLabel(false);
      setLabelOrderId(null);
    }
  };

  const handleGenerateColissimoLabel = async () => {
    if (!selectedOrder || !editForm) return;

    // L'étiquette se construit désormais à partir de la commande ENREGISTRÉE.
    // Les modifications en cours de saisie — typiquement le pays que l'on vient
    // de corriger — doivent donc être écrites avant, sans quoi l'étiquette
    // partirait avec les anciennes valeurs sans que rien ne le signale.
    try {
      const { subtotal, total, tax } = computeTotals(selectedOrder, editForm.items);
      await updateOrder.mutateAsync({
        id: selectedOrder.id,
        customerName: editForm.customerName,
        customerEmail: editForm.customerEmail,
        customerPhone: editForm.customerPhone || undefined,
        customerAddress: editForm.customerAddress,
        customerCity: editForm.customerCity,
        customerZip: editForm.customerZip,
        customerCountry: editForm.customerCountry,
        items: editForm.items,
        subtotal,
        total,
        tax,
      });
    } catch {
      toast({
        title: 'Enregistrement impossible',
        description: "L'étiquette n'a pas été demandée : les modifications de la commande n'ont pas pu être enregistrées.",
        variant: 'destructive',
      });
      return;
    }

    await generateLabelForOrder(selectedOrder, editForm);
  };


  const getStatusInfo = (status: OrderStatus) => STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold hud-text">COMMANDES</h1>
          <p className="text-muted-foreground text-xs lg:text-sm mt-1">
            {orders.length} {scope === 'abandoned' ? 'panier(s) abandonné(s)' : 'commande(s) payée(s)'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {scope === 'abandoned' && (
            <Button variant="outline" size="sm" onClick={handlePurgeAbandoned} disabled={bulkProcessing === 'purge'} className="w-full sm:w-auto gap-2">
              {bulkProcessing === 'purge' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Purger (+24 h)
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)} className="w-full sm:w-auto gap-2">
            <RefreshCw className="h-4 w-4" /> Sync WordPress
          </Button>
        </div>

      </div>

      {/* Filters */}
      <div className="chamfer-hud bg-card/50 p-3 lg:p-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="N° commande, client..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={scope} onValueChange={(v) => { setScope(v as 'paid' | 'abandoned'); clear(); }}>
            <SelectTrigger className="w-full sm:w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Commandes payées</SelectItem>
              <SelectItem value="abandoned">Paniers abandonnés</SelectItem>
            </SelectContent>
          </Select>

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
        <div className="chamfer-hud bg-primary/10 border border-primary/30 p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold">{count} sélectionnée(s)</span>
          <Button variant="outline" size="sm" onClick={handleBulkAIVerify} disabled={!!bulkProcessing}>
            {bulkProcessing === 'identity' ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-2" />}Vérifier IA
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkValidatePayment} disabled={!!bulkProcessing}>
            {bulkProcessing === 'payment' ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <DollarSign className="h-3 w-3 mr-2" />}Valider paiement
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkValidateShipping} disabled={!!bulkProcessing}>
            {bulkProcessing === 'shipping' ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Send className="h-3 w-3 mr-2" />}Valider expédition
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending || !!bulkProcessing}>
            <Trash2 className="h-3 w-3 mr-2" />Supprimer
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkLabels} disabled={!!bulkProcessing}>
            {bulkProcessing === 'labels' ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Truck className="h-3 w-3 mr-2" />}Étiquettes Colissimo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkTrackingOpen(true)} disabled={!!bulkProcessing}>
            <Tag className="h-3 w-3 mr-2" />Suivis en masse
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkRefreshTracking} disabled={!!bulkProcessing}>
            {bulkProcessing === 'refresh' ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-2" />}Actualiser suivi
          </Button>
          <Button variant="outline" size="sm" onClick={openBulkEmail} disabled={!!bulkProcessing}>
            <Mail className="h-3 w-3 mr-2" />Envoyer un e-mail
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
          <div className="admin-scroll-x admin-scroll-shadow min-w-0 admin-orders-mobile">
            <style>{`
              @media (max-width: 639px) {
                .admin-orders-mobile { overflow-x:hidden !important; }
                .admin-orders-mobile > table { min-width:0 !important; width:100% !important; display:block; }
                .admin-orders-mobile thead { display:none; }
                .admin-orders-mobile tbody { display:grid; gap:10px; padding:8px; }
                .admin-orders-mobile tbody tr { display:flex; flex-wrap:wrap; align-items:center; gap:6px; min-width:0; padding:9px; border:1px solid #cbd5e1; border-radius:12px; background:#fff; color:#0f172a; }
                .admin-orders-mobile tbody td { display:flex; align-items:center; min-width:0; max-width:100%; padding:4px !important; border:0; overflow-wrap:anywhere; }
                .admin-orders-mobile tbody td:nth-child(3) { flex:1 1 58%; }
                .admin-orders-mobile tbody td:nth-child(4) { margin-left:auto; }
                .admin-orders-mobile tbody td:nth-child(7) { flex:1 1 100%; justify-content:flex-end; }
                .admin-orders-mobile tbody td .text-muted-foreground { color:#475569; }
                .admin-orders-mobile tbody td button { transition:transform .16s ease,background-color .16s ease; }
                .admin-orders-mobile tbody td button:active { transform:scale(.95); }
              }
              @media(prefers-reduced-motion:reduce) { .admin-orders-mobile button { transition:none !important; transform:none !important; } }
            `}</style>
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
                        {order.invoiceNumber && <p className="text-[10px] font-mono text-muted-foreground">{order.invoiceNumber}</p>}
                        <p className="text-[10px] text-muted-foreground">{timeAgo(order.date)}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-xs">{order.customer.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{order.customer.email}</p>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold">{order.total.toFixed(2)}€</span>
                          {Number(order.discountAmount || 0) > 0 && (
                            <span className="inline-flex max-w-[160px] items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900" title={order.promoCode ? `Code : ${order.promoCode}` : 'Remise appliquée'}>
                              <Tag className="h-3 w-3 shrink-0" />
                              −{Number(order.discountAmount).toFixed(2)}€
                              {order.promoCode && <span className="max-w-[90px] truncate">· {order.promoCode}</span>}
                            </span>
                          )}
                        </div>
                      </td>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => printInvoice(order)} title="Facture"><FileText className="h-3.5 w-3.5" /></Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-purple-500"
                            disabled={isGeneratingLabel}
                            onClick={() => generateLabelForOrder(order)}
                            title="Générer l'étiquette Colissimo et envoyer l'e-mail d'expédition"
                          >
                            {labelOrderId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                          </Button>

                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMailTargets([{ email: order.customer.email, firstName: order.customer.name?.split(' ')[0], orderNumber: order.orderNumber, total: order.total.toFixed(2), trackingNumber: order.trackingNumber, orderId: order.id }])} title="Écrire au client"><Mail className="h-3.5 w-3.5" /></Button>
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
      <Dialog open={!!selectedOrder} onOpenChange={(open) => {
        if (open) return;
        setSelectedOrder(null);
        // Fermer la fiche retire `?order=` de l'URL : un rechargement ne la rouvre pas.
        const url = new URL(window.location.href);
        if (url.searchParams.has('order')) {
          url.searchParams.delete('order');
          window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hud-text flex items-center gap-3">
              COMMANDE {selectedOrder?.orderNumber}
              {selectedOrder && (
                <button
                  onClick={() => setMailTargets([{ email: selectedOrder.customer.email, firstName: selectedOrder.customer.name?.split(' ')[0], orderNumber: selectedOrder.orderNumber, total: selectedOrder.total.toFixed(2), trackingNumber: selectedOrder.trackingNumber, orderId: selectedOrder.id }])}
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
                  <div className="space-y-1">
                    <Label className="text-xs">Pays</Label>
                    {/* Un champ libre laissait entrer « Suisse », « CH » ou
                        « Bussy. Suisse » : l'étiquetage n'en tirait rien de
                        fiable. La liste impose un code ISO reconnu par
                        Colissimo. */}
                    <CountryCombobox
                      compact
                      value={editForm.customerCountry}
                      onChange={code => setEditForm({ ...editForm, customerCountry: code, shippingCarrier: suggestedCarrier(code, editForm.shippingCarrier) })}
                    />
                  </div>
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
                    <div className="flex justify-between"><span>Sous-total{computeTotals(selectedOrder, editForm.items).subtotal < recalcTotals(editForm.items) ? ' (remise déduite)' : ''}</span><span>{computeTotals(selectedOrder, editForm.items).subtotal.toFixed(2)}€</span></div>
                    {/* Les prix sont TTC : `orders.tax` est la TVA CONTENUE dans le total,
                        pas un supplément. L'ajouter au total la comptait deux fois — une
                        commande à 169 € s'affichait à 197,17 €. D'où le libellé « dont ». */}
                    <div className="flex justify-between text-muted-foreground"><span>dont TVA</span><span>{computeTotals(selectedOrder, editForm.items).tax.toFixed(2)}€</span></div>
                    <div className="flex justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                      <span>Code promotionnel</span>
                      <strong>{selectedOrder.promoCode || 'Aucun code renseigné'}</strong>
                    </div>
                    {Number(selectedOrder.discountAmount || 0) > 0 && (
                      <div className="flex justify-between gap-3 px-3 text-sm text-emerald-800">
                        <span>Remise appliquée</span><strong>−{Number(selectedOrder.discountAmount).toFixed(2)} €</strong>
                      </div>
                    )}
                    {/point\\s*relais|relay|pickup/i.test(selectedOrder.customer.address || '') && (
                      <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950">
                        <strong>Adresse à vérifier avant Colissimo</strong>
                        <p>Le champ adresse contient « point relais ». Vérifiez le relais officiel, son identifiant et son adresse complète. Ne générez pas de bordereau avec cette mention à la place de la rue.</p>
                      </div>
                    )}
                    <div className="flex justify-between"><span>Livraison</span><span>{selectedOrder.shippingCost.toFixed(2)}€</span></div>
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-base pt-2 border-t border-border">
                      <span>Total TTC</span>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {Number(selectedOrder.discountAmount || 0) > 0 && <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">Remise −{Number(selectedOrder.discountAmount).toFixed(2)}€</span>}
                        <span>{computeTotals(selectedOrder, editForm.items).total.toFixed(2)}€</span>
                      </div>
                    </div>
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
                    <SelectContent><SelectItem value="none">Non spécifié</SelectItem>{paymentMethodOptions(editForm.paymentMethod).map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
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

              <OrderHistoryPanel orderId={selectedOrder.id} createdAt={selectedOrder.date} />

              <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => selectedOrder && openPrintWindow(generateDeliverySlipHTML(selectedOrder))}><FileDown className="h-4 w-4 mr-1" />Bon de livraison</Button>
                <Button variant="outline" size="sm" onClick={() => selectedOrder && openPrintWindow(generateShippingLabelHTML(selectedOrder))}><Tag className="h-4 w-4 mr-1" />Étiquette aller</Button>
                <Button variant="outline" size="sm" onClick={() => selectedOrder && openPrintWindow(generateShippingLabelHTML(selectedOrder, true))}><Tag className="h-4 w-4 mr-1" />Étiquette retour</Button>
                <Button variant="outline" size="sm" onClick={() => selectedOrder && printInvoice(selectedOrder)}><Printer className="h-4 w-4 mr-1" />Facture</Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedOrder && window.open(`/admin/bordereau/${selectedOrder.id}`, '_blank')}
                  className="border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Printer className="h-4 w-4 mr-1" />Bordereau A4 (étiquette + bon)
                </Button>
                <Button onClick={handleSave} disabled={updateOrder.isPending}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <WordPressSyncDialog open={syncOpen} onOpenChange={setSyncOpen} syncType="orders" />

      <SendEmailDialog
        open={!!mailTargets}
        onOpenChange={(v) => { if (!v) setMailTargets(null); }}
        targets={mailTargets || []}
      />

      <Dialog open={bulkTrackingOpen} onOpenChange={setBulkTrackingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="hud-text">SUIVIS EN MASSE</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Une ligne par commande : <code>N°commande;numéro de suivi</code></Label>
            <Textarea
              rows={8}
              value={bulkTrackingText}
              onChange={e => setBulkTrackingText(e.target.value)}
              placeholder={'HMP-XXXX;6A123456789\nHMP-YYYY;6A987654321'}
            />
            <p className="text-[11px] text-muted-foreground">
              Chaque commande trouvée passe en « Expédiée » et l'e-mail d'expédition part automatiquement.
            </p>
            <Button onClick={handleBulkTracking} disabled={bulkProcessing === 'tracking'} className="w-full">
              {bulkProcessing === 'tracking' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Enregistrer les suivis
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
