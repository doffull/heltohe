/** Personnalisation des factures et bons de livraison (Admin → E-mails & Factures). */
export interface InvoiceBrand {
  companyName: string;
  tagline: string;
  logoUrl: string;
  addressLines: string;
  siret: string;
  vatNumber: string;
  footerNote: string;
  showVat: boolean;
}

export const DEFAULT_INVOICE_BRAND: InvoiceBrand = {
  companyName: 'HELVETICA-MP',
  tagline: 'Concept Store',
  logoUrl: '',
  addressLines: '',
  siret: '',
  vatNumber: '',
  footerNote: 'Facture générée automatiquement - HELVETICA-MP Concept Store',
  showVat: false,
};

export function normalizeInvoiceBrand(raw: unknown): InvoiceBrand {
  const r = (raw || {}) as Partial<InvoiceBrand>;
  return {
    companyName: r.companyName?.trim() || DEFAULT_INVOICE_BRAND.companyName,
    tagline: r.tagline ?? DEFAULT_INVOICE_BRAND.tagline,
    logoUrl: r.logoUrl ?? '',
    addressLines: r.addressLines ?? '',
    siret: r.siret ?? '',
    vatNumber: r.vatNumber ?? '',
    footerNote: r.footerNote ?? DEFAULT_INVOICE_BRAND.footerNote,
    showVat: r.showVat === true,
  };
}
