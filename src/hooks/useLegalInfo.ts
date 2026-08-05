import { useApp } from '@/context/AppContext';

const NC = '[Non configuré]';

/** Nettoie une valeur saisie en admin (espaces / virgules parasites). */
function clean(value?: string | null): string {
  if (!value) return '';
  return String(value).trim().replace(/[,;]+$/, '').trim();
}

function pick(...values: (string | undefined | null)[]): string {
  for (const v of values) {
    const c = clean(v);
    if (c) return c;
  }
  return NC;
}

/**
 * Returns legal / company information from design settings,
 * with a `nc` (non-configuré) fallback for unconfigured fields.
 */
export function useLegalInfo() {
  const { designSettings } = useApp();
  const s = designSettings as any;

  const address = clean(s.legalAddress);
  const zip = clean(s.legalZip);
  const city = clean(s.legalCity);
  const addressParts = [address, [zip, city].filter(Boolean).join(' ')].filter(Boolean);

  return {
    companyName: pick(s.legalCompanyName, s.siteName),
    companyForm: pick(s.legalCompanyForm),
    capital: pick(s.legalCapital),
    address: pick(s.legalAddress),
    zip: pick(s.legalZip),
    city: pick(s.legalCity),
    fullAddress: addressParts.length ? addressParts.join(', ') : NC,
    siret: pick(s.legalSiret),
    rcs: pick(s.legalRcs),
    vat: pick(s.legalVat),
    director: pick(s.legalDirector),
    rgpdEmail: pick(s.legalRgpdEmail, s.contactEmail),
    returnEmail: pick(s.legalReturnEmail, s.contactEmail),
    contactEmail: pick(s.contactEmail),
    contactPhone: pick(s.contactPhone),
    siteName: pick(s.siteName),
  };
}
