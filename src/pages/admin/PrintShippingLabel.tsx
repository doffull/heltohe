import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { triggerOrderEmail } from '@/hooks/useOrders';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

interface SlipOrder {
  id: string;
  order_number: string;
  tracking_number: string | null;
  label_path: string | null;
}

/**
 * Bon de préparation — aperçu et impression.
 *
 * L'écran assemblait autrefois le bon en HTML et confiait l'impression au
 * navigateur. Deux obstacles l'en empêchaient : l'étiquette est un PDF servi
 * par le stockage, donc d'une autre origine — impossible à imprimer depuis la
 * page — et la seule présence de ce plugin faisait échouer `window.print()`
 * sans message.
 *
 * Le document est désormais produit d'un bloc par la fonction `order-slip-pdf`,
 * étiquette incluse. Cet écran n'en est que la visionneuse. C'est aussi la
 * garantie qu'il n'existe qu'une seule mise en page : ce qui s'affiche est
 * exactement ce qui s'imprime.
 */
export default function PrintShippingLabel() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [order, setOrder] = useState<SlipOrder | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  /** Remplace l'aperçu courant, en libérant le précédent. */
  const setPdfFromBase64 = useCallback((base64: string) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    // Une URL blob est de MÊME ORIGINE que la page : c'est ce qui rend
    // l'impression possible, là où une URL signée du stockage la bloquait.
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
    setPdfUrl(url);
  }, []);

  /**
   * @param allowLabelCreation n'est vrai que sur action explicite : affranchir
   * engage un colis auprès de La Poste, jamais au simple affichage de la page.
   */
  const buildSlip = useCallback(
    async (allowLabelCreation: boolean) => {
      if (!id) return;
      setBusy(true);
      try {
        const { data, error } = await supabase.functions.invoke('order-slip-pdf', {
          body: { order_id: id, allow_label_creation: allowLabelCreation },
        });
        if (error) throw new Error(await edgeErrorMessage(error));
        if (data?.error) throw new Error(data.details || data.error);
        if (!data?.pdfBase64) throw new Error('Aucun document renvoyé');

        setPdfFromBase64(data.pdfBase64);
        setOrder((o) => (o ? { ...o, tracking_number: data.trackingNumber ?? o.tracking_number } : o));

        if (data.labelGenerated) {
          toast({
            title: 'Étiquette Colissimo générée',
            description: data.trackingNumber ? `Suivi : ${data.trackingNumber}` : undefined,
          });
          await triggerOrderEmail(id, 'shipped');
        }
      } catch (e) {
        toast({
          title: 'Bon indisponible',
          description: e instanceof Error ? e.message : String(e),
          variant: 'destructive',
        });
      } finally {
        setBusy(false);
      }
    },
    [id, setPdfFromBase64, toast],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, tracking_number, label_path')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      setLoading(false);
      if (error || !data) {
        toast({ title: 'Commande introuvable', variant: 'destructive' });
        return;
      }
      setOrder(data as SlipOrder);
      // Aperçu seul : aucune étiquette n'est créée à l'ouverture.
      void buildSlip(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Libère l'URL blob au démontage.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  /**
   * Le PDF étant en URL blob, il est de même origine : l'imprimer depuis un
   * cadre caché fonctionne, ce qui n'était pas le cas de l'URL signée.
   */
  function print() {
    if (!pdfUrl) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    frame.src = pdfUrl;
    const launch = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    };
    frame.onload = launch;
    document.body.appendChild(frame);
    // Certains navigateurs ne déclenchent pas `onload` sur un PDF.
    setTimeout(launch, 2500);
    // Le cadre doit survivre à la boîte de dialogue, qui est modale.
    setTimeout(() => frame.remove(), 120000);
  }

  function download() {
    if (!pdfUrl || !order) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `bon-${order.order_number}.pdf`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!order) return <div className="p-10 text-center">Commande introuvable.</div>;

  const hasLabel = Boolean(order.tracking_number || order.label_path);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background p-3">
        <div className="text-sm">
          Bon de préparation — <strong>{order.order_number}</strong>
          {order.tracking_number && (
            <span className="ml-2 text-muted-foreground">suivi {order.tracking_number}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => buildSlip(true)} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            {hasLabel ? 'Actualiser le bon' : 'Générer l’étiquette et le bon'}
          </Button>
          <Button variant="outline" size="sm" onClick={download} disabled={!pdfUrl || busy}>
            <Download className="mr-1 h-4 w-4" />Télécharger
          </Button>
          <Button size="sm" onClick={print} disabled={!pdfUrl || busy}>
            <Printer className="mr-1 h-4 w-4" />Imprimer
          </Button>
        </div>
      </div>

      <div className="flex justify-center p-4">
        {/* Proportions A4 paysage (297 x 210 mm) plutôt qu'une hauteur fixe :
            l'aperçu garde le format du document sur tous les écrans, sans
            bandes blanches ni PDF écrasé. */}
        <div className="aspect-[297/210] w-full max-w-[297mm] bg-white shadow-lg">
          {busy && !pdfUrl ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Préparation du document…
            </div>
          ) : pdfUrl ? (
            <object data={pdfUrl} type="application/pdf" className="h-full w-full">
              <iframe src={pdfUrl} title="Bon de préparation" className="h-full w-full border-0" />
            </object>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Le bon n&rsquo;a pas pu être préparé.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
