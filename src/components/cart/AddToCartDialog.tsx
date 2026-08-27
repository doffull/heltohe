import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShoppingCart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SparkleBurst } from '@/components/ui/sparkle-burst';
import { useCart } from '@/context/CartContext';

/** Détail émis par CartContext lors d'un ajout au panier. */
export interface AddToCartDetail {
  productId: string;
  name?: string;
  image?: string;
  size?: string;
  color?: string;
  quantity?: number;
  price?: number;
}

const AUTO_REDIRECT_MS = 2500;

/**
 * Pop-up de confirmation animé après un ajout au panier.
 * Redirige automatiquement vers le panier, sauf si le client continue ses achats.
 */
export default function AddToCartDialog() {
  const navigate = useNavigate();
  const { subtotal, itemCount } = useCart();
  const [detail, setDetail] = useState<AddToCartDetail | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
  };

  useEffect(() => {
    const onAdd = (e: Event) => {
      const d = (e as CustomEvent<AddToCartDetail>).detail;
      if (!d?.productId) return;
      setDetail(d);
    };
    window.addEventListener('lvtk:add-to-cart', onAdd as EventListener);
    return () => window.removeEventListener('lvtk:add-to-cart', onAdd as EventListener);
  }, []);

  // Compte à rebours + redirection automatique
  useEffect(() => {
    if (!detail) return;
    setProgress(0);
    const start = performance.now();
    const tick = () => {
      const pct = Math.min(1, (performance.now() - start) / AUTO_REDIRECT_MS);
      setProgress(pct);
      if (pct < 1) rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    timerRef.current = window.setTimeout(() => {
      setDetail(null);
      navigate('/panier');
    }, AUTO_REDIRECT_MS);
    return clearTimers;
  }, [detail, navigate]);

  const close = () => {
    clearTimers();
    setDetail(null);
  };

  const goToCart = () => {
    clearTimers();
    setDetail(null);
    navigate('/panier');
  };

  return (
    <AnimatePresence>
      {detail && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Article ajouté au panier"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

          <motion.div
            className="relative chamfer-hud bg-card border border-border w-full max-w-sm p-6 text-center"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto mb-4 h-14 w-14 flex items-center justify-center border-2 border-foreground">
              <SparkleBurst trigger={detail.productId + (detail.size || '') + (detail.color || '')} radius={52} />
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 380, damping: 18 }}
              >
                <Check className="h-7 w-7" aria-hidden="true" />
              </motion.span>
            </div>

            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">
              Ajouté au panier
            </p>

            <div className="flex items-center gap-3 text-left border border-border bg-muted/30 p-3 mb-4">
              {detail.image && (
                <img
                  src={detail.image}
                  alt={detail.name || 'Article ajouté'}
                  className="h-14 w-14 object-cover shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{detail.name || 'Article'}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[detail.size && `Taille ${detail.size}`, detail.color, `×${detail.quantity || 1}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mb-5">
              <span className="text-muted-foreground">
                Panier ({itemCount} {itemCount > 1 ? 'articles' : 'article'})
              </span>
              <span className="font-bold">{subtotal.toFixed(2)} €</span>
            </div>

            <div className="space-y-2">
              <Button className="w-full chamfer-hud-sm h-11" onClick={goToCart}>
                <ShoppingCart className="h-4 w-4 mr-2" aria-hidden="true" />
                VOIR MON PANIER
                <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
              </Button>
              <Button variant="outline" className="w-full h-10 text-xs" onClick={close}>
                CONTINUER MES ACHATS
              </Button>
            </div>

            <div className="mt-4 h-0.5 w-full bg-border overflow-hidden" aria-hidden="true">
              <div
                className="h-full bg-foreground transition-none"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              Redirection vers le panier…
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
