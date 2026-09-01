#!/usr/bin/env node
/**
 * Génère `public/sitemap.xml` et `public/robots.txt` à partir des gabarits de
 * `scripts/seo-templates/`, en y injectant le domaine du site.
 *
 * Pourquoi un script : les fichiers de `public/` sont copiés tels quels par Vite,
 * qui n'y substitue aucune variable d'environnement. Sans cette étape, le domaine
 * resterait figé en dur — c'est exactement ce qui avait laissé un ancien domaine
 * dans le sitemap et le robots.txt.
 *
 * Lancé automatiquement avant `npm run dev` et `npm run build`. Les fichiers générés
 * restent versionnés : un déploiement qui appellerait `vite build` directement, sans
 * passer par les hooks npm, doit continuer à disposer d'un sitemap valide.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// Doit rester aligné avec FALLBACK_SITE_URL dans src/lib/site.ts.
const FALLBACK_SITE_URL = 'https://helvetica-mp.net';

/** Lit VITE_SITE_URL depuis l'environnement, sinon depuis un fichier .env local. */
function resolveSiteUrl() {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL;

  for (const name of ['.env.local', '.env']) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    const match = readFileSync(file, 'utf8').match(/^\s*VITE_SITE_URL\s*=\s*(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }

  return FALLBACK_SITE_URL;
}

const siteUrl = resolveSiteUrl().replace(/\/+$/, '');

if (!/^https?:\/\/[^/\s]+$/.test(siteUrl)) {
  console.error(`[seo] VITE_SITE_URL invalide : "${siteUrl}" (attendu : https://domaine.tld)`);
  process.exit(1);
}

for (const file of ['sitemap.xml', 'robots.txt']) {
  const template = readFileSync(join(here, 'seo-templates', file), 'utf8');
  writeFileSync(join(root, 'public', file), template.replaceAll('{{SITE_URL}}', siteUrl));
}

console.log(`[seo] sitemap.xml et robots.txt générés pour ${siteUrl}`);
