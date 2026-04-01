import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

function getTimeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function CountdownBadge({ endsAt }: { endsAt: string }) {
  const [time, setTime] = useState(() => getTimeLeft(endsAt));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!time) return <span className="text-[10px] text-destructive font-bold">EXPIRÉ</span>;

  return (
    <div className="flex gap-1">
      {[
        { v: time.d, l: 'J' },
        { v: time.h, l: 'H' },
        { v: time.m, l: 'M' },
        { v: time.s, l: 'S' },
      ].map((u) => (
        <div key={u.l} className="flex flex-col items-center bg-foreground/90 text-background rounded-sm px-1.5 py-0.5 min-w-[28px]">
          <span className="text-sm font-bold tabular-nums leading-tight">{String(u.v).padStart(2, '0')}</span>
          <span className="text-[8px] uppercase opacity-70">{u.l}</span>
        </div>
      ))}
    </div>
  );
}

export function PromoCountdown() {
  const { data: products = [] } = useProducts();
  const navigate = useNavigate();
  const [scrollIndex, setScrollIndex] = useState(0);

  const promoProducts = useMemo(
    () =>
      products.filter(
        (p: Product) =>
          p.salePrice && p.promoEndsAt && new Date(p.promoEndsAt).getTime() > Date.now()
      ),
    [products]
  );

  if (promoProducts.length === 0) return null;

  const visibleCount = 4;
  const maxIndex = Math.max(0, promoProducts.length - visibleCount);

  return (
    <section className="py-6 lg:py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Flame className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">// OFFRES FLASH</p>
              <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-tight">Promos limitées</h2>
            </div>
          </div>
          {promoProducts.length > visibleCount && (
            <div className="flex gap-2">
              <button
                onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
                disabled={scrollIndex === 0}
                className="w-8 h-8 border border-border flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setScrollIndex(Math.min(maxIndex, scrollIndex + 1))}
                disabled={scrollIndex >= maxIndex}
                className="w-8 h-8 border border-border flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-hidden">
          <div
            className="flex gap-4 transition-transform duration-500"
            style={{ transform: `translateX(-${scrollIndex * 25}%)` }}
          >
            {promoProducts.map((product) => {
              const discount = Math.round(((product.price - (product.salePrice || product.price)) / product.price) * 100);
              return (
                <div
                  key={product.id}
                  className="min-w-[calc(50%-8px)] sm:min-w-[calc(33.333%-11px)] lg:min-w-[calc(25%-12px)] flex-shrink-0 group border border-border bg-card overflow-hidden hover:border-primary transition-colors cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-bold uppercase">
                      -{discount}%
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.category}</p>
                    <h3 className="text-sm font-bold uppercase tracking-tight truncate">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold">{product.salePrice}€</span>
                      <span className="text-xs text-muted-foreground line-through">{product.price}€</span>
                    </div>
                    <CountdownBadge endsAt={product.promoEndsAt!} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
