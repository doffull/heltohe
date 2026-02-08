import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Share2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';

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
  return (
    <>
      {/* Size Selection */}
      {product.sizes && product.sizes.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <label className="text-sm font-bold hud-text mb-3 block uppercase tracking-[0.15em]">
            Taille
          </label>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <motion.div key={size} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={selectedSize === size ? 'default' : 'outline'}
                  className="min-w-[48px] transition-all"
                  onClick={() => onSizeChange(size)}
                >
                  {size}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Color Selection */}
      {product.colors && product.colors.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
          <label className="text-sm font-bold hud-text mb-3 block uppercase tracking-[0.15em]">
            Couleur
          </label>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((color) => (
              <motion.div key={color} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={selectedColor === color ? 'default' : 'outline'}
                  onClick={() => onColorChange(color)}
                >
                  {color}
                </Button>
              </motion.div>
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
        className="flex gap-4"
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
      </motion.div>
    </>
  );
}
