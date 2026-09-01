import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/context/CurrencyContext';

interface MobileBuyBarProps {
  product: Product;
  selectedSize: string | null;
  onAddToCart: () => void;
  /** Élément observé : la barre apparaît quand il sort de l'écran. */
  anchorRef: React.RefObject<HTMLElement>;
}

/** Barre d'achat collante mobile : prix + taille + ajout au panier. */
export default function MobileBuyBar({ product, selectedSize, onAddToCart, anchorRef }: MobileBuyBarProps) {
  const [visible, setVisible] = useState(false);
  const { format } = useCurrency();

  useEffect(() => {
    const el = anchorRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorRef]);

  const price = product.salePrice ?? product.price;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-3 py-2.5"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {selectedSize ? `Taille ${selectedSize}` : 'Choisir une taille'}
              </p>
              <p className="text-lg font-bold leading-none">
                {format(price)}
                {product.salePrice && (
                  <span className="ml-2 text-xs line-through text-muted-foreground font-normal">{format(product.price)}</span>
                )}
              </p>
            </div>
            <Button
              className="flex-1 h-12 chamfer-hud-sm uppercase tracking-wider font-bold"
              onClick={onAddToCart}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {product.stock === 0 ? 'Rupture' : 'Ajouter'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
