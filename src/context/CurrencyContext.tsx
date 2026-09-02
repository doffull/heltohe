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

  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  const setCurrency = useCallback((_code: CurrencyCode) => {
    // Multi-devise désactivé : le site fonctionne uniquement en EUR.
    setCurrencyState(DEFAULT_CURRENCY);
    storeCurrency(DEFAULT_CURRENCY);
  }, []);

  const value = useMemo<CurrencyContextType>(() => {
    const def = getCurrencyDef(DEFAULT_CURRENCY);
    return {
      currency: DEFAULT_CURRENCY,
      currencyDef: def,
      currencies: [def],
      setCurrency,
      format: (amountEur, options) => formatMoney(amountEur, DEFAULT_CURRENCY, options, def),
      isConverted: false,
    };
  }, [setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Repli sûr (composants montés hors provider, ex. tests isolés).
    return {
      currency: DEFAULT_CURRENCY,
      currencyDef: getCurrencyDef(DEFAULT_CURRENCY),
      currencies: [getCurrencyDef(DEFAULT_CURRENCY)],
      setCurrency: () => {},
      format: (a, o) => formatMoney(a, DEFAULT_CURRENCY, o),
      isConverted: false,
    };
  }
  return ctx;
}
