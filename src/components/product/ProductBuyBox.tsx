import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ruler, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import ProductOptions from './ProductOptions';
import ColorVariantsStrip from './ColorVariantsStrip';
import SizeGuideModal from './SizeGuideModal';
import { SizeGuideAIModal } from './SizeGuideAIModal';
import VirtualTryOnButton from './VirtualTryOnButton';
import ProductDeliveryEstimate from './ProductDeliveryEstimate';
import { PayPalMessaging } from '@/components/payments/PayPalMessaging';

import type { SizeCategory } from '@/lib/sizeCharts';
import { cn } from '@/lib/utils';

interface ProductBuyBoxProps {
  product: Product;
  selectedSize: string | null;
  selectedColor: string | null;
  quantity: number;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
  onQuantityChange: (qty: number) => void;
  onAddToCart: () => void;
  className?: string;
}

function guessCategory(product: Product): SizeCategory {
  const c = (product.category || '').toLowerCase();
  if (c.includes('femme')) return 'femme';
  if (c.includes('enfant') || c.includes('kid')) return 'enfant';
  return 'homme';
}

/**
 * Bloc achat : variations, tailles (+ guides des tailles), quantité,
 * ajout au panier, essayage virtuel et coloris du même modèle.
 */
export default function ProductBuyBox({
  product,
  selectedSize,
  selectedColor,
  quantity,
  onSizeChange,
  onColorChange,
  onQuantityChange,
  onAddToCart,
  className,
}: ProductBuyBoxProps) {
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [aiGuideOpen, setAiGuideOpen] = useState(false);
  const hasSizes = Boolean(product.sizes?.length);

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <ProductOptions
        product={product}
        selectedSize={selectedSize}
        selectedColor={selectedColor}
        quantity={quantity}
        onSizeChange={onSizeChange}
        onColorChange={onColorChange}
        onQuantityChange={onQuantityChange}
        onAddToCart={onAddToCart}
      />

      {/* Guides des tailles — juste à côté des tailles / variations */}
      {hasSizes && (
        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button variant="outline" size="sm" className="gap-2 chamfer-hud-sm flex-1 min-w-[150px]" onClick={() => setSizeGuideOpen(true)}>
            <Ruler className="h-3.5 w-3.5 text-primary" />
            Guide des tailles
          </Button>
          <Button variant="outline" size="sm" className="gap-2 chamfer-hud-sm flex-1 min-w-[150px]" onClick={() => setAiGuideOpen(true)}>
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Trouver ma taille
          </Button>
        </motion.div>
      )}

      {/* Estimation de livraison */}
      <ProductDeliveryEstimate />

      {/* PayPal — paiement en 3x/4x sans frais */}
      <PayPalMessaging
        amount={(product.salePrice ?? product.price) * Math.max(1, quantity)}
        placement="product"
      />


      {/* Essayage virtuel — toujours visible */}
      <VirtualTryOnButton product={product} selectedColor={selectedColor} selectedSize={selectedSize} variant="inline" className="w-full" />

      {/* Autres coloris du même modèle */}
      <ColorVariantsStrip product={product} />

      <SizeGuideModal open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />
      <SizeGuideAIModal
        open={aiGuideOpen}
        onOpenChange={setAiGuideOpen}
        productName={product.name}
        availableSizes={product.sizes}
        defaultCategory={guessCategory(product)}
        onSizeSelected={onSizeChange}
      />
    </div>
  );
}
