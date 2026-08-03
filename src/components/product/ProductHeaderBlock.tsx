import { motion } from 'framer-motion';
import { Sparkles, User, Tag, PackageCheck, AlertTriangle } from 'lucide-react';
import { Product } from '@/types';
import { EditableProductField } from '@/components/visual-editor/EditableProductField';
import { useAuth } from '@/context/AuthContext';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import ProductRatingRow from './ProductRatingRow';
import { cn } from '@/lib/utils';

interface ProductHeaderBlockProps {
  product: Product;
  isNew?: boolean;
  className?: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Bloc identité : catégorie, SKU, titre, sous-titre, prix, stock, mannequin.
 * Placé en tout premier sur mobile (au-dessus de la galerie).
 */
export default function ProductHeaderBlock({ product, isNew, className }: ProductHeaderBlockProps) {
  const { isAdmin } = useAuth();
  const { isOpen: editorOpen } = useVisualEditor();
  const editing = isAdmin && editorOpen;
  const hasModel = Boolean(product.modelHeight || product.modelSizeWorn || product.modelName);
  const discount = product.salePrice
    ? Math.round((1 - product.salePrice / product.price) * 100)
    : 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Catégorie & SKU */}
      <motion.div className="flex items-center justify-between gap-3" {...fadeUp} transition={{ delay: 0.05 }}>
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-primary uppercase tracking-[0.2em] font-mono">
          <Tag className="h-3 w-3" />
          {product.category}
        </span>
        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">SKU: {product.sku}</span>
      </motion.div>

      {/* Titre */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <EditableProductField
            product={product}
            field="name"
            as="h1"
            className="text-2xl sm:text-3xl lg:text-4xl font-bold hud-text uppercase tracking-wider leading-tight"
          />
          {isNew && (
            <motion.span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-xs font-bold hud-text"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 260 }}
            >
              <Sparkles className="h-3 w-3" />
              IA
            </motion.span>
          )}
        </div>
        <EditableProductField
          product={product}
          field="subtitle"
          as="p"
          className="text-sm sm:text-lg uppercase text-muted-foreground mt-1 tracking-wide"
          placeholder="Sous-titre du produit…"
        />
      </motion.div>

      {/* Note + avis + partage */}
      <motion.div {...fadeUp} transition={{ delay: 0.12 }}>
        <ProductRatingRow productId={product.id} productName={product.name} />
      </motion.div>


      {/* Prix + stock */}
      <motion.div className="flex flex-wrap items-center gap-x-4 gap-y-2" {...fadeUp} transition={{ delay: 0.15 }}>
        {product.salePrice ? (
          <>
            <EditableProductField
              product={product}
              field="salePrice"
              as="span"
              className="text-3xl lg:text-4xl font-bold text-primary"
              parse={(v) => (v === '' ? null : Number(v))}
              format={(v) => (v == null ? '' : String(v))}
            >
              {product.salePrice}€
            </EditableProductField>
            <EditableProductField
              product={product}
              field="price"
              as="span"
              className="text-xl line-through text-muted-foreground"
              parse={(v) => Number(v)}
              format={(v) => String(v ?? '')}
            >
              {product.price}€
            </EditableProductField>
            <motion.span
              className="bg-destructive text-destructive-foreground px-2.5 py-1 text-xs font-bold chamfer-hud-sm"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              -{discount}%
            </motion.span>
          </>
        ) : (
          <EditableProductField
            product={product}
            field="price"
            as="span"
            className="text-3xl lg:text-4xl font-bold"
            parse={(v) => Number(v)}
            format={(v) => String(v ?? '')}
          >
            {product.price}€
          </EditableProductField>
        )}

        {/* Stock */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 chamfer-hud-sm border',
            product.stock > 0
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-destructive/40 bg-destructive/10 text-destructive'
          )}
        >
          {product.stock > 0 ? <PackageCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {product.stock > 0 ? (
            <>
              {product.stock > 10 ? 'En stock' : 'Plus que'}
              {product.stock <= 10 && (
                <EditableProductField
                  product={product}
                  field="stock"
                  as="span"
                  className="font-bold"
                  parse={(v) => Math.max(0, parseInt(v) || 0)}
                  format={(v) => String(v ?? 0)}
                >
                  {product.stock}
                </EditableProductField>
              )}
              {product.stock <= 10 && ' pièces'}
            </>
          ) : (
            'Rupture'
          )}
        </span>
      </motion.div>

      {/* Mannequin */}
      {(hasModel || editing) && (
        <motion.div
          className="flex items-center gap-2 chamfer-hud-sm border border-border/60 bg-muted/40 px-3 py-2 text-xs"
          {...fadeUp}
          transition={{ delay: 0.2 }}
        >
          <User className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">
            <EditableProductField product={product} field="modelName" as="span" className="font-semibold text-foreground" placeholder="Mannequin" />
            {' mesure '}
            <EditableProductField product={product} field="modelHeight" as="span" className="font-semibold text-foreground" placeholder="—" />
            {' et porte la taille '}
            <EditableProductField product={product} field="modelSizeWorn" as="span" className="font-semibold text-foreground" placeholder="—" />
          </span>
        </motion.div>
      )}
    </div>
  );
}
