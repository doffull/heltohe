import { useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, Loader2, Play, ShoppingCart, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

type StepStatus = 'pending' | 'running' | 'ok' | 'error';
interface Step {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

interface TestLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string | null;
}

const BASE_STEPS: Omit<Step, 'status'>[] = [
  { key: 'cart', label: '1. Panier — produits et quantités' },
  { key: 'promo', label: '2. Code promo — validation serveur' },
  { key: 'shipping', label: '3. Livraison — calcul des frais' },
  { key: 'order', label: '4. Commande — création via RPC sécurisée' },
  { key: 'flag', label: '5. Marquage « commande de test »' },
  { key: 'payment', label: '6. Paiement — simulation / sandbox' },
  { key: 'stock', label: '7. Stock — réservation' },
  { key: 'verify', label: '8. Vérification finale de la commande' },
];

export default function AdminPaymentTest() {
  const { isAdmin, user } = useAuth();
  const { data: products = [] } = useProducts();
  const [lines, setLines] = useState<TestLine[]>([]);
  const [promo, setPromo] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'home' | 'relay'>('home');
  const [simulatePaid, setSimulatePaid] = useState(true);
  const [reserveStock, setReserveStock] = useState(true);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>(BASE_STEPS.map(s => ({ ...s, status: 'pending' })));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.price * l.quantity, 0),
    [lines],
  );

  const setStep = (key: string, status: StepStatus, detail?: string) =>
    setSteps(prev => prev.map(s => (s.key === key ? { ...s, status, detail } : s)));

  const addLine = (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = products.find((x: any) => x.id === id) as any;
    if (!p) return;
    setLines(prev => {
      const found = prev.find(l => l.productId === id);
      if (found) return prev.map(l => (l.productId === id ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          price: Number(p.salePrice ?? p.sale_price ?? p.price ?? 0),
          quantity: 1,
          size: Array.isArray(p.sizes) && p.sizes.length ? p.sizes[0] : null,
        },
      ];
    });
  };

  const runTest = async () => {
    if (!lines.length) {
      toast.error('Ajoutez au moins un produit au panier de test');
      return;
    }
    setRunning(true);
    setResult(null);
    setSteps(BASE_STEPS.map(s => ({ ...s, status: 'pending' })));

    try {
      // 1. Panier
      setStep('cart', 'running');
      setStep('cart', 'ok', `${lines.length} ligne(s) · sous-total ${subtotal.toFixed(2)}€`);

      // 2. Code promo
      setStep('promo', 'running');
      if (promo.trim()) {
        const { data, error } = await supabase.rpc('preview_promo_code', {
          p_code: promo.trim(),
          p_subtotal: subtotal,
        });
        if (error) throw new Error(`Promo: ${error.message}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = data as any;
        if (!res?.success) {
          setStep('promo', 'error', res?.message || 'Code refusé');
        } else {
          setStep('promo', 'ok', `${res.type} · remise ${Number(res.discount || 0).toFixed(2)}€`);
        }
      } else {
        setStep('promo', 'ok', 'Aucun code promo (test sans réduction)');
      }

      // 3. Livraison
      setStep('shipping', 'running');
      const expectedShipping = subtotal >= 200 ? 0 : deliveryMode === 'home' ? 6.5 : 4.5;
      setStep('shipping', 'ok', `${deliveryMode === 'home' ? 'Domicile' : 'Point relais'} · ${expectedShipping.toFixed(2)}€ attendu`);

      // 4. Commande
      setStep('order', 'running');
      const orderNumber = `TEST-${Date.now().toString().slice(-8)}`;
      const { data: orderRes, error: orderErr } = await supabase.rpc('validate_and_create_order', {
        p_items: lines.map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          size: l.size,
          color: null,
        })),
        p_promo_code: promo.trim() || null,
        p_delivery_mode: deliveryMode,
        p_order_data: {
          order_number: orderNumber,
          user_id: user?.id || '',
          customer_email: user?.email || 'test@helvetica-mp.net',
          customer_name: 'Commande de test',
          customer_phone: '0600000000',
          customer_address: '1 rue du Test',
          customer_city: 'Paris',
          customer_zip: '75001',
          customer_country: 'France',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      if (orderErr) throw new Error(`Commande: ${orderErr.message}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order = orderRes as any;
      if (order?.error) throw new Error(`Commande refusée: ${order.error}`);
      setStep(
        'order',
        'ok',
        `${order.orderNumber} · total ${Number(order.total).toFixed(2)}€ (port ${Number(order.shippingCost).toFixed(2)}€, TVA ${Number(order.tax).toFixed(2)}€)`,
      );

      const orderId = order.orderId as string;

      // 5. Flag test
      setStep('flag', 'running');
      const { error: flagErr } = await supabase
        .from('orders')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ is_test: true, notes: 'Commande générée par le mode test de paiement' } as any)
        .eq('id', orderId);
      if (flagErr) setStep('flag', 'error', flagErr.message);
      else setStep('flag', 'ok', 'Exclue du chiffre d’affaires réel');

      // 6. Paiement
      setStep('payment', 'running');
      if (simulatePaid) {
        const { error: payErr } = await supabase
          .from('orders')
          .update({ payment_status: 'paid', payment_method: 'test', status: 'processing' })
          .eq('id', orderId);
        if (payErr) throw new Error(`Paiement: ${payErr.message}`);
        setStep('payment', 'ok', 'Paiement simulé accepté (payment_status = Paid)');
      } else {
        setStep('payment', 'ok', 'Laissée « en attente » — payez via le tunnel sandbox');
      }

      // 7. Stock
      setStep('stock', 'running');
      if (reserveStock) {
        const { data: resv, error: resvErr } = await supabase.rpc('reserve_order_stock', { p_order_id: orderId });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = resv as any;
        if (resvErr) setStep('stock', 'error', resvErr.message);
        else if (r?.error) setStep('stock', 'error', r.error);
        else setStep('stock', 'ok', r?.already_reserved ? 'Déjà réservé' : 'Stock réservé');
      } else {
        setStep('stock', 'ok', 'Réservation ignorée');
      }

      // 8. Vérification
      setStep('verify', 'running');
      const { data: finalOrder, error: verifyErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      if (verifyErr || !finalOrder) throw new Error(`Vérification: ${verifyErr?.message || 'commande introuvable'}`);
      setStep(
        'verify',
        'ok',
        `Statut ${finalOrder.status} · paiement ${finalOrder.payment_status} · total ${Number(finalOrder.total).toFixed(2)}€`,
      );
      setResult(finalOrder as Record<string, unknown>);
      toast.success('Test de paiement terminé');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      setSteps(prev => {
        const idx = prev.findIndex(s => s.status === 'running');
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], status: 'error', detail: msg };
        return next;
      });
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const deleteTestOrders = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any).delete().eq('is_test', true);
    if (error) toast.error(error.message);
    else toast.success('Commandes de test supprimées');
  };

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">Accès réservé aux administrateurs.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="hud-text text-lg">// MODE TEST PAIEMENT</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Rejouez le parcours d’achat complet (panier → promo → livraison → commande → paiement → stock)
          sans polluer vos statistiques : les commandes créées ici sont marquées « test ».
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <div className="space-y-4 border border-border/40 bg-secondary/20 p-4">
          <Label className="hud-text text-xs">Panier de test</Label>
          <select
            className="w-full h-9 bg-secondary/50 border border-border/30 text-xs px-2"
            value=""
            onChange={(e) => e.target.value && addLine(e.target.value)}
          >
            <option value="">+ Ajouter un produit…</option>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(products as any[]).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} — {Number(p.salePrice ?? p.price ?? 0).toFixed(2)}€
              </option>
            ))}
          </select>

          {lines.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Aucun produit sélectionné.</p>
          ) : (
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.productId} className="flex items-center gap-2 border border-border/30 p-2">
                  <span className="flex-1 text-xs truncate">{l.name}</span>
                  <span className="text-[11px] text-muted-foreground">{l.size || '—'}</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={l.quantity}
                    onChange={(e) =>
                      setLines(prev =>
                        prev.map(x =>
                          x.productId === l.productId
                            ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) }
                            : x,
                        ),
                      )
                    }
                    className="h-7 w-16 text-xs bg-secondary/50 border-border/30"
                  />
                  <span className="text-xs font-bold w-20 text-right">
                    {(l.price * l.quantity).toFixed(2)}€
                  </span>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => setLines(prev => prev.filter(x => x.productId !== l.productId))}
                    aria-label="Retirer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-right">
                Sous-total indicatif : <span className="font-bold">{subtotal.toFixed(2)}€</span>
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="hud-text text-[10px]">Code promo (optionnel)</Label>
            <Input
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              placeholder="Ex : BIENVENUE10"
              className="h-8 text-xs bg-secondary/50 border-border/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="hud-text text-[10px]">Mode de livraison</Label>
            <div className="flex gap-2">
              {(['home', 'relay'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDeliveryMode(m)}
                  className={`text-[11px] px-3 py-1.5 border ${
                    deliveryMode === m ? 'border-primary bg-primary/15' : 'border-border/40 text-muted-foreground'
                  }`}
                >
                  {m === 'home' ? 'Domicile (6,50€)' : 'Point relais (4,50€)'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Frais offerts dès 200€ d’achat.</p>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={simulatePaid} onChange={(e) => setSimulatePaid(e.target.checked)} />
              Simuler un paiement accepté
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={reserveStock} onChange={(e) => setReserveStock(e.target.checked)} />
              Réserver le stock comme une vraie commande
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={runTest} disabled={running} className="h-9 text-xs">
              {running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
              Lancer le test de A à Z
            </Button>
            <Button variant="outline" className="h-9 text-xs" onClick={deleteTestOrders} disabled={running}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Purger les commandes de test
            </Button>
          </div>
        </div>

        {/* Journal */}
        <div className="space-y-3 border border-border/40 bg-secondary/20 p-4">
          <Label className="hud-text text-xs">Déroulé du parcours</Label>
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.key} className="flex items-start gap-2">
                {s.status === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : s.status === 'error' ? (
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : s.status === 'running' ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
                ) : (
                  <CircleDashed className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-xs">{s.label}</p>
                  {s.detail && <p className="text-[10px] text-muted-foreground break-words">{s.detail}</p>}
                </div>
              </div>
            ))}
          </div>

          {result && (
            <div className="border-t border-border/40 pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{String(result.order_number)}</span>
                <Badge variant="outline" className="text-[9px]">TEST</Badge>
              </div>
              <pre className="text-[10px] bg-background/60 border border-border/30 p-2 overflow-auto max-h-64">
{JSON.stringify(
  {
    statut: result.status,
    paiement: result.payment_status,
    sous_total: result.subtotal,
    livraison: result.shipping_cost,
    tva: result.tax,
    total: result.total,
    articles: result.items,
  },
  null,
  2,
)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
