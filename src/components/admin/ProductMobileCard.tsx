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
  onEditField: (id: string, field: string, value: unknown) => void;
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
      className={`border-b border-border last:border-0 p-3 flex gap-3 ${selected ? 'bg-primary/5' : ''}`}
    >
      <div className="pt-1">
        <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(product.id)} />
      </div>

      <div className="shrink-0">
        <MainImagePicker product={product} />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p
          className="font-medium text-sm leading-tight break-words cursor-pointer hover:text-primary"
          onClick={() => actions.onEditField(product.id, 'name', product.name)}
        >
          {product.name}
        </p>
        {product.subtitle && (
          <p className="text-[11px] text-muted-foreground leading-tight break-words">{product.subtitle}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{product.sku}</code>
          <span className="text-muted-foreground">{product.category}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className="font-bold cursor-pointer"
            onClick={() => actions.onEditField(product.id, 'price', product.price)}
          >
            {product.price}€
          </span>
          {product.salePrice ? (
            <span className="font-bold text-primary">{product.salePrice}€</span>
          ) : null}
          <span className={`font-bold ${stockColor}`}>Stock {product.stock}</span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => actions.onToggleActive(product)}
            className={`text-[10px] px-2 py-1 rounded font-bold ${isActive ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}
          >
            {isActive ? 'ACTIF' : 'INACTIF'}
          </button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs flex-1"
            onClick={() => actions.onEdit(product)}
          >
            <Pencil className="h-3 w-3 mr-1" />Modifier
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
