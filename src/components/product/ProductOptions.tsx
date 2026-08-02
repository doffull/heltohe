import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart, Heart, Share2, Plus, Minus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getSwatchStyle } from '@/lib/swatch';
import { SparkleBurst } from '@/components/ui/sparkle-burst';
import { EditableProductArrayField } from '@/components/visual-editor/EditableProductArrayField';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';
import { useUpdateProduct } from '@/hooks/useProducts';
import { toast } from 'sonner';



interface ProductOptionsProps {
  product: Product;
  selectedSize: string | null;
  selectedColor: string | null;
  quantity: number;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Basic color name to hex mapping for fallback
const COLOR_MAP: Record<string, string> = {
  noir: '#000000', black: '#000000',
  blanc: '#FFFFFF', white: '#FFFFFF',
  rouge: '#DC2626', red: '#DC2626',
  bleu: '#2563EB', blue: '#2563EB',
  vert: '#16A34A', green: '#16A34A',
  gris: '#6B7280', gray: '#6B7280', grey: '#6B7280',
  jaune: '#EAB308', yellow: '#EAB308',
  orange: '#EA580C',
  rose: '#EC4899', pink: '#EC4899',
  violet: '#7C3AED', purple: '#7C3AED',
  marron: '#92400E', brown: '#92400E',
  beige: '#D2B48C',
};

function resolveColorHex(colorName: string): string {
  // If it's already a hex color, return it
  if (colorName.startsWith('#')) return colorName;
  return COLOR_MAP[colorName.toLowerCase()] || '#888888';
}

export default function ProductOptions({
  product,
  selectedSize,
  selectedColor,
  quantity,
  onSizeChange,
  onColorChange,
  onQuantityChange,
  onAddToCart,
}: ProductOptionsProps) {
  const { designSettings } = useApp();
  const displayMode = designSettings.colorDisplayMode || 'swatches';
  const { isOpen: editorOpen } = useVisualEditor();
  const { isAdmin } = useAuth();
  const updateProduct = useUpdateProduct();
  const editMode = editorOpen && isAdmin;

  // Compteurs pour déclencher les bursts de paillettes
  const [sizeBurst, setSizeBurst] = useState(0);
  const [cartBurst, setCartBurst] = useState(0);

  function handleSizeChange(size: string) {
    onSizeChange(size);
    setSizeBurst((n) => n + 1);
  }

  function handleAddToCart() {
    setCartBurst((n) => n + 1);
    onAddToCart();
  }


  async function addSize() {
    const label = window.prompt('Nouvelle taille (ex: M, XL, 42)…');
    if (!label) return;
    const next = [...(product.sizes || []), label.trim()];
    try {
      await updateProduct.mutateAsync({ id: product.id, sizes: next } as any);
      toast.success('✓ Taille ajoutée');
    } catch (e: any) { toast.error(`Erreur: ${e?.message || 'échec'}`); }
  }
  async function renameColor(index: number, newLabel: string) {
    const list = [...(product.colorOptions || [])];
    if (!list[index]) return;
    list[index] = { ...list[index], label: newLabel };
    await updateProduct.mutateAsync({ id: product.id, colorOptions: list } as any);
  }


  // Build color items from colorOptions or colors
  const colorItems = product.colorOptions?.length
    ? product.colorOptions.map(co => ({
        key: co.color,
        hex: co.color,
        hex2: co.color2 || null,
        swatchImage: co.swatchImage || null,
        label: co.label,
        image: co.image,
      }))
    : product.colors?.map(c => ({
        key: c,
        hex: resolveColorHex(c),
        hex2: null as string | null,
        swatchImage: null as string | null,
        label: c,
        image: undefined,
      })) || [];

  return (
    <>
      {/* Size Selection */}
      {((product.sizes && product.sizes.length > 0) || editMode) && (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold hud-text uppercase tracking-[0.15em]">
              Taille
            </label>
            {editMode && (
              <button
                type="button"
                onClick={addSize}
                className="text-[10px] font-bold uppercase tracking-wider border border-dashed border-primary/60 text-primary px-2 py-1 rounded hover:bg-primary/10"
                title="Ajouter une taille"
              >
                + Taille
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(product.sizes || []).map((size, sIdx) => {
              const isSelected = selectedSize === size;
              return (
                <div key={`${size}-${sIdx}`} className="relative">
                  <SparkleBurst trigger={isSelected ? sizeBurst : 0} count={16} radius={52} />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={isSelected ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35 }}
                    onClick={() => handleSizeChange(size)}
                    aria-pressed={isSelected}
                    className={
                      'relative min-w-[48px] h-10 px-4 text-sm font-bold uppercase tracking-wider border transition-all ' +
                      (isSelected
                        ? 'bg-foreground text-background border-foreground ring-2 ring-yellow-400 ring-offset-2 ring-offset-background shadow-[0_0_14px_rgba(250,204,21,0.45)]'
                        : 'bg-transparent text-foreground border-border hover:border-foreground')
                    }
                  >
                    <EditableProductArrayField
                      product={product}
                      field="sizes"
                      index={sIdx}
                      as="span"
                      placeholder="Taille"
                    >
                      {size}
                    </EditableProductArrayField>
                  </motion.button>
                </div>
              );
            })}
          </div>

          {/* Confirmation "satisfaisante" de la taille choisie */}
          <AnimatePresence>
            {selectedSize && (
              <motion.div
                key={selectedSize}
                className="mt-3 inline-flex items-center gap-2 chamfer-hud-sm border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5"
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              >
                <motion.span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.05, type: 'spring', stiffness: 400 }}
                >
                  <Check className="h-3 w-3 text-white" />
                </motion.span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Taille {selectedSize} sélectionnée
                </span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}



      {/* Color Selection */}
      {colorItems.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
          <label className="text-sm font-bold hud-text mb-3 block uppercase tracking-[0.15em]">
            Couleur
          </label>
          <div className="flex flex-wrap gap-3">
            {colorItems.map((item, cIdx) => (
              <div key={item.key} className="flex flex-col items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onColorChange(item.key)}
                      className={`relative rounded-full transition-all ${
                        displayMode === 'images' && item.image
                          ? 'w-12 h-12 overflow-hidden'
                          : 'w-10 h-10'
                      } ${
                        selectedColor === item.key
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'ring-1 ring-border hover:ring-foreground/50'
                      }`}
                      style={
                        displayMode === 'images' && item.image
                          ? undefined
                          : getSwatchStyle({ color: item.hex, color2: item.hex2, swatchImage: item.swatchImage })
                      }
                    >
                      {displayMode === 'images' && item.image ? (
                        <img src={item.image} alt={item.label} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        selectedColor === item.key && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold" style={{ color: isLightColor(item.hex) ? '#000' : '#fff' }}>
                              ✓
                            </span>
                          </span>
                        )
                      )}
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
                {editMode && product.colorOptions && product.colorOptions[cIdx] && (
                  <EditableProductArrayField
                    product={product}
                    field="colorOptions"
                    index={cIdx}
                    as="span"
                    className="text-[10px] text-muted-foreground uppercase tracking-wider"
                    placeholder="Nom"
                    allowDelete={false}
                    onCommit={async (raw) => renameColor(cIdx, raw)}
                  >
                    {item.label}
                  </EditableProductArrayField>
                )}
              </div>
            ))}
          </div>
        </motion.div>

      )}

      {/* Quantity */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <label className="text-sm font-bold hud-text mb-3 block uppercase tracking-[0.15em]">
          Quantité
        </label>
        <div className="flex items-center gap-3">
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </motion.div>
          <motion.span
            key={quantity}
            className="w-12 text-center font-bold text-lg font-mono"
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {quantity}
          </motion.span>
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onQuantityChange(Math.min(product.stock, quantity + 1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Add to Cart */}
      <motion.div
        className="flex flex-wrap items-stretch gap-3"
        {...fadeUp}
        transition={{ delay: 0.45 }}
      >
        <motion.div className="relative flex-1 min-w-[190px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <SparkleBurst trigger={cartBurst} count={22} radius={80} />
          <Button
            className="w-full h-14 px-3 text-sm lg:text-base chamfer-hud-sm uppercase tracking-wide font-bold whitespace-nowrap"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Ajouter au panier
          </Button>
        </motion.div>

        <div className="flex gap-3">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="outline" size="icon" className="h-14 w-14 chamfer-hud-sm" aria-label="Ajouter aux favoris">
              <Heart className="h-5 w-5 text-primary" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="outline" size="icon" className="h-14 w-14 chamfer-hud-sm" aria-label="Partager">
              <Share2 className="h-5 w-5 text-primary" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

    </>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
