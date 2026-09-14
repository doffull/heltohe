/**
 * Normalisation du pays de destination, côté edge functions.
 *
 * Jumeau de `src/lib/colissimo-countries.ts` — le front (Vite) et les edge
 * functions (Deno) ne partagent aucun chemin d'import, seule la table générée
 * `colissimo-capabilities.ts` l'est. Toute évolution des libellés historiques
 * doit être reportée dans les deux fichiers.
 */
import {
  COLISSIMO_CAPABILITIES,
  getCapability,
  isRelayAvailable,
  requiresCn23,
  resolveHomeProductCode,
  SENDER_COUNTRY,
} from './colissimo-capabilities.ts';

export {
  COLISSIMO_CAPABILITIES,
  getCapability,
  isRelayAvailable,
  requiresCn23,
  resolveHomeProductCode,
  SENDER_COUNTRY,
};

export const DEFAULT_COUNTRY = 'FR';

/**
 * Libellés rencontrés dans `orders.customer_country` avant l'introduction du
 * sélecteur de pays (14/09/2026) : le checkout y écrivait « France » en dur, et
 * l'administration a corrigé quelques commandes à la main.
 *
 * Sans cette table, tout l'historique repartirait avec le mauvais code pays.
 */
const LEGACY_NAMES: Record<string, string> = {
  FRANCE: 'FR',
  'FRANCE METROPOLITAINE': 'FR',
  SUISSE: 'CH',
  SWITZERLAND: 'CH',
  SCHWEIZ: 'CH',
  BELGIQUE: 'BE',
  BELGIUM: 'BE',
  ALLEMAGNE: 'DE',
  GERMANY: 'DE',
  ESPAGNE: 'ES',
  SPAIN: 'ES',
  ITALIE: 'IT',
  ITALY: 'IT',
  LUXEMBOURG: 'LU',
  MONACO: 'MC',
  CANADA: 'CA',
  'ETATS-UNIS': 'US',
  'ROYAUME-UNI': 'GB',
  'PAYS-BAS': 'NL',
  PORTUGAL: 'PT',
};

/**
 * Ramène n'importe quelle écriture du pays à un code ISO 2 lettres connu de
 * Colissimo. Retombe sur `FR` plutôt que d'échouer : une étiquette France reste
 * préférable à une absence d'étiquette, et c'était le comportement implicite
 * jusqu'ici.
 */
export function normalizeCountryCode(input: unknown): string {
  const raw = String(input ?? '').trim();
  if (!raw) return DEFAULT_COUNTRY;

  const upper = raw.toUpperCase();
  if (COLISSIMO_CAPABILITIES[upper]) return upper;

  const stripped = upper
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return LEGACY_NAMES[stripped] ?? DEFAULT_COUNTRY;
}

/** La destination est-elle la France métropolitaine ? */
export function isDomestic(input: unknown): boolean {
  return normalizeCountryCode(input) === DEFAULT_COUNTRY;
}
