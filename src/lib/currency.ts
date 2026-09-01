/**
 * Multi-devise — les prix sont stockés en EUR (devise de référence et de
 * facturation). L'affichage peut être converti dans la devise choisie par le
 * visiteur ; l'encaissement reste en EUR.
 */

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'AED';

export interface CurrencyDef {
  code: CurrencyCode;
  symbol: string;
  label: string;
  /** Taux de conversion depuis l'EUR. */
  rate: number;
  locale: string;
  /** Symbole avant le montant ? */
  prefix?: boolean;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'EUR', symbol: '€', label: 'Euro', rate: 1, locale: 'fr-FR' },
  { code: 'USD', symbol: '$', label: 'Dollar US', rate: 1.09, locale: 'en-US', prefix: true },
  { code: 'GBP', symbol: '£', label: 'Livre sterling', rate: 0.85, locale: 'en-GB', prefix: true },
  { code: 'CHF', symbol: 'CHF', label: 'Franc suisse', rate: 0.94, locale: 'de-CH' },
  { code: 'CAD', symbol: 'C$', label: 'Dollar canadien', rate: 1.47, locale: 'fr-CA' },
  { code: 'AED', symbol: 'AED', label: 'Dirham', rate: 4.0, locale: 'ar-AE' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';
const STORAGE_KEY = 'app_currency';

export function getCurrencyDef(code: CurrencyCode): CurrencyDef {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
}

export function readStoredCurrency(): CurrencyCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (v && CURRENCIES.some(c => c.code === v)) return v;
  } catch {}
  return DEFAULT_CURRENCY;
}

export function storeCurrency(code: CurrencyCode) {
  try { localStorage.setItem(STORAGE_KEY, code); } catch {}
}

/** Convertit un montant EUR vers la devise cible. */
export function convertFromEur(amountEur: number, code: CurrencyCode, override?: CurrencyDef): number {
  const def = override ?? getCurrencyDef(code);
  return amountEur * def.rate;
}

/** Formate un montant EUR dans la devise cible (ex. "129,00 €", "$140.61"). */
export function formatMoney(
  amountEur: number,
  code: CurrencyCode = DEFAULT_CURRENCY,
  options?: { decimals?: number },
  /** Définition de devise personnalisée (taux réglé dans l'admin). */
  override?: CurrencyDef,
): string {
  const def = override ?? getCurrencyDef(code);
  const value = convertFromEur(Number(amountEur) || 0, code, def);
  const decimals = options?.decimals ?? 2;
  const num = value.toLocaleString(def.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return def.prefix ? `${def.symbol}${num}` : `${num} ${def.symbol}`;
}
