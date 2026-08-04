import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { excludeMarketplaceProducts } from '@/lib/shopVisibility';
import { useCategories } from '@/hooks/useCategories';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'search_recent_v1';
const MAX_RESULTS = 8;

function normalize(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function scoreProduct(p: Product, tokens: string[]): number {
  const name = normalize(p.name);
  const haystack = normalize(
    [p.name, p.subtitle, p.sku, p.category, (p.tags || []).join(' '), p.description].filter(Boolean).join(' ')
  );
  let score = 0;
  for (const t of tokens) {
    if (!haystack.includes(t)) return 0;
    if (name.startsWith(t)) score += 6;
    else if (name.includes(t)) score += 4;
    else score += 1;
  }
  return score;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const navigate = useNavigate();
  const { data: allProducts = [] } = useProducts();
  const products = useMemo(() => excludeMarketplaceProducts(allProducts), [allProducts]);
  const { data: categories = [] } = useCategories();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const tokens = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);

  const productResults = useMemo(() => {
    if (!tokens.length) return [];
    return products
      .map((p) => ({ p, s: scoreProduct(p, tokens) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_RESULTS)
      .map((r) => r.p);
  }, [products, tokens]);

  const categoryResults = useMemo(() => {
    if (!tokens.length) return [];
    return categories
      .filter((c) => tokens.every((t) => normalize(c.title).includes(t)))
      .slice(0, 4);
  }, [categories, tokens]);

  type Item = { key: string; run: () => void };
  const items: Item[] = useMemo(() => {
    const list: Item[] = categoryResults.map((c) => ({
      key: `cat-${c.id}`,
      run: () => go(`/${c.slug || normalize(c.title).replace(/\s+/g, '-')}`),
    }));
    productResults.forEach((p) => list.push({ key: `prod-${p.id}`, run: () => go(`/boutique/${p.id}`) }));
    if (query.trim()) {
      list.push({ key: 'all', run: () => go(`/boutique?q=${encodeURIComponent(query.trim())}`) });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryResults, productResults, query]);

  useEffect(() => setActiveIndex(0), [query]);

  function saveRecent(term: string) {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  }

  function go(path: string) {
    saveRecent(query);
    onOpenChange(false);
    navigate(path);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) item.run();
      else if (query.trim()) go(`/boutique?q=${encodeURIComponent(query.trim())}`);
    }
  }

  const hasQuery = !!query.trim();
  const rowIndex = (key: string) => items.findIndex((i) => i.key === key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 top-[10%] translate-y-0" aria-label="Recherche">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher un produit, une catégorie, une référence..."
            className="h-14 border-0 bg-transparent focus-visible:ring-0 text-base px-0"
            aria-label="Rechercher"
          />
          {hasQuery && (
            <Button variant="ghost" size="icon" onClick={() => setQuery('')} aria-label="Effacer">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!hasQuery && recent.length > 0 && (
            <div className="p-2">
              <p className="px-2 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Recherches récentes</p>
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => setQuery(r)}
                  className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-secondary"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {r}
                </button>
              ))}
            </div>
          )}

          {!hasQuery && recent.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Tapez pour rechercher parmi {products.length} produits.
            </p>
          )}

          {hasQuery && categoryResults.length > 0 && (
            <div className="p-2">
              <p className="px-2 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Catégories</p>
              {categoryResults.map((c) => {
                const idx = rowIndex(`cat-${c.id}`);
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => items[idx]?.run()}
                    className={cn(
                      'flex w-full items-center justify-between rounded-sm px-2 py-2 text-sm',
                      activeIndex === idx ? 'bg-secondary' : 'hover:bg-secondary'
                    )}
                  >
                    <span className="uppercase tracking-wider">{c.title}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}

          {hasQuery && productResults.length > 0 && (
            <div className="p-2">
              <p className="px-2 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Produits</p>
              {productResults.map((p) => {
                const idx = rowIndex(`prod-${p.id}`);
                return (
                  <button
                    key={p.id}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => items[idx]?.run()}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left',
                      activeIndex === idx ? 'bg-secondary' : 'hover:bg-secondary'
                    )}
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="h-12 w-12 object-cover bg-secondary shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.category}{p.sku ? ` · ${p.sku}` : ''}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">
                      {(p.salePrice ?? p.price).toFixed(2)} €
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {hasQuery && productResults.length === 0 && categoryResults.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Aucun résultat pour « {query} ».
            </p>
          )}

          {hasQuery && (
            <button
              onMouseEnter={() => setActiveIndex(rowIndex('all'))}
              onClick={() => items[rowIndex('all')]?.run()}
              className={cn(
                'mt-1 flex w-full items-center justify-between border-t border-border px-4 py-3 text-sm',
                activeIndex === rowIndex('all') ? 'bg-secondary' : 'hover:bg-secondary'
              )}
            >
              <span className="uppercase tracking-wider">Voir tous les résultats</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SearchDialog;
