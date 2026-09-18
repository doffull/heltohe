import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, ArrowRight, Ruler } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useProductStock } from '@/hooks/useProductStock';
import { useToast } from '@/hooks/use-toast';
import { getSwatchStyle } from '@/lib/swatch';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * Demande la taille (et la couleur) avant d'ajouter au panier depuis une LISTE.
 *
 * ── Pourquoi ce composant existe ───────────────────────────────────────────
 *
 * Les cartes produit des listes (boutique, accueil, sections éditoriales,
 * « compléter le look », résultats vocaux) appelaient `addItem()` sans `size`
 * ni `color`. L'article arrivait donc en commande avec une taille vide :
 * impossible à décrémenter dans `stock_levels` (dont la clé est
 * `inventory_id + size`), et impossible à préparer sans rappeler la cliente.
 * Seule la fiche produit exigeait une taille — voir `ProductDetail.tsx`.
 *
 * ── ⚠️ Le repli quand le stock n'est pas ventilé par taille ─────────────────
 *
 * `stock_levels` n'est PAS garanti ventilé par taille. Mesuré en production le
 * 18/09/2026 : sur 114 produits, 4 n'ont qu'une seule ligne avec `size = NULL`
 * (Stellar, summit, Steve 2, Middle block) alors qu'ils déclarent des tailles
 * dans `products.sizes`.
 *
 * `useProductStock` range ces lignes sous la clé `'_'`. Traiter « absent de
 * bySize » comme « rupture » rendrait ces produits INACHETABLES — toutes leurs
 * tailles paraîtraient épuisées alors qu'ils ont 50 unités en stock.
 *
 * D'où la règle : on ne bride les tailles QUE si le stock est réellement
 * ventilé (au moins une clé autre que `'_'`). Sinon on laisse choisir, en se
 * rabattant sur `products.stock`. Mieux vaut une taille renseignée sur une
 * quantité approximative que pas de taille du tout.
 *
 * ── ⚠️ Les tailles affichées viennent de `products.sizes`, pas du stock ─────
 *
 * 35 produits sur 114 présentent un écart entre `products.sizes` et les
 * tailles réellement présentes dans `stock_levels` (des XXXL stockés mais non
 * déclarés, des XS déclarés mais jamais stockés). `products.sizes` reste la
 * source de vérité de ce qui est PROPOSÉ ; le stock ne sert qu'à dire ce qui
 * est disponible. Afficher l'union des deux exposerait des tailles que la
 * boutique ne vend pas.
 */

interface QuickAddSizeDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColorChoice {
  key: string;
  label: string;
  hex: string;
  hex2: string | null;
  swatchImage: string | null;
}

/** Couleurs proposées. Les pastilles `filterOnly` ne servent qu'aux filtres. */
function resolveColorChoices(product: Product | null): ColorChoice[] {
  if (!product) return [];

  const fromOptions = (product.colorOptions || []).filter((co) => !co.filterOnly);
  if (fromOptions.length > 0) {
    return fromOptions.map((co) => ({
      key: co.color,
      label: co.label || co.color,
      hex: co.color,
      hex2: co.color2 || null,
      swatchImage: co.swatchImage || null,
    }));
  }

  // Pas de `colorOptions` exploitable : on retombe sur les libellés simples.
  // Si `colorOptions` existe mais n'est que du `filterOnly`, il ne faut RIEN
  // proposer — ces pastilles ne sont pas des variantes achetables.
  if ((product.colorOptions || []).length > 0) return [];

  return (product.colors || []).map((c) => ({
    key: c,
    label: c,
    hex: c.startsWith('#') ? c : '#888888',
    hex2: null,
    swatchImage: null,
  }));
}

