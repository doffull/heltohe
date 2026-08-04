import { useState } from 'react';
import { Check, ImageIcon, Loader2, Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUpdateProduct } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Vignette produit cliquable : ouvre la liste des visuels du produit.
 * Un clic sur un visuel le définit comme image principale (l'ancienne
 * principale reste dans la galerie).
 */
export function MainImagePicker({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();

  const gallery = (product.galleryImages || []).filter(Boolean);
  const all = Array.from(new Set([product.image, ...gallery].filter(Boolean))) as string[];

  async function setMain(url: string) {
    if (url === product.image) {
      setOpen(false);
      return;
    }
    try {
      setBusy(url);
      const nextGallery = Array.from(
        new Set([url, ...all.filter((u) => u !== url)]),
      );
      await updateProduct.mutateAsync({
        id: product.id,
        image: url,
        galleryImages: nextGallery,
      });
      toast({ title: 'Image principale mise à jour' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Cliquer pour choisir l'image principale"
          className="group relative w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0 border border-transparent hover:border-primary"
        >
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 m-auto text-muted-foreground" />
          )}
          <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-background/70">
            <Star className="h-4 w-4 text-primary" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="text-xs font-bold uppercase tracking-wider mb-2">Image principale</p>
        {all.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun visuel pour ce produit.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
            {all.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setMain(url)}
                className={cn(
                  'relative aspect-square rounded overflow-hidden border-2 transition-all',
                  url === product.image ? 'border-primary' : 'border-border hover:border-primary/60',
                )}
                title={url === product.image ? 'Image principale actuelle' : 'Définir comme principale'}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                {url === product.image && (
                  <span className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-0.5">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {busy === url && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
