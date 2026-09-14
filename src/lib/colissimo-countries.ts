/**
 * Pays de livraison — couche d'affichage au-dessus de la table Colissimo.
 *
 * La table des capacités (`colissimo-capabilities.ts`) est générée depuis le
 * fichier officiel du plugin WooCommerce ; ce module n'y ajoute que ce dont
 * l'interface a besoin : des noms lisibles, un ordre d'affichage, et la
 * validation du code postal.
 *
 * ⚠️ Historique : jusqu'au 14/09/2026 le pays était figé à « France » dans le
 * checkout, et l'étiquette déclarait toujours `FR` à Colissimo. Toute commande
 * étrangère était donc irrécupérable. Voir COLISSIMO_ARBITRAGE.md (P1, P2).
 */
import {
  COLISSIMO_CAPABILITIES,
  getCapability,
  isRelayAvailable,
  requiresCn23,
  resolveHomeProductCode,
} from './colissimo-capabilities';

export { getCapability, isRelayAvailable, requiresCn23, resolveHomeProductCode };

/** Le pays par défaut, et le seul qui ne déclenche pas le forfait international. */
export const DEFAULT_COUNTRY = 'FR';

export interface CountryOption {
  code: string;
  name: string;
  /** Drapeau emoji, dérivé du code ISO — aucune table à maintenir. */
  flag: string;
  /** Destination mise en avant en tête de liste. */
  priority: boolean;
}

/**
 * Drapeau d'un pays à partir de son code ISO.
 *
 * Les indicatifs régionaux Unicode se déduisent directement des deux lettres :
 * `FR` → U+1F1EB U+1F1F7. Inutile de maintenir une table de 251 emojis.
 */
export function countryFlag(code: string): string {
  const upper = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🌍';
  return String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * Forme comparable d'un libellé : minuscules, sans accent.
 * « Suède » se trouve ainsi en tapant « suede ».
 */
export function searchableLabel(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Pays mis en avant en tête de liste : la France d'abord, puis les
 * destinations réellement constatées dans les commandes (Suisse, Belgique,
 * Canada…). Le reste suit par ordre alphabétique.
 */
const PRIORITY = ['FR', 'CH', 'BE', 'LU', 'DE', 'ES', 'IT', 'GB', 'CA', 'US'];

/**
 * Noms de pays en français, sans dépendance ni table à maintenir : la table
 * officielle ne fournit que des codes ISO. `Intl.DisplayNames` est disponible
 * dans tous les navigateurs ciblés.
 */
function countryName(code: string): string {
  try {
    const dn = new Intl.DisplayNames(['fr'], { type: 'region' });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Certains codes de la table ne sont pas des pays livrables (zones techniques,
 * territoires sans adressage postal) : les proposer au checkout n'aurait pas
 * de sens.
 */
const NOT_DELIVERABLE = new Set(['AQ', 'TF', 'UM', 'XZ', 'IO']);

let cachedOptions: CountryOption[] | null = null;

/** Liste complète des destinations, prioritaires en tête. */
export function getCountryOptions(): CountryOption[] {
  if (cachedOptions) return cachedOptions;

  const all = Object.keys(COLISSIMO_CAPABILITIES)
    .filter((c) => !NOT_DELIVERABLE.has(c))
    .map((code) => ({
      code,
      name: countryName(code),
      flag: countryFlag(code),
      priority: PRIORITY.includes(code),
    }));

  const priority = PRIORITY.map((c) => all.find((o) => o.code === c)).filter(
    (o): o is CountryOption => Boolean(o),
  );
  const rest = all
    .filter((o) => !PRIORITY.includes(o.code))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  cachedOptions = [...priority, ...rest];
  return cachedOptions;
}

export function getCountryName(code: string): string {
  return countryName(String(code || '').toUpperCase());
}

/** La destination est-elle la France métropolitaine ? */
export function isDomestic(code: string | null | undefined): boolean {
  return String(code || DEFAULT_COUNTRY).toUpperCase() === DEFAULT_COUNTRY;
}

/**
 * Validation du code postal selon la destination.
 *
 * Seule la France est vérifiée strictement — c'est là que se jouait le bug
 * d'origine : un code postal suisse à 4 chiffres passait pour un CP français
 * invalide et Colissimo rejetait l'étiquette. Ailleurs, les formats sont trop
 * variés (CA `H2G 2Y6`, GB `SW1A 1AA`, IE sans CP du tout) pour qu'une règle
 * maison apporte autre chose que des faux refus.
 */
export function validateZip(zip: string, country: string): string | null {
  const value = String(zip || '').trim();
  if (!value) return 'Le code postal est obligatoire.';

  if (isDomestic(country)) {
    const compact = value.replace(/\s+/g, '');
    if (!/^\d{5}$/.test(compact)) {
      return 'Le code postal français doit comporter 5 chiffres.';
    }
    const dept = parseInt(compact.slice(0, 2), 10);
    const valid = (dept >= 1 && dept <= 95) || compact.startsWith('97') || compact.startsWith('98');
    if (!valid) return "Ce code postal ne correspond à aucun département français.";
    return null;
  }

  if (value.length < 3) return 'Le code postal semble incomplet.';
  return null;
}

/**
 * Normalise ce que l'on stocke dans `orders.customer_country`.
 *
 * Les commandes antérieures au 14/09/2026 contiennent le libellé « France » (et
 * quelques « Suisse » saisis à la main en admin) plutôt qu'un code ISO. On
 * accepte donc les deux, sans quoi l'étiquetage repartirait sur le mauvais pays
 * pour tout l'historique.
 */
export function normalizeCountryCode(input: string | null | undefined): string {
  const raw = String(input || '').trim();
  if (!raw) return DEFAULT_COUNTRY;

  const upper = raw.toUpperCase();
  if (COLISSIMO_CAPABILITIES[upper]) return upper;

  const byName = getCountryOptions().find(
    (o) => o.name.localeCompare(raw, 'fr', { sensitivity: 'base' }) === 0,
  );
  if (byName) return byName.code;

  // Libellés historiques les plus fréquents, avant l'introduction du sélecteur.
  const legacy: Record<string, string> = {
    FRANCE: 'FR',
    SUISSE: 'CH',
    SWITZERLAND: 'CH',
    BELGIQUE: 'BE',
    CANADA: 'CA',
    ALLEMAGNE: 'DE',
    ESPAGNE: 'ES',
    ITALIE: 'IT',
    LUXEMBOURG: 'LU',
  };
  return legacy[upper] ?? DEFAULT_COUNTRY;
}
