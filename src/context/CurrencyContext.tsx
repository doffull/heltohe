import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
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
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => readStoredCurrency());

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    storeCurrency(code);
  }, []);

  const value = useMemo<CurrencyContextType>(() => ({
    currency,
    currencyDef: getCurrencyDef(currency),
    currencies: CURRENCIES,
    setCurrency,
    format: (amountEur, options) => formatMoney(amountEur, currency, options),
    isConverted: currency !== DEFAULT_CURRENCY,
  }), [currency, setCurrency]);

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
