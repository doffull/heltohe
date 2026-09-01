import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, Scissors, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SlipItem {
  name?: string;
  productId?: string;
  quantity: number;
  price?: number;
  size?: string;
  color?: string;
}

interface SlipOrder {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  customer_city: string;
  customer_zip: string;
  customer_country: string;
  items: SlipItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: string | null;
  tracking_number: string | null;
  label_path: string | null;
  label_url: string | null;
}

const euro = (n: number) => `${Number(n || 0).toFixed(2)} €`;

export default function PrintShippingLabel() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [order, setOrder] = useState<SlipOrder | null>(null);
  const [labelSrc, setLabelSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    setLoading(false);
    if (error || !data) {
      toast({ title: 'Commande introuvable', variant: 'destructive' });
      return;
    }
    const o = data as unknown as SlipOrder;
    setOrder({ ...o, items: Array.isArray(o.items) ? o.items : [] });
    if (o.label_path) {
      const { data: signed } = await supabase.storage
        .from('labels')
        .createSignedUrl(o.label_path, 60 * 60);
      setLabelSrc(signed?.signedUrl ?? o.label_url ?? null);
    } else {
      setLabelSrc(o.label_url ?? null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function generateLabel() {
    if (!id) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-colissimo-label', {
        body: { order_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);
      toast({ title: 'Étiquette Colissimo générée', description: data?.trackingNumber ? `Suivi : ${data.trackingNumber}` : undefined });
      // E-mail d'expédition au client (suivi Colissimo) — best-effort
      await triggerOrderEmail(id, 'shipped');

      await load();
    } catch (e) {
      toast({ title: 'Échec de la génération', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }

  const totalItems = useMemo(
    () => (order?.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    [order],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!order) return <div className="p-10 text-center">Commande introuvable.</div>;

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .slip-sheet { box-shadow: none !important; margin: 0 !important; width: 100% !important; height: auto !important; page-break-after: avoid; }
          .slip-sheet, .slip-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background p-3">
        <div className="text-sm">
          Bordereau d'expédition — <strong>{order.order_number}</strong>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={generateLabel} disabled={generating}>
            {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            {labelSrc ? 'Régénérer l\u2019étiquette' : 'Générer l\u2019étiquette Colissimo'}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />Imprimer
          </Button>
        </div>
      </div>

      <div className="flex justify-center p-4 print:p-0">
        <div
          className="slip-sheet bg-white text-black shadow-lg"
          style={{ width: '281mm', minHeight: '194mm', padding: '6mm' }}
        >
          <div className="grid h-full grid-cols-2" style={{ gap: 0 }}>
            {/* ─── Colonne gauche : étiquette transporteur ─── */}
            <div className="relative pr-[6mm]">
              <p className="mb-2 text-center text-[10px] uppercase tracking-widest text-neutral-500">
                Collez ici le ruban adhésif
              </p>
              <div className="relative border-2 border-black p-2" style={{ minHeight: '150mm' }}>
                <span className="absolute -left-[1px] top-1/2 -translate-y-1/2 -rotate-90 text-[8px] uppercase tracking-widest text-neutral-500">
                  Collez ici le ruban adhésif
                </span>
                <span className="absolute -right-[1px] top-1/2 -translate-y-1/2 rotate-90 text-[8px] uppercase tracking-widest text-neutral-500">
                  Collez ici le ruban adhésif
                </span>
                {labelSrc ? (
                  <object data={labelSrc} type="application/pdf" className="h-full w-full" style={{ minHeight: '146mm' }}>
                    <iframe src={labelSrc} title="Étiquette Colissimo" className="h-full w-full" style={{ minHeight: '146mm', border: 0 }} />
                  </object>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-neutral-500" style={{ minHeight: '146mm' }}>
                    <p>Aucune étiquette Colissimo générée.</p>
                    <p className="no-print">Cliquez sur « Générer l'étiquette Colissimo ».</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-neutral-500">
                Collez ici le ruban adhésif
              </p>
            </div>

            {/* ─── Colonne droite : bon de commande ─── */}
            <div className="relative border-l-2 border-dashed border-neutral-400 pl-[6mm]">
              <div className="absolute -left-[13px] top-2 flex flex-col items-center bg-white py-1">
                <Scissors className="h-4 w-4 text-neutral-500" />
              </div>
              <p className="mb-3 text-center text-[9px] uppercase tracking-widest text-neutral-500">
                Étiquette Colissimo, découpez selon les pointillés
              </p>

              <p className="text-[11px]">
                Vous avez reçu la commande suivante de <strong>{order.customer_name}</strong> :
              </p>
              <h1 className="my-2 text-[15px] font-bold" style={{ color: '#c0392b' }}>
                [Order #{order.order_number}] ({new Date(order.created_at).toLocaleDateString('fr-FR')})
              </h1>

              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr>
                    <th className="border-b-2 border-black p-1 text-left">Produit</th>
                    <th className="border-b-2 border-black p-1 text-center">Quantité</th>
                    <th className="border-b-2 border-black p-1 text-right">Prix unitaire</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="border-b border-neutral-300 p-1 align-top">
                        <div className="font-medium">{item.name || item.productId}</div>
                        {(item.size || item.color) && (
                          <div className="text-[9px] text-neutral-600">
                            {[item.size && `Taille : ${item.size}`, item.color && `Couleur : ${item.color}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-neutral-300 p-1 text-center">{item.quantity}</td>
                      <td className="border-b border-neutral-300 p-1 text-right">{euro(item.price || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 border border-neutral-400 bg-neutral-50 p-2 text-[9px] leading-snug">
                <strong className="uppercase tracking-wide">Conditions de retour</strong>
                <p className="mt-1">
                  Vous disposez de 14 jours à compter de la réception pour retourner un article dans son
                  état d'origine, non porté, avec ses étiquettes et son emballage. Les articles enfants et
                  les produits en édition limitée ne sont ni repris ni échangés. Le retour doit être
                  expédié dans les 14 jours suivant la demande, faute de quoi il pourra être refusé.
                </p>
              </div>

              <div className="mt-3 ml-auto w-[70%] text-[10px]">
                <div className="flex justify-between border-b border-neutral-200 py-[3px]">
                  <span>Sous-total ({totalItems} article{totalItems > 1 ? 's' : ''})</span>
                  <span>{euro(order.subtotal)}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 py-[3px]">
                  <span>Frais de livraison</span>
                  <span>{euro(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 py-[3px]">
                  <span>Mode de paiement</span>
                  <span>{order.payment_method || '—'}</span>
                </div>
                <div className="flex justify-between py-1 text-[12px] font-bold">
                  <span>Total TTC</span>
                  <span>{euro(order.total)}</span>
                </div>
              </div>

              <div className="mt-3 text-[9px] text-neutral-600">
                <div>
                  {order.customer_address} — {order.customer_zip} {order.customer_city}, {order.customer_country}
                </div>
                <div>
                  {order.customer_email}
                  {order.customer_phone ? ` · ${order.customer_phone}` : ''}
                </div>
                {order.tracking_number && <div>N° de suivi : {order.tracking_number}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
