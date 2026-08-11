import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/types';
import { productFamilyKey } from '@/lib/productFamily';

const KEY = 'lvtk6_recently_viewed';
const MAX = 12;

type ViewEntry = { id: string; at: number };

function read(): ViewEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.id === 'string') : [];
  } catch {
    return [];
  }
}

function write(entries: ViewEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* quota / private mode */
  }
}

/** Historique de consultation produit (local, sans compte requis). */
export function useRecentlyViewed() {
  const [entries, setEntries] = useState<ViewEntry[]>(() => read());

  const track = useCallback((productId?: string) => {
    if (!productId) return;
    const next = [{ id: productId, at: Date.now() }, ...read().filter((e) => e.id !== productId)].slice(0, MAX);
    write(next);
    setEntries(next);
  }, []);

  return { entries, ids: entries.map((e) => e.id), track };
}

/** Enregistre la vue d'un produit dès son affichage. */
export function useTrackProductView(productId?: string) {
  const { track } = useRecentlyViewed();
  useEffect(() => {
    track(productId);
    if (!productId) return;
    // Signal global : déclencheur « consultation d'un produit » des pop-ups.
    try {
      window.dispatchEvent(new CustomEvent('lvtk:product-view', { detail: { productId } }));
    } catch {
      /* ignore */
    }
  }, [productId, track]);
}


/**
 * Recommandations personnalisées : score basé sur les catégories et tags
 * des produits récemment consultés, en excluant les produits déjà vus.
 */
export function useRecommendedProducts(allProducts: Product[], excludeId?: string, limit = 8): Product[] {
  const { ids } = useRecentlyViewed();

  return useMemo(() => {
    if (!allProducts.length) return [];
    const viewed = ids.map((id) => allProducts.find((p) => p.id === id)).filter(Boolean) as Product[];
    if (!viewed.length) return [];

    const catWeight = new Map<string, number>();
    const tagWeight = new Map<string, number>();
    const families = new Set<string>();
    viewed.forEach((p, i) => {
      const w = 1 / (i + 1);
      catWeight.set(p.category, (catWeight.get(p.category) || 0) + w);
      (p.tags || []).forEach((t) => tagWeight.set(t, (tagWeight.get(t) || 0) + w));
      families.add(productFamilyKey(p));
    });

    const avgPrice = viewed.reduce((s, p) => s + (p.salePrice || p.price), 0) / viewed.length;

    return allProducts
      .filter((p) => p.isActive !== false && p.id !== excludeId && !ids.includes(p.id))
      .map((p) => {
        let score = (catWeight.get(p.category) || 0) * 3;
        (p.tags || []).forEach((t) => { score += (tagWeight.get(t) || 0) * 2; });
        if (families.has(productFamilyKey(p))) score += 4;
        const price = p.salePrice || p.price;
        score += Math.max(0, 1 - Math.abs(price - avgPrice) / Math.max(avgPrice, 1));
        if (p.salePrice) score += 0.3;
        return { p, score };
      })
      .filter((x) => x.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.p);
  }, [allProducts, ids, excludeId, limit]);
}
