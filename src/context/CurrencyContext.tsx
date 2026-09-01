import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  CurrencyCode,
  CURRENCIES,
  CurrencyDef,
  DEFAULT_CURRENCY,
  formatMoney,
  getCurrencyDef,
  readStoredCurrency,
  storeCurrency,
} from '@/lib/currency';
import { useApp } from '@/context/AppContext';
import { normalizeLocaleSettings, resolveCurrencies } from '@/lib/locales';

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyDef: CurrencyDef;
  currencies: CurrencyDef[];
  setCurrency: (code: CurrencyCode) => void;
  /** Formate un montant stocké en EUR dans la devise active. */
  format: (amountEur: number, options?: { decimals?: number }) => string;
  isConverted: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { designSettings } = useApp();
  const locales = useMemo(() => normalizeLocaleSettings((designSettings as any)?.locales), [designSettings]);
  const currencies = useMemo(() => resolveCurrencies(locales), [locales]);

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => readStoredCurrency());

  // Si la devise mémorisée n'est plus activée dans l'admin, on retombe sur la devise par défaut.
  useEffect(() => {
    if (!currencies.some(c => c.code === currency)) {
      setCurrencyState(locales.defaultCurrency);
      storeCurrency(locales.defaultCurrency);
    }
  }, [currencies, currency, locales.defaultCurrency]);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    storeCurrency(code);
  }, []);

  const value = useMemo<CurrencyContextType>(() => {
    const def = currencies.find(c => c.code === currency) ?? currencies[0];
    return {
      currency: def.code,
      currencyDef: def,
      currencies,
      setCurrency,
      format: (amountEur, options) => formatMoney(amountEur, def.code, options, def),
      isConverted: def.code !== DEFAULT_CURRENCY,
    };
  }, [currency, currencies, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Repli sûr (composants montés hors provider, ex. tests isolés).
    return {
      currency: DEFAULT_CURRENCY,
      currencyDef: getCurrencyDef(DEFAULT_CURRENCY),
      currencies: CURRENCIES,
      setCurrency: () => {},
      format: (a, o) => formatMoney(a, DEFAULT_CURRENCY, o),
      isConverted: false,
    };
  }
  return ctx;
}
