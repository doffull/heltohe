#!/usr/bin/env node
/**
 * Régénère `supabase/functions/_shared/colissimo-capabilities.ts` à partir de
 * `src/data/colissimo-capabilities.json`.
 *
 * Pourquoi ce script plutôt qu'un import direct du JSON ?
 * Les edge functions tournent sous Deno et ne peuvent pas importer un fichier
 * situé dans `src/`. Plutôt que de recopier la table à la main — et de la voir
 * diverger au premier changement — on la dérive mécaniquement.
 *
 * La source (`colissimo-capabilities.json`) est le fichier officiel du plugin
 * WooCommerce Colissimo : `assets/misc/capabilitiesByCountryFR.json`.
 * Pour le mettre à jour : remplacer le JSON, relancer `node
 * scripts/generate-colissimo-capabilities.mjs`, committer les deux fichiers.
 *
 * ⚠️ Ne jamais éditer le fichier .ts généré à la main.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src/data/colissimo-capabilities.json');
// Le même module est écrit à deux endroits : le front (Vite) et les edge
// functions (Deno) ne partagent aucun chemin d'import. Générer les deux garantit
// qu'ils ne peuvent pas diverger.
const OUTS = [
  join(root, 'supabase/functions/_shared/colissimo-capabilities.ts'),
  join(root, 'src/lib/colissimo-capabilities.ts'),
];

const zones = JSON.parse(readFileSync(SRC, 'utf8'));

/** @type {Record<string, {zone: string, home: string|false, homeSigned: string|false, relay: boolean, cn23: boolean}>} */
const flat = {};
for (const [zone, data] of Object.entries(zones)) {
  for (const [code, cap] of Object.entries(data.countries ?? {})) {
    flat[code] = {
      zone,
      home: cap.domiciless ?? false,
      homeSigned: cap.domicileas ?? false,
      relay: cap.pr === true,
      cn23: cap.cn23 === true,
    };
  }
}

const codes = Object.keys(flat).sort();
const lines = codes.map((c) => {
  const { zone, home, homeSigned, relay, cn23 } = flat[c];
  const q = (v) => (v === false ? 'false' : `'${v}'`);
  return `  ${c}: { zone: '${zone}', home: ${q(home)}, homeSigned: ${q(homeSigned)}, relay: ${relay}, cn23: ${cn23} },`;
});

const out = `// @generated par scripts/generate-colissimo-capabilities.mjs — NE PAS ÉDITER.
// Source : plugin WooCommerce Colissimo, assets/misc/capabilitiesByCountryFR.json
// (expédition depuis la France). ${codes.length} pays.
//
// \`home\`       : code produit livraison à domicile SANS signature, ou false si indisponible
// \`homeSigned\` : code produit livraison à domicile AVEC signature (toujours proposé)
// \`relay\`      : le réseau point relais existe-t-il dans ce pays
// \`cn23\`       : déclaration douanière obligatoire

export interface ColissimoCapability {
  zone: string;
  home: string | false;
  homeSigned: string | false;
  relay: boolean;
  cn23: boolean;
}

export const COLISSIMO_CAPABILITIES: Record<string, ColissimoCapability> = {
${lines.join('\n')}
};

/** Pays d'expédition : tout part de France, quelle que soit la destination. */
export const SENDER_COUNTRY = 'FR';

export function getCapability(countryCode: string): ColissimoCapability | null {
  return COLISSIMO_CAPABILITIES[String(countryCode || '').toUpperCase()] ?? null;
}

/** Le point relais n'existe pas partout : CH, GB, US, CA notamment. */
export function isRelayAvailable(countryCode: string): boolean {
  return getCapability(countryCode)?.relay === true;
}

/** Une déclaration douanière est-elle exigée pour cette destination ? */
export function requiresCn23(countryCode: string): boolean {
  return getCapability(countryCode)?.cn23 === true;
}

/**
 * Code produit à déclarer pour une livraison à domicile.
 *
 * Beaucoup de pays (DE, ES, IT, GB, US, CA…) n'acceptent QUE la version avec
 * signature : \`home\` y vaut false et seul \`homeSigned\` est utilisable. Envoyer
 * \`DOM\` dans ce cas fait rejeter l'étiquette.
 */
export function resolveHomeProductCode(countryCode: string): string | null {
  const cap = getCapability(countryCode);
  if (!cap) return null;
  return cap.home || cap.homeSigned || null;
}
`;

for (const target of OUTS) {
  writeFileSync(target, out, 'utf8');
  console.log(`✓ ${target} — ${codes.length} pays`);
}
