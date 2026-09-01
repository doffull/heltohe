/**
 * Réglages « Devises & Langues » — pilotés depuis Admin → Devises & Langues et
 * stockés dans `design_settings.settings_json.locales`.
 *
 * Les prix restent stockés et encaissés en EUR : seule l'affichage est converti.
 */
import { CURRENCIES, CurrencyCode, CurrencyDef, DEFAULT_CURRENCY } from './currency';
import { LANGUAGES, Language } from '@/types';

export interface LocaleSettings {
  /** Langues proposées dans le sélecteur. */
  enabledLanguages: Language[];
  defaultLanguage: Language;
  /** Devises proposées dans le sélecteur. */
  enabledCurrencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  /** Taux de conversion depuis l'EUR, surcharge des valeurs par défaut. */
  rates: Partial<Record<CurrencyCode, number>>;
  /** Afficher le sélecteur langue/devise sur le site. */
  showSwitcher: boolean;
}

export const DEFAULT_LOCALE_SETTINGS: LocaleSettings = {
  enabledLanguages: LANGUAGES.map(l => l.code),
  defaultLanguage: 'FR',
  enabledCurrencies: CURRENCIES.map(c => c.code),
  defaultCurrency: DEFAULT_CURRENCY,
  rates: {},
  showSwitcher: true,
};

export function normalizeLocaleSettings(raw: unknown): LocaleSettings {
  const s = (raw || {}) as Partial<LocaleSettings>;
  const langs = (s.enabledLanguages || []).filter(l => LANGUAGES.some(x => x.code === l));
  const currs = (s.enabledCurrencies || []).filter(c => CURRENCIES.some(x => x.code === c));
  const defaultCurrency =
    currs.includes(s.defaultCurrency as CurrencyCode) ? (s.defaultCurrency as CurrencyCode) : (currs[0] ?? DEFAULT_CURRENCY);
  const defaultLanguage =
    langs.includes(s.defaultLanguage as Language) ? (s.defaultLanguage as Language) : (langs[0] ?? 'FR');
  return {
    enabledLanguages: langs.length ? langs : DEFAULT_LOCALE_SETTINGS.enabledLanguages,
    defaultLanguage,
    enabledCurrencies: currs.length ? currs : DEFAULT_LOCALE_SETTINGS.enabledCurrencies,
    defaultCurrency,
    rates: (s.rates && typeof s.rates === 'object' ? s.rates : {}) as Partial<Record<CurrencyCode, number>>,
    showSwitcher: s.showSwitcher !== false,
  };
}

/** Devises actives, taux personnalisés appliqués. */
export function resolveCurrencies(settings?: LocaleSettings | null): CurrencyDef[] {
  const s = normalizeLocaleSettings(settings);
  const list = CURRENCIES.filter(c => s.enabledCurrencies.includes(c.code)).map(c => ({
    ...c,
    rate: c.code === 'EUR' ? 1 : Number(s.rates[c.code]) > 0 ? Number(s.rates[c.code]) : c.rate,
  }));
  return list.length ? list : [CURRENCIES[0]];
}

/** Langues actives pour le sélecteur. */
export function resolveLanguages(settings?: LocaleSettings | null) {
  const s = normalizeLocaleSettings(settings);
  const list = LANGUAGES.filter(l => s.enabledLanguages.includes(l.code));
  return list.length ? list : [LANGUAGES[0]];
}
