import { useApp } from '@/context/AppContext';

/**
 * Returns legal / company information from design settings,
 * with a `nc` (non-configuré) fallback for unconfigured fields.
 */
export function useLegalInfo() {
  const { designSettings } = useApp();

  const nc = '[Non configuré]';

  return {
    companyName: designSettings.legalCompanyName || designSettings.siteName || nc,
    companyForm: designSettings.legalCompanyForm || nc,
    capital: designSettings.legalCapital || nc,
    address: designSettings.legalAddress || nc,
    zip: designSettings.legalZip || nc,
    city: designSettings.legalCity || nc,
    fullAddress:
      designSettings.legalAddress && designSettings.legalZip && designSettings.legalCity
        ? `${designSettings.legalAddress}, ${designSettings.legalZip} ${designSettings.legalCity}`
        : nc,
    siret: designSettings.legalSiret || nc,
    rcs: designSettings.legalRcs || nc,
    vat: designSettings.legalVat || nc,
    director: designSettings.legalDirector || nc,
    rgpdEmail: designSettings.legalRgpdEmail || designSettings.contactEmail || nc,
    returnEmail: designSettings.legalReturnEmail || designSettings.contactEmail || nc,
    contactEmail: designSettings.contactEmail || nc,
    contactPhone: designSettings.contactPhone || nc,
    siteName: designSettings.siteName || nc,
  };
}