export default function QuickAddSizeDialog({ product, open, onOpenChange }: QuickAddSizeDialogProps) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // La requête n'est lancée qu'à l'ouverture : une liste peut afficher 24
  // cartes, on ne veut pas 24 requêtes de stock pour un seul clic.
  const { data: stock, isLoading } = useProductStock(open ? product?.id : null);

  const colorChoices = useMemo(() => resolveColorChoices(product), [product]);

  // Une seule couleur → aucun choix à faire, on la retient d'office.
  useEffect(() => {
    setSize(null);
    setQuantity(1);
    setColor(colorChoices.length === 1 ? colorChoices[0].key : null);
  }, [product?.id, colorChoices]);

  // Mémoïsé : `stock?.bySize || {}` produirait un objet neuf à chaque rendu et
  // invaliderait les `useMemo` qui en dépendent.
  const bySize = useMemo(() => stock?.bySize ?? {}, [stock?.bySize]);

  /** Le stock est-il réellement ventilé par taille ? (cf. en-tête du fichier) */
  const hasSizedStock = useMemo(
    () => Object.keys(bySize).some((k) => k !== '_'),
    [bySize],
  );

  const sizeRows = useMemo(
    () =>
      (product?.sizes || []).map((s) => {
        const qty = bySize[s] ?? 0;
        return {
          size: s,
          qty,
          // Sans ventilation par taille, on ne sait pas : on laisse passer.
          available: hasSizedStock ? qty > 0 : (product?.stock ?? 0) > 0,
        };
      }),
    [product?.sizes, product?.stock, bySize, hasSizedStock],
  );

  const soldOut = !isLoading && sizeRows.length > 0 && sizeRows.every((r) => !r.available);
  const needsColor = colorChoices.length > 1;
  const maxQuantity = useMemo(() => {
    if (!hasSizedStock) return Math.max(1, product?.stock ?? 1);
    const qty = size ? bySize[size] ?? 0 : 0;
    return Math.max(1, qty);
  }, [hasSizedStock, product?.stock, size, bySize]);

  // Un changement de taille peut ramener le plafond sous la quantité choisie.
  useEffect(() => {
    setQuantity((q) => Math.min(q, maxQuantity));
  }, [maxQuantity]);

  const canSubmit = !!product && !!size && (!needsColor || !!color) && !soldOut && !submitting;

  const handleSubmit = async () => {
    if (!product || !size) return;
    setSubmitting(true);
    try {
      await addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        salePrice: product.salePrice,
        image: product.image,
        size,
        color: color || undefined,
        quantity,
      });
      toast({
        title: 'Ajouté au panier',
        description: `${product.name} — taille ${size}${color ? ` · ${colorChoices.find((c) => c.key === color)?.label ?? color}` : ''}`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Ajout impossible',
        description: 'Réessayez dans un instant.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  const unitPrice = product.salePrice ?? product.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="hud-text uppercase tracking-[0.15em] text-base">
            Choisir la taille
          </DialogTitle>
          <DialogDescription className="sr-only">
            Sélectionnez une taille disponible avant d'ajouter {product.name} au panier.
          </DialogDescription>
        </DialogHeader>

        {/* Rappel du produit : on vient d'une liste, la cliente doit pouvoir
            vérifier qu'elle est sur le bon article. */}
        <div className="flex items-center gap-3">
          <img
            src={product.image || '/placeholder.svg'}
            alt={product.name}
            className="h-16 w-16 object-cover chamfer-hud-sm border border-border"
            loading="lazy"
            decoding="async"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{product.name}</p>
            {product.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{product.subtitle}</p>
            )}
            <p className="text-sm font-bold font-mono mt-0.5">{unitPrice.toFixed(2)} €</p>
          </div>
        </div>

        {/* Tailles */}
        <div>
          <p className="text-xs font-bold hud-text uppercase tracking-[0.15em] mb-2">Taille</p>

          {isLoading ? (
            <div className="flex flex-wrap gap-2" aria-busy="true">
              {(product.sizes || []).map((s) => (
                <div key={s} className="h-10 min-w-[48px] px-4 border border-border bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sizeRows.map((row) => {
                const isSelected = size === row.size;
                return (
                  <button
                    key={row.size}
                    type="button"
                    disabled={!row.available}
                    aria-pressed={isSelected}
                    aria-label={
                      row.available
                        ? `Taille ${row.size}`
                        : `Taille ${row.size} — épuisée`
                    }
                    onClick={() => setSize(row.size)}
                    className={cn(
                      'relative min-w-[48px] h-10 px-4 text-sm font-bold uppercase tracking-wider border transition-all',
                      isSelected
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent text-foreground border-border hover:border-foreground',
                      !row.available &&
                        'opacity-40 cursor-not-allowed line-through hover:border-border',
                    )}
                  >
                    {row.size}
                  </button>
                );
              })}
            </div>
          )}

          {/* Stock restant : n'a de sens que ventilé par taille. */}
          {!isLoading && hasSizedStock && size && (bySize[size] ?? 0) > 0 && (bySize[size] ?? 0) <= 5 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
              Plus que {bySize[size]} en stock
            </p>
          )}

          {soldOut && (
            <p className="text-xs text-destructive mt-2 font-medium">
              Toutes les tailles sont épuisées pour le moment.
            </p>
          )}
        </div>

        {/* Couleur — seulement s'il y a un vrai choix à faire */}
        {needsColor && (
          <div>
            <p className="text-xs font-bold hud-text uppercase tracking-[0.15em] mb-2">Couleur</p>
            <div className="flex flex-wrap gap-2">
              {colorChoices.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  aria-pressed={color === c.key}
                  aria-label={c.label}
                  title={c.label}
                  className={cn(
                    'h-9 w-9 rounded-full transition-all',
                    color === c.key
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'ring-1 ring-border hover:ring-foreground/50',
                  )}
                  style={getSwatchStyle({ color: c.hex, color2: c.hex2, swatchImage: c.swatchImage })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quantité */}
        <div>
          <p className="text-xs font-bold hud-text uppercase tracking-[0.15em] mb-2">Quantité</p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Diminuer la quantité"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center font-bold font-mono">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Augmenter la quantité"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 sm:space-x-0">
          <Button
            className="w-full h-12 chamfer-hud-sm uppercase tracking-wide font-bold"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {!size ? 'Sélectionnez une taille' : 'Ajouter au panier'}
          </Button>

          {/* Porte de sortie : guide des tailles, photos, description — tout
              est sur la fiche, et elle seule. */}
          <Button
            variant="ghost"
            className="w-full text-xs uppercase tracking-wider gap-1"
            onClick={() => {
              onOpenChange(false);
              navigate(`/boutique/${product.id}`);
            }}
          >
            <Ruler className="h-3.5 w-3.5" />
            Voir la fiche et le guide des tailles
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
