import { useCallback, useState } from 'react';
import QuickAddSizeDialog from '@/components/product/QuickAddSizeDialog';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types';

/**
 * Ajout au panier depuis une LISTE, avec demande de taille.
 *
 * Toute carte produit d'une liste doit passer par ici plutôt que d'appeler
 * `addItem()` directement : sans `size`, l'article est incommandable
 * proprement (`stock_levels` est ventilé par `inventory_id + size`) et
 * impossible à préparer. Voir `QuickAddSizeDialog` pour le détail des replis.
 *
 * Usage :
 *
 *     const { requestAdd, quickAddDialog } = useQuickAdd();
 *     ...
 *     <Button onClick={() => requestAdd(product)}>Ajouter au panier</Button>
 *     ...
 *     {quickAddDialog}      // une seule fois, à la racine du composant
 *
 * ⚠️ Le `{quickAddDialog}` doit être rendu, sinon le clic n'ouvre rien.
 */
export function useQuickAdd() {
  const [pending, setPending] = useState<Product | null>(null);
  const { addItem } = useCart();
  const { toast } = useToast();

  const requestAdd = useCallback(
    async (product: Product) => {
      // Produit sans tailles déclarées (accessoires, cartes cadeaux…) : rien à
      // demander, on garde l'ajout direct d'avant.
      if (!product.sizes?.length) {
        await addItem({
          productId: product.id,
          name: product.name,
          price: product.price,
          salePrice: product.salePrice,
          image: product.image,
          quantity: 1,
        });
        toast({
          title: 'Ajouté au panier',
          description: `${product.name} a été ajouté`,
        });
        return;
      }

      setPending(product);
    },
    [addItem, toast],
  );

  const quickAddDialog = (
    <QuickAddSizeDialog
      product={pending}
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
    />
  );

  return { requestAdd, quickAddDialog };
}
