import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, SlidersHorizontal, X } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export interface ShopFilters {
  sizes: string[];
  colors: string[];
}

interface Props {
  products: Product[];
  value: ShopFilters;
  onChange: (v: ShopFilters) => void;
  className?: string;
  /** Force la liste des tailles (ex: filtres spécifiques Collab) */
  sizesOverride?: string[];
  /** Force la liste des coloris (ex: filtres spécifiques Collab) */
  colorsOverride?: { label: string; color: string }[];
}

function isLight(hex: string) {
  const c = (hex || '').replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

function Group({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2"
      >
        <span className="hud-text text-xs font-bold uppercase tracking-widest">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Panneau de filtres boutique : tailles + coloris (avec libellés). */
export default function ShopFilterPanel({ products, value, onChange, className, sizesOverride, colorsOverride }: Props) {
  const { designSettings } = useApp();
  const globalSizes: string[] = ((designSettings as any)?.globalProductSizes || []) as string[];
  const [mobileOpen, setMobileOpen] = useState(false);

  const sizes = useMemo(() => {
    if (sizesOverride && sizesOverride.length) return sizesOverride;
    const set = new Set<string>();
    products.forEach((p) => (p.sizes || []).forEach((s) => s && set.add(s)));
    const arr = [...set];
    if (globalSizes.length) {
      arr.sort((a, b) => {
        const ia = globalSizes.indexOf(a);
        const ib = globalSizes.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }
    return arr;
  }, [products, globalSizes, sizesOverride]);

  const colors = useMemo(() => {
    if (colorsOverride && colorsOverride.length) return colorsOverride;
    const map = new Map<string, { color: string; label: string }>();
    products.forEach((p) =>
      (p.colorOptions || []).forEach((co) => {
        const key = (co.label || co.color || '').toLowerCase();
        if (key && !map.has(key)) map.set(key, { color: co.color, label: co.label || co.color });
      })
    );
    return [...map.values()];
  }, [products, colorsOverride]);

  const toggle = (kind: keyof ShopFilters, v: string) => {
    const cur = value[kind];
    onChange({
      ...value,
      [kind]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    });
  };

  const activeCount = value.sizes.length + value.colors.length;
  const hasAny = sizes.length > 0 || colors.length > 0;
  if (!hasAny) return null;

  const body = (
    <div>
      <div className="flex items-center justify-between pb-3">
        <span className="hud-text text-sm font-bold uppercase tracking-widest">Filtres</span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ sizes: [], colors: [] })}
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Réinitialiser ({activeCount})
          </button>
        )}
      </div>

      {sizes.length > 0 && (
        <Group title="Taille">
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const on = value.sizes.includes(s);
              return (
                <motion.button
                  key={s}
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => toggle('sizes', s)}
                  aria-pressed={on}
                  className={cn(
                    'min-w-[44px] border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                    on
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-foreground hover:border-foreground'
                  )}
                >
                  {s}
                </motion.button>
              );
            })}
          </div>
        </Group>
      )}

      {colors.length > 0 && (
        <Group title="Couleurs">
          <div className="grid grid-cols-2 gap-2">
            {colors.map((c) => {
              const on = value.colors.includes(c.label);
              return (
                <motion.button
                  key={c.label}
                  type="button"
                  whileHover={{ x: 2 }}
                  onClick={() => toggle('colors', c.label)}
                  aria-pressed={on}
                  className={cn(
                    'flex items-center gap-2 border px-2 py-1.5 text-left transition-colors',
                    on ? 'border-foreground bg-foreground/5' : 'border-transparent hover:border-border'
                  )}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/70"
                    style={{ backgroundColor: c.color }}
                  >
                    {on && (
                      <Check
                        className="h-3 w-3"
                        style={{ color: isLight(c.color) ? '#000' : '#fff' }}
                      />
                    )}
                  </span>
                  <span className="truncate text-xs capitalize">{c.label}</span>
                </motion.button>
              );
            })}
          </div>
        </Group>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={cn('hidden lg:block', className)}>{body}</aside>

      {/* Mobile trigger + drawer */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 chamfer-hud-sm"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filtres{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                className="fixed inset-y-0 left-0 z-[61] w-[85vw] max-w-sm overflow-y-auto border-r border-border bg-background p-4"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              >
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="mb-2 ml-auto flex h-8 w-8 items-center justify-center border border-border"
                  aria-label="Fermer les filtres"
                >
                  <X className="h-4 w-4" />
                </button>
                {body}
                <Button className="mt-4 w-full" onClick={() => setMobileOpen(false)}>
                  Voir les résultats
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
