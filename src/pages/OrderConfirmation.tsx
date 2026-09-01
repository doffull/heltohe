import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Package, Truck, MapPin, Loader2, Mail, Printer } from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';

interface ReceiptItem {
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  size?: string | null;
  color?: string | null;
  image?: string | null;
}

interface Receipt {
  order_number: string;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_zip: string | null;
  customer_country: string | null;
  items: ReceiptItem[];
  subtotal: number | null;
  shipping_cost: number | null;
  total: number | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  error?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

const euro = (v: number | null | undefined) => `${Number(v || 0).toFixed(2)} €`;

export default function OrderConfirmation() {
  const { orderNumber = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const stateEmail = (location.state as { email?: string } | null)?.email;
  const storedEmail = useMemo(() => {
    try { return sessionStorage.getItem(`order_email_${orderNumber}`) || ''; } catch { return ''; }
  }, [orderNumber]);

  const [email, setEmail] = useState(stateEmail || storedEmail || '');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [needEmail, setNeedEmail] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchReceipt = async (mail: string) => {
    setLoading(true);
    setNotFound(false);
    const { data, error } = await supabase.rpc('get_order_receipt', {
      p_order_number: orderNumber,
      p_email: mail || null,
    } as never);
    setLoading(false);
    const res = data as unknown as Receipt | null;
    if (error || !res) { setNotFound(true); return; }
    if (res.error === 'unauthorized') { setNeedEmail(true); return; }
    if (res.error) { setNotFound(true); return; }
    setNeedEmail(false);
    setReceipt(res);
    if (mail) {
      try { sessionStorage.setItem(`order_email_${orderNumber}`, mail); } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    if (!orderNumber) { navigate('/'); return; }
    fetchReceipt(stateEmail || storedEmail || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (needEmail || notFound) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="chamfer-hud bg-card/50 p-6 max-w-md w-full space-y-4">
          <h1 className="text-xl font-bold hud-text">SUIVI DE COMMANDE</h1>
          <p className="text-sm text-muted-foreground">
            {notFound
              ? "Commande introuvable. Vérifiez le numéro de commande."
              : "Saisissez l'e-mail utilisé lors de la commande pour afficher le détail."}
          </p>
          <div className="space-y-2">
            <Label htmlFor="order-email">E-mail</Label>
            <Input
              id="order-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          </div>
          <Button className="w-full" onClick={() => fetchReceipt(email)} disabled={!email}>
            <Mail className="h-4 w-4 mr-2" /> Afficher ma commande
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate('/boutique')}>
            Retour boutique
          </Button>
        </div>
      </div>
    );
  }

  if (!receipt) return null;

  const isPaid = receipt.payment_status?.toLowerCase() === 'paid' || receipt.status?.toLowerCase() === 'paid';
  const statusLabel = STATUS_LABELS[(receipt.status || '').toLowerCase()] || receipt.status || '—';


  return (
    <div className="min-h-screen bg-background py-8 px-3 sm:px-4 print:py-0">
      <SeoHead
        title={`Commande ${receipt.order_number} — Confirmation`}
        description="Détail et suivi de votre commande HELVETICA-MP."
        forceNoIndex
      />
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="chamfer-hud bg-card/50 p-5 sm:p-8 text-center space-y-3 border-t-4" style={{ borderTopColor: `hsl(var(--step-confirm))` }}>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `hsl(var(--step-confirm)/0.15)` }}>
              <CheckCircle className="h-10 w-10" style={{ color: `hsl(var(--step-confirm))` }} />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold hud-text">COMMANDE CONFIRMÉE</h1>
          <p className="text-sm text-muted-foreground">
            Merci {receipt.customer_name || ''} ! Votre commande a bien été enregistrée.
          </p>
          <p className="text-xs font-mono break-all">N° {receipt.order_number}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(receipt.created_at).toLocaleString('fr-FR')} • Statut : <span className="font-medium text-foreground">{statusLabel}</span>
            {' • '}{isPaid ? 'Paiement reçu' : 'En attente de paiement'}
          </p>
        </div>

        {/* Articles */}
        <div className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-3">
          <p className="text-sm font-bold hud-text flex items-center gap-2"><Package className="h-4 w-4" />ARTICLES</p>
          <div className="space-y-2">
            {receipt.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border border-border chamfer-hud-sm">
                {it.image ? (
                  <img src={it.image} alt={it.name || 'Article'} loading="lazy" className="w-14 h-14 object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[it.size && `Taille ${it.size}`, it.color, `x${it.quantity || 1}`].filter(Boolean).join(' • ')}
                  </p>
                </div>
                <p className="text-sm font-bold shrink-0">{euro((it.price || 0) * (it.quantity || 1))}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-1 text-sm font-mono">
            <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{euro(receipt.subtotal)}</span></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Livraison</span>
              <span>{Number(receipt.shipping_cost || 0) === 0 ? 'GRATUIT' : euro(receipt.shipping_cost)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1">
              <span>Total</span>
              <span style={{ color: `hsl(var(--step-confirm))` }}>{euro(receipt.total)}</span>
            </div>
          </div>
        </div>

        {/* Livraison */}
        <div className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-2">
          <p className="text-sm font-bold hud-text flex items-center gap-2"><MapPin className="h-4 w-4" />LIVRAISON</p>
          <p className="text-sm break-words">{receipt.customer_name}</p>
          <p className="text-sm text-muted-foreground break-words">
            {receipt.customer_address}, {receipt.customer_zip} {receipt.customer_city} {receipt.customer_country}
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-2 pt-1">
            <Truck className="h-3 w-3 mt-0.5 shrink-0" />
            {receipt.tracking_number
              ? <span>Colis {receipt.shipping_carrier || 'Colissimo'} — suivi n° {receipt.tracking_number}</span>
              : <span>Expédition {receipt.shipping_carrier || 'Colissimo'} dès validation du paiement</span>}
          </p>
        </div>

        {/* Paiement */}
        <div className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-2">
          <p className="text-sm font-bold hud-text">PAIEMENT</p>
          {isPaid ? (
            <p className="text-xs text-muted-foreground">
              Paiement accepté{receipt.payment_method ? ` (${receipt.payment_method})` : ''}. Un e-mail de confirmation est envoyé à{' '}
              <span className="text-foreground font-medium break-all">{receipt.customer_email}</span>.
            </p>
          ) : (
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                Votre commande est en attente de paiement. Effectuez un virement avec la référence{' '}
                <span className="font-bold text-foreground break-all">{receipt.order_number}</span>.
              </p>
              <div className="border border-border chamfer-hud-sm p-3 font-mono space-y-1">
                <div className="flex justify-between gap-2"><span>Bénéficiaire</span><span className="text-right">HELVETICA-MP Concept</span></div>
                <div className="flex justify-between gap-2"><span>Montant</span><span className="font-bold text-foreground">{euro(receipt.total)}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 print:hidden">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Imprimer
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/compte/commandes">Mes commandes</Link>
          </Button>
          <Button
            className="w-full sm:flex-1 text-white hover:opacity-90"
            style={{ backgroundColor: `hsl(var(--step-confirm))` }}
            onClick={() => navigate('/boutique')}
          >
            Continuer mes achats
          </Button>
        </div>
      </div>
    </div>
  );
}
