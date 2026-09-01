/**
 * Domaine public du site, source unique pour tout ce qui produit une URL absolue :
 * balises canonical / Open Graph, sitemap, robots.txt, aperçu de l'éditeur visuel.
 *
 * Se configure via `VITE_SITE_URL` (voir .env.example). Le repli vaut le domaine de
 * production — sans lui, un build mal configuré émettrait des URLs relatives que
 * Google refuserait comme canonical.
 *
 * Le même repli est dupliqué dans `scripts/generate-seo-files.mjs`, qui s'exécute
 * hors du bundle Vite : garder les deux valeurs alignées.
 */
const FALLBACK_SITE_URL = 'https://helvetica-mp.net';

/** Domaine sans slash final, ex. `https://helvetica-mp.net`. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || FALLBACK_SITE_URL
).replace(/\/+$/, '');

/** Construit une URL absolue à partir d'un chemin (`/boutique` → `https://…/boutique`). */
export function absoluteUrl(pathname: string): string {
  if (!pathname || pathname === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${pathname.startsWith('/') ? '' : '/'}${pathname.replace(/\/+$/, '')}`;
}
