import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Share2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

  // Build color items from colorOptions or colors
  const colorItems = product.colorOptions?.length
    ? product.colorOptions.map(co => ({
        key: co.color,
        hex: co.color,
        label: co.label,
        image: co.image,
      }))
    : product.colors?.map(c => ({
        key: c,
        hex: resolveColorHex(c),
        label: c,
        image: undefined,
      })) || [];

  return (
    <>
      {/* Size Selection */}
      {product.sizes && product.sizes.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold hud-text uppercase tracking-[0.15em]">
              Taille
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <motion.button
                  key={size}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSizeChange(size)}
                  aria-pressed={isSelected}
                  className={
                    'min-w-[48px] h-10 px-4 text-sm font-bold uppercase tracking-wider border transition-all ' +
                    (isSelected
                      ? 'bg-foreground text-background border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background'
                      : 'bg-transparent text-foreground border-border hover:border-foreground')
                  }
                >
                  {size}
                </motion.button>
              );
            })}
          </div>

        </motion.div>
      )}

      {/* Color Selection */}
      {colorItems.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
          <label className="text-sm font-bold hud-text mb-3 block uppercase tracking-[0.15em]">
            Couleur
          </label>
          <div className="flex flex-wrap gap-3">
            {colorItems.map((item) => (
              <Tooltip key={item.key}>
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
                        : { backgroundColor: item.hex }
                    }
                  >
                    {displayMode === 'images' && item.image ? (
                      <img
                        src={item.image}
                        alt={item.label}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      /* Inner check mark for light colors */
                      selectedColor === item.key && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span
                            className="text-xs font-bold"
                            style={{
                              color: isLightColor(item.hex) ? '#000' : '#fff',
                            }}
                          >
                            ✓
                          </span>
                        </span>
                      )
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
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
        className="flex flex-col sm:flex-row gap-4"
        {...fadeUp}
        transition={{ delay: 0.45 }}
      >
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            className="w-full h-14 text-lg chamfer-hud-sm uppercase tracking-wider font-bold"
            onClick={onAddToCart}
            disabled={product.stock === 0}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Ajouter au panier
          </Button>
        </motion.div>
        <div className="flex gap-4 sm:gap-4">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="outline" size="icon" className="h-14 w-14">
              <Heart className="h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="outline" size="icon" className="h-14 w-14">
              <Share2 className="h-5 w-5" />
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
