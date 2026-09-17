import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Film } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildGifBlob, clampWidth, GIF_WIDTH_MAX, GIF_WIDTH_MIN } from '@/lib/gifBuilder';
import { readGifLastUsed, writeGifLastUsed } from '@/lib/gifPresets';
import { mediaUploadOptions } from '@/lib/storageUpload';
import { GifPresetBar } from '@/components/admin/GifPresetBar';
import { useUpdateProduct } from '@/hooks/useProducts';
import type { Product } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: Product[];
}

interface RowResult {
  id: string;
  name: string;
  status: 'ok' | 'skipped' | 'error';
  detail?: string;
}

/** Generate an animated GIF for many products at once, using shared settings. */
export function BulkGifDialog({ open, onOpenChange, products }: Props) {
  const updateProduct = useUpdateProduct();
  const [delay, setDelay] = useState(400);
  const [width, setWidth] = useState(600);
  const [widthDraft, setWidthDraft] = useState('600');
  const [loop, setLoop] = useState(true);
  const [asMain, setAsMain] = useState(true);
  const [asHover, setAsHover] = useState(false);
  const [maxFrames, setMaxFrames] = useState(3);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<RowResult[]>([]);

  useEffect(() => {
    if (!open) return;
    const last = readGifLastUsed();
    setDelay(last.delay);
    setWidth(last.width);
    setWidthDraft(String(last.width));
    setLoop(last.loop);
    setAsMain(last.asMain);
    setAsHover(last.asHover);
    setResults([]);
    setProgress(null);
  }, [open]);

  const current = { delay, width, loop, asMain, asHover };

  function commitWidth(raw: string) {
    const w = clampWidth(parseInt(raw, 10));
    setWidth(w);
    setWidthDraft(String(w));
  }

  function framesFor(p: Product): string[] {
    const all = [p.image, ...((p.galleryImages as string[]) || [])].filter(Boolean) as string[];
    return Array.from(new Set(all)).slice(0, Math.max(2, maxFrames));
  }

  /**
   * ⚠️ Seul point d'envoi qui NE passe PAS par `prepareMediaForUpload()`, et
   * c'est délibéré : ce qui sort d'ici est un GIF ANIMÉ.
   *
   * Le redimensionnement de `storageUpload.ts` repose sur un `canvas`, qui ne
   * connaît qu'une seule image. Un GIF animé qui y passerait ressortirait
   * réduit à sa PREMIÈRE image — animation détruite, sans erreur ni trace.
   *
   * La garde existe déjà là-bas (liste blanche PNG/JPEG, et le type vaut ici
   * `image/gif`), donc l'appel serait sans effet. On ne l'écrit pas pour
   * autant : le lecteur de ce fichier ne doit pas avoir à aller le vérifier.
   *
   * L'allègement des GIF passe par une conversion en MP4/WebM (×10–20), un
   * autre chantier.
   */
  async function uploadGif(blob: Blob, productId: string): Promise<string> {
    const path = `products/gifs/${productId}-${Date.now()}.gif`;
    const { error } = await supabase.storage
      .from('media')
      .upload(path, blob, mediaUploadOptions({ upsert: true, contentType: 'image/gif' }));
    if (error) throw error;
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  }

  async function run() {
    if (!asMain && !asHover) {
      toast.error('Choisissez au moins une destination');
      return;
    }
    setRunning(true);
    writeGifLastUsed(current);
    const out: RowResult[] = [];
    setProgress({ done: 0, total: products.length });

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      try {
        const frames = framesFor(p);
        if (frames.length < 2) {
          out.push({ id: p.id, name: p.name, status: 'skipped', detail: 'Moins de 2 images' });
        } else {
          const blob = await buildGifBlob(frames, { delay, width, loop });
          const url = await uploadGif(blob, p.id);
          await updateProduct.mutateAsync({
            id: p.id,
            ...(asMain ? { image: url } : {}),
            ...(asHover ? { hoverImage: url } : {}),
          } as any);
          out.push({ id: p.id, name: p.name, status: 'ok' });
        }
      } catch (e) {
        out.push({
          id: p.id,
          name: p.name,
          status: 'error',
          detail: e instanceof Error ? e.message : 'Échec',
        });
      }
      setProgress({ done: i + 1, total: products.length });
      setResults([...out]);
    }

    setRunning(false);
    const ok = out.filter((r) => r.status === 'ok').length;
    toast.success(`${ok}/${products.length} GIF générés`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-4 w-4" /> Créer des GIF ({products.length} produit(s))
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <GifPresetBar
            current={current}
            onApply={(p) => {
              setDelay(p.delay);
              setWidth(p.width);
              setWidthDraft(String(p.width));
              setLoop(p.loop);
              setAsMain(p.asMain);
              setAsHover(p.asHover);
              toast.success(`Preset « ${p.name} » appliqué`);
            }}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Vitesse : {delay} ms / image</Label>
              <Slider className="mt-3" min={100} max={1000} step={50} value={[delay]} onValueChange={([v]) => setDelay(v)} />
            </div>
            <div>
              <Label className="text-xs">Largeur de sortie ({GIF_WIDTH_MIN}–{GIF_WIDTH_MAX} px)</Label>
              <Input
                type="number"
                min={GIF_WIDTH_MIN}
                max={GIF_WIDTH_MAX}
                value={widthDraft}
                onChange={(e) => setWidthDraft(e.target.value)}
                onBlur={(e) => commitWidth(e.target.value)}
                className="h-8 w-28 text-xs mt-2"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Nombre d'images par GIF : {maxFrames}</Label>
            <Slider className="mt-3" min={2} max={10} step={1} value={[maxFrames]} onValueChange={([v]) => setMaxFrames(v)} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Les premières images de chaque produit (principale + galerie) sont utilisées.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={loop} onCheckedChange={(v) => setLoop(Boolean(v))} />
              Boucle infinie
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={asMain} onCheckedChange={(v) => setAsMain(Boolean(v))} />
              Image principale
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={asHover} onCheckedChange={(v) => setAsHover(Boolean(v))} />
              Image de survol
            </label>
          </div>

          {progress && (
            <p className="text-xs font-bold">
              Progression : {progress.done}/{progress.total}
            </p>
          )}

          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto border border-border/40 divide-y divide-border/40">
              {results.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-2 py-1 text-[11px]">
                  <span className="truncate mr-2">{r.name}</span>
                  <span
                    className={
                      r.status === 'ok'
                        ? 'text-primary font-bold'
                        : r.status === 'skipped'
                          ? 'text-muted-foreground'
                          : 'text-destructive'
                    }
                  >
                    {r.status === 'ok' ? 'OK' : r.detail}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            Fermer
          </Button>
          <Button type="button" onClick={run} disabled={running || products.length === 0}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Film className="h-4 w-4 mr-2" />}
            Générer les GIF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
