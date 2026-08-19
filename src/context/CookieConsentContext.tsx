import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApp } from '@/context/AppContext';

/** Version des finalités : incrémentez pour redemander le consentement à tous. */
export const CONSENT_VERSION = 1;
const STORAGE_KEY = 'hmp_cookie_consent';

export type ConsentCategory = 'statistics' | 'personalization' | 'thirdParty';

export interface ConsentState {
  statistics: boolean;
  personalization: boolean;
  thirdParty: boolean;
}

interface StoredConsent extends ConsentState {
  version: number;
  date: number;
  months: number;
}

const ALL_OFF: ConsentState = { statistics: false, personalization: false, thirdParty: false };
const ALL_ON: ConsentState = { statistics: true, personalization: true, thirdParty: true };

interface CookieConsentValue {
  /** Consentement effectif (essentiels toujours actifs, non listés). */
  consent: ConsentState;
  /** true dès qu'un choix valide a été enregistré. */
  decided: boolean;
  /** Panneau de préférences ouvert. */
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (next: ConsentState) => void;
  /** Efface le choix : le bandeau réapparaît. */
  reset: () => void;
}

const CookieConsentContext = createContext<CookieConsentValue | null>(null);

function readStored(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    const months = parsed.months || 6;
    const ageMonths = (Date.now() - Number(parsed.date || 0)) / (30 * 86_400_000);
    if (ageMonths > months) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children, months }: { children: ReactNode; months?: number }) {
  const { designSettings } = useApp();
  // Durée de mémorisation réglable depuis /admin/seo (6 mois par défaut, reco CNIL).
  const validity = months ?? (Number((designSettings as any)?.cookieConsentMonths) || 6);
  const [stored, setStored] = useState<StoredConsent | null>(() => readStored());
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const persist = useCallback(
    (next: ConsentState) => {
      const record: StoredConsent = { ...next, version: CONSENT_VERSION, date: Date.now(), months: validity };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      } catch {
        /* stockage indisponible : le choix reste valable pour la session */
      }
      setStored(record);
      setPreferencesOpen(false);
      window.dispatchEvent(new CustomEvent('hmp:cookie-consent', { detail: next }));
    },
    [validity],
  );

  // Bandeau désactivé depuis /admin/seo : pas de recueil de consentement,
  // le site fonctionne alors normalement (suivi + pop-ups actifs).
  const bannerEnabled = (designSettings as any)?.cookieBannerEnabled !== false;

  const value = useMemo<CookieConsentValue>(() => {
    const consent: ConsentState = !bannerEnabled
      ? ALL_ON
      : stored
      ? { statistics: !!stored.statistics, personalization: !!stored.personalization, thirdParty: !!stored.thirdParty }
      : ALL_OFF;
    return {
      consent,
      decided: !bannerEnabled || !!stored,
      preferencesOpen,

      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      acceptAll: () => persist(ALL_ON),
      rejectAll: () => persist(ALL_OFF),
      save: persist,
      reset: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setStored(null);
        setPreferencesOpen(false);
      },
    };
  }, [stored, preferencesOpen, persist, bannerEnabled]);

  // Permet d'ouvrir les préférences depuis n'importe où (footer, page cookies…).
  useEffect(() => {
    const open = () => setPreferencesOpen(true);
    window.addEventListener('hmp:open-cookie-preferences', open);
    return () => window.removeEventListener('hmp:open-cookie-preferences', open);
  }, []);

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

/** Hook tolérant : renvoie un état « tout refusé, non décidé » hors provider. */
export function useCookieConsent(): CookieConsentValue {
  const ctx = useContext(CookieConsentContext);
  if (ctx) return ctx;
  return {
    consent: ALL_OFF,
    decided: false,
    preferencesOpen: false,
    openPreferences: () => window.dispatchEvent(new CustomEvent('hmp:open-cookie-preferences')),
    closePreferences: () => {},
    acceptAll: () => {},
    rejectAll: () => {},
    save: () => {},
    reset: () => {},
  };
}

export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent('hmp:open-cookie-preferences'));
}
