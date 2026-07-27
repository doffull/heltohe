import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateProduct } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { Upload, Check, X, ImageIcon, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}

type Match = {
  file: File;
  previewUrl: string;
  product: Product | null;
  matchedBy: 'folder' | 'sku' | 'name' | 'none';
  index: number; // ordering within the product's gallery
  folder: string | null;
};

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif|heic)$/i;

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
}

function parseFileName(name: string): { base: string; index: number } {
  const stripped = name.replace(IMG_EXT, '').replace(/[_\s]+/g, '-');
  const m = stripped.match(/^(.*?)-(\d+)$/);
  if (m) return { base: m[1], index: parseInt(m[2], 10) };
  return { base: stripped, index: 0 };
}

function getFolderName(file: File): string | null {
  const rel = (file as any).webkitRelativePath as string | undefined;
  if (!rel) return null;
  const parts = rel.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  // Use the deepest folder (closest to the file) — this is the product folder
  return parts[parts.length - 2];
}

async function uploadToStorage(file: File): Promise<string | null> {
  const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const fileName = `products/bulk/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from('media').upload(fileName, file, {
    cacheControl: '31536000', upsert: false, contentType: file.type || undefined,
  });
  if (error) return null;
  const { data } = supabase.storage.from('media').getPublicUrl(fileName);
  return data.publicUrl;
}

export function BulkProductImagesDialog({ open, onOpenChange, products }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [mode, setMode] = useState<'cover' | 'gallery' | 'auto'>('auto');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const { toast } = useToast();
  const updateProduct = useUpdateProduct();

  const productIndex = useMemo(() => {
    const bySku = new Map<string, Product>();
    const byName = new Map<string, Product>();
    products.forEach(p => {
      if (p.sku) bySku.set(slugify(p.sku), p);
      byName.set(slugify(p.name), p);
    });
    return { bySku, byName };
  }, [products]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr: Match[] = Array.from(files)
      .filter(f => IMG_EXT.test(f.name))
      .map(f => {
        const { base, index } = parseFileName(f.name);
        const key = slugify(base);
        let product: Product | null = productIndex.bySku.get(key) ?? null;
        let matchedBy: Match['matchedBy'] = product ? 'sku' : 'none';
        if (!product) {
          // Try name variants: full slug or substring match
          product = productIndex.byName.get(key) ?? null;
          if (product) matchedBy = 'name';
          else {
            // fallback substring
            for (const [nSlug, p] of productIndex.byName.entries()) {
              if (key.includes(nSlug) || nSlug.includes(key)) { product = p; matchedBy = 'name'; break; }
            }
          }
        }
        return { file: f, previewUrl: URL.createObjectURL(f), product, matchedBy, index };
      });
    setMatches(arr);
  };

  const setMatchProduct = (i: number, productId: string) => {
    setMatches(prev => prev.map((m, idx) => {
      if (idx !== i) return m;
      const p = products.find(pp => pp.id === productId) ?? null;
      return { ...m, product: p, matchedBy: p ? 'name' : 'none' };
    }));
  };

  const removeMatch = (i: number) => {
    setMatches(prev => prev.filter((_, idx) => idx !== i));
  };

  const matched = matches.filter(m => m.product);
  const unmatched = matches.filter(m => !m.product);

  const runImport = async () => {
    if (matched.length === 0) return;
    setProgress({ current: 0, total: matched.length });

    // Group by product
    const byProduct = new Map<string, Match[]>();
    matched.forEach(m => {
      const arr = byProduct.get(m.product!.id) ?? [];
      arr.push(m);
      byProduct.set(m.product!.id, arr);
    });

    let done = 0;
    let ok = 0;
    for (const [productId, items] of byProduct.entries()) {
      const product = products.find(p => p.id === productId)!;
      // Sort by index parsed from filename
      items.sort((a, b) => a.index - b.index);
      const urls: string[] = [];
      for (const m of items) {
        const url = await uploadToStorage(m.file);
        if (url) urls.push(url);
        done++;
        setProgress({ current: done, total: matched.length });
      }
      if (urls.length === 0) continue;

      try {
        if (mode === 'cover') {
          await updateProduct.mutateAsync({ id: productId, image: urls[0] });
        } else if (mode === 'gallery') {
          const existing = product.galleryImages || [];
          await updateProduct.mutateAsync({
            id: productId,
            galleryImages: Array.from(new Set([...existing, ...urls])).slice(0, 10),
          });
        } else {
          // auto: first is cover if missing (or matches "-0"/no index), rest go into gallery
          const hasCover = product.image && !product.image.includes('placeholder');
          const [first, ...rest] = urls;
          const updates: any = { id: productId };
          if (!hasCover) {
            updates.image = first;
            if (rest.length) updates.galleryImages = Array.from(new Set([...(product.galleryImages || []), ...rest])).slice(0, 10);
          } else {
            updates.galleryImages = Array.from(new Set([...(product.galleryImages || []), ...urls])).slice(0, 10);
          }
          await updateProduct.mutateAsync(updates);
        }
        ok++;
      } catch {
        // skip
      }
    }

    setProgress(null);
    toast({ title: `Import terminé : ${ok}/${byProduct.size} produit(s) mis à jour` });
    setMatches([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des images produits en masse</DialogTitle>
          <DialogDescription>
            Nommez vos fichiers avec le SKU ou le nom du produit (ex : <code>IMPERIAL.jpg</code>, <code>doudoune-hiver-2.jpg</code>).
            La correspondance est automatique. Ajoutez <code>-2</code>, <code>-3</code>… pour ordonner la galerie.
          </DialogDescription>
        </DialogHeader>

        {matches.length === 0 ? (
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 cursor-pointer hover:bg-muted/30 transition">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Cliquez ou glissez plusieurs images ici</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · aucune limite pratique de nombre</p>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Détectés</p>
                <p className="text-2xl font-bold">{matches.length}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Reconnus</p>
                <p className="text-2xl font-bold text-green-500">{matched.length}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Non reconnus</p>
                <p className="text-2xl font-bold text-amber-500">{unmatched.length}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Mode d'affectation</Label>
              <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)} className="grid gap-2 sm:grid-cols-3">
                <label className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                  <RadioGroupItem value="auto" /> <span className="text-xs">Auto (cover + galerie)</span>
                </label>
                <label className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                  <RadioGroupItem value="cover" /> <span className="text-xs">Image principale</span>
                </label>
                <label className="flex items-center gap-2 border rounded p-2 cursor-pointer">
                  <RadioGroupItem value="gallery" /> <span className="text-xs">Galerie uniquement</span>
                </label>
              </RadioGroup>
            </div>

            <div className="max-h-[40vh] overflow-y-auto space-y-1.5 border rounded p-2">
              {matches.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <img src={m.previewUrl} alt="" className="w-10 h-10 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-mono">{m.file.name}</p>
                    {m.product ? (
                      <p className="text-green-500 truncate flex items-center gap-1">
                        <Check className="h-3 w-3" /> {m.product.name} <span className="text-muted-foreground">({m.matchedBy})</span>
                      </p>
                    ) : (
                      <select
                        className="text-xs bg-background border rounded px-1 py-0.5 w-full mt-0.5"
                        onChange={(e) => e.target.value && setMatchProduct(i, e.target.value)}
                        defaultValue=""
                      >
                        <option value="">— Non reconnu, affecter à… —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    )}
                  </div>
                  <button onClick={() => removeMatch(i)} className="text-muted-foreground hover:text-destructive p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {progress && (
              <div className="space-y-1">
                <Progress value={(progress.current / progress.total) * 100} />
                <p className="text-xs text-muted-foreground">Téléversement {progress.current}/{progress.total}…</p>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          {matches.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMatches([])} disabled={!!progress}>Recommencer</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!progress}>Annuler</Button>
          <Button onClick={runImport} disabled={matched.length === 0 || !!progress}>
            {progress ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Import…</> : <><ImageIcon className="h-3.5 w-3.5 mr-1.5" />Importer {matched.length} image(s)</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
