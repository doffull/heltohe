import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal, Pencil, Trash2, Copy, Boxes, Layers2,
} from 'lucide-react';
import { MainImagePicker } from '@/components/admin/MainImagePicker';

export interface ProductMobileCardActions {
  onEdit: (p: Product) => void;
  onStock: (p: Product) => void;
  onVariantStock: (p: Product) => void;
  onDuplicate: (p: Product) => void;
  onSplit: (p: Product) => void;
  onDelete: (id: string) => void;
  onToggleActive: (p: Product) => void;
}

/**
 * Vue mobile de la liste produits — cartes empilées, aucun défilement horizontal.
 * Les données et mutations restent gérées par AdminProducts.
 */
export function ProductMobileCard({
  product,
  selected,
  onToggleSelect,
  actions,
}: {
  product: Product;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  actions: ProductMobileCardActions;
}) {
  const isActive = (product as any).isActive ?? true;
  const stockColor =
    product.stock === 0 ? 'text-destructive' : product.stock <= 5 ? 'text-yellow-500' : 'text-green-400';

  return (
    <div
      className={`border-b border-border last:border-0 py-3 pl-2 pr-2 flex gap-1.5 ${selected ? 'bg-primary/5' : ''}`}
    >
      {/* Sélection — toute la colonne gauche est tactile */}
      <button
        type="button"
        aria-label={selected ? `Désélectionner ${product.name}` : `Sélectionner ${product.name}`}
        aria-pressed={selected}
        onClick={() => onToggleSelect(product.id)}
        className="admin-tap -m-1 self-start rounded-md active:bg-primary/10"
      >
        <Checkbox
          checked={selected}
          tabIndex={-1}
          className="pointer-events-none"
          onCheckedChange={() => onToggleSelect(product.id)}
        />
      </button>

      <div className="shrink-0">
        <MainImagePicker product={product} />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <button
          type="button"
          className="block w-full text-left font-medium text-sm leading-tight break-words py-1 hover:text-primary active:text-primary"
          onClick={() => actions.onEdit(product)}
        >
          {product.name}
        </button>
        {product.subtitle && (
          <p className="text-[11px] text-muted-foreground leading-tight break-words">{product.subtitle}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{product.sku}</code>
          <span className="text-muted-foreground">{product.category}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-bold">{product.price}€</span>
          {product.salePrice ? (
            <span className="font-bold text-primary">{product.salePrice}€</span>
          ) : null}
          <span className={`font-bold ${stockColor}`}>Stock {product.stock}</span>
        </div>

        <div className="flex items-center gap-1.5 pt-1.5">
          <button
            type="button"
            aria-label={isActive ? 'Désactiver le produit' : 'Activer le produit'}
            onClick={() => actions.onToggleActive(product)}
            className={`admin-tap px-2 text-[10px] rounded font-bold ${isActive ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}
          >
            {isActive ? 'ACTIF' : 'INACTIF'}
          </button>
          <Button
            variant="outline"
            className="h-11 flex-1 min-w-0 text-xs px-2"
            onClick={() => actions.onEdit(product)}
          >
            <Pencil className="h-4 w-4 mr-1.5" />Modifier
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Supprimer ${product.name}`}
            className="h-11 w-10 shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => actions.onDelete(product.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Plus d'actions" className="h-11 w-10 shrink-0">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuItem onClick={() => actions.onStock(product)}>
                <Boxes className="h-4 w-4 mr-2" />Gérer le stock
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onVariantStock(product)}>
                <Layers2 className="h-4 w-4 mr-2" />Stock par taille/couleur
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onDuplicate(product)}>
                <Copy className="h-4 w-4 mr-2" />Dupliquer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onSplit(product)}
                disabled={((product.colorOptions?.length || product.colors?.length || 0) < 2)}
              >
                <Layers2 className="h-4 w-4 mr-2" />Éclater par couleur
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onDelete(product.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default ProductMobileCard;
