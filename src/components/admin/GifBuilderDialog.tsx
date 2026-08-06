import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Film, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';
import { buildGifBlob, clampWidth, GIF_WIDTH_MAX, GIF_WIDTH_MIN } from '@/lib/gifBuilder';
import { readGifLastUsed, writeGifLastUsed } from '@/lib/gifPresets';
import { GifPresetBar } from '@/components/admin/GifPresetBar';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Candidate images (main image first, then gallery). */
  images: string[];
  onApply: (url: string, target: { main: boolean; hover: boolean }) => void;
}

const SIZE_SHORTCUTS = [600, 900, 1200] as const;

export function GifBuilderDialog({ open, onOpenChange, images, onApply }: Props) {
  const { upload, uploading } = useFileUpload({ bucket: 'media', folder: 'products/gifs' });
  const [selected, setSelected] = useState<string[]>([]);
  const [delay, setDelay] = useState(400);
  const [width, setWidth] = useState<number>(600);
  const [widthDraft, setWidthDraft] = useState('600');
  const [loop, setLoop] = useState(true);
  const [asMain, setAsMain] = useState(true);
  const [asHover, setAsHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const uniqueImages = useMemo(
    () => Array.from(new Set(images.filter(Boolean))).slice(0, 20),
    [images],
  );

  useEffect(() => {
    if (open) {
      setSelected(uniqueImages.slice(0, Math.min(3, uniqueImages.length)));
      setPreviewUrl(null);
      blobRef.current = null;
      const last = readGifLastUsed();
      setDelay(last.delay);
      setWidth(last.width);
      setWidthDraft(String(last.width));
      setLoop(last.loop);
      setAsMain(last.asMain);
      setAsHover(last.asHover);
    }
  }, [open, uniqueImages]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const current = { delay, width, loop, asMain, asHover };

  function commitWidth(raw: string) {
    const w = clampWidth(parseInt(raw, 10));
    setWidth(w);
    setWidthDraft(String(w));
  }

  function toggle(src: string) {
    setSelected((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : prev.length >= 10 ? prev : [...prev, src],
    );
  }

  function move(index: number, dir: -1 | 1) {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function generate() {
    if (selected.length < 2) {
      toast.error('Sélectionnez au moins 2 images');
      return;
    }
    setBusy(true);
    try {
      const blob = await buildGifBlob(selected, { delay, width, loop });
      blobRef.current = blob;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      writeGifLastUsed(current);
      toast.success('GIF généré — vérifiez l\'aperçu');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Échec de la génération';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function applyGif() {
    if (!blobRef.current) {
      toast.error('Générez d\'abord le GIF');
      return;
    }
    if (!asMain && !asHover) {
      toast.error('Choisissez au moins une destination');
      return;
    }
    const file = new File([blobRef.current], `anim-${Date.now()}.gif`, { type: 'image/gif' });
    const url = await upload(file);
    if (!url) return;
    writeGifLastUsed(current);
    onApply(url, { main: asMain, hover: asHover });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-4 w-4" /> Créer un GIF animé
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {uniqueImages.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Ajoutez au moins 2 images au produit (image principale + galerie) pour créer un GIF.
            </p>
          ) : (
            <>
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

              <div>
                <Label className="text-xs">Images ({selected.length}/10)</Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                  {uniqueImages.map((src) => {
                    const idx = selected.indexOf(src);
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => toggle(src)}
                        className={cn(
                          'relative aspect-square overflow-hidden border-2 transition-all',
                          idx >= 0 ? 'border-primary' : 'border-border/40 opacity-70 hover:opacity-100',
                        )}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {idx >= 0 && (
                          <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                            {idx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selected.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Ordre des images</Label>
                  {selected.map((src, i) => (
                    <div key={src} className="flex items-center gap-2 border border-border/40 p-1.5">
                      <img src={src} alt="" className="h-8 w-8 object-cover" />
                      <span className="text-xs text-muted-foreground flex-1">Image {i + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === selected.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Vitesse : {delay} ms / image</Label>
                  <Slider
                    className="mt-3"
                    min={100}
                    max={1000}
                    step={50}
                    value={[delay]}
                    onValueChange={([v]) => setDelay(v)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Largeur de sortie ({GIF_WIDTH_MIN}–{GIF_WIDTH_MAX} px)</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min={GIF_WIDTH_MIN}
                      max={GIF_WIDTH_MAX}
                      value={widthDraft}
                      onChange={(e) => setWidthDraft(e.target.value)}
                      onBlur={(e) => commitWidth(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitWidth(widthDraft); } }}
                      className="h-8 w-24 text-xs"
                    />
                    {SIZE_SHORTCUTS.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={width === s ? 'default' : 'outline'}
                        className="h-8 text-xs"
                        onClick={() => { setWidth(s); setWidthDraft(String(s)); }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={loop} onCheckedChange={(v) => setLoop(Boolean(v))} />
                  Boucle infinie
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={asMain} onCheckedChange={(v) => setAsMain(Boolean(v))} />
                  Définir comme image principale
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={asHover} onCheckedChange={(v) => setAsHover(Boolean(v))} />
                  Définir comme image de survol
                </label>
              </div>

              <div className="flex items-start gap-4">
                <Button type="button" onClick={generate} disabled={busy || selected.length < 2}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Film className="h-4 w-4 mr-2" />}
                  Générer l'aperçu
                </Button>
                {previewUrl && (
                  <div className="border border-primary/40 p-1">
                    <img src={previewUrl} alt="Aperçu GIF" className="h-32 w-auto" />
                    <p className="text-[10px] text-center text-muted-foreground mt-1">Aperçu animé</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="button" onClick={applyGif} disabled={!previewUrl || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Appliquer le GIF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
