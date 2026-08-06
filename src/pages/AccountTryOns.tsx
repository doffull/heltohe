import { Link } from 'react-router-dom';
import { Heart, Loader2, ShoppingBag, Trash2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTryOnLooks, useDeleteTryOnLook } from '@/hooks/useTryOnLooks';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/seo/SeoHead';

export default function AccountTryOns() {
  const { data: looks = [], isLoading } = useTryOnLooks();
  const del = useDeleteTryOnLook();
  const { addItem } = useCart();
  const { toast } = useToast();

  const addLook = async (items: any[]) => {
    for (const it of items) {
      await addItem({
        productId: it.productId,
        name: it.name,
        price: it.price,
        salePrice: it.salePrice ?? undefined,
        image: it.image,
        size: it.size || undefined,
        color: it.color || undefined,
        quantity: 1,
      });
    }
    toast({ title: 'Look ajouté au panier', description: `${items.length} article(s) ajouté(s).` });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <SeoHead title="Mes essais virtuels | Helvetica Mountain Pioneers" description="Retrouvez vos essais sur mannequin enregistrés et ajoutez vos looks au panier." />

      <Link to="/compte" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Mon compte
      </Link>

      <h1 className="text-2xl font-bold hud-text uppercase tracking-wider flex items-center gap-2 mb-6">
        <Heart className="h-6 w-6 text-primary" /> Mes essais virtuels
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : looks.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-bold text-sm">Aucun essai enregistré</p>
          <p className="text-xs text-muted-foreground mt-1">
            Essayez un produit sur un mannequin depuis une fiche produit, puis enregistrez le look.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {looks.map((look) => (
            <div key={look.id} className="border border-border bg-card/40 overflow-hidden">
              <div className="aspect-[3/4] bg-muted/30 overflow-hidden">
                {look.resultImage ? (
                  <img src={look.resultImage} alt={look.title || 'Essai'} className="w-full h-full object-contain" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Aucun rendu</div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-bold uppercase tracking-wider truncate">{look.title || 'Essai'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {look.items.length} article(s) · {new Date(look.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {look.items.map((it) => (
                    <img key={it.productId} src={it.image} alt={it.name} className="h-8 w-8 object-cover border border-border" />
                  ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" className="h-7 gap-1 text-[11px] flex-1" onClick={() => addLook(look.items)}>
                    <ShoppingBag className="h-3 w-3" /> Panier
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-7 text-destructive"
                    onClick={() => del.mutate(look.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
