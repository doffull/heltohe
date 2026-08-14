import type {
  FooterBlock,
  FooterBlockType,
  FooterBlockWidth,
  FooterConfig,
  FooterRow,
  FooterSectionKey,
} from '@/types';

/** Libellés lisibles de chaque type de bloc du footer. */
export const FOOTER_BLOCK_LABELS: Record<FooterBlockType, string> = {
  brand: 'Marque / Logo',
  columns: 'Colonnes de liens',
  socials: 'Réseaux sociaux',
  newsletter: 'Newsletter',
  payments: 'Paiement sécurisé',
  reviews: 'Avis clients',
  trustpilot: 'Widget Trustpilot',
  legal: 'Liens légaux',
  bottom: 'Barre du bas (copyright, langue, devise)',
  installApp: "Bouton « Installer l'app »",
  text: 'Texte libre',
  image: 'Image libre',
  spacer: 'Espaceur',
};

export const FOOTER_BLOCK_TYPES: FooterBlockType[] = [
  'brand', 'columns', 'socials', 'newsletter', 'payments', 'reviews',
  'trustpilot', 'legal', 'bottom', 'installApp', 'text', 'image', 'spacer',
];

export const FOOTER_WIDTHS: { value: FooterBlockWidth; label: string; basis: string }[] = [
  { value: 'full', label: '100 %', basis: 'basis-full' },
  { value: '3/4', label: '3/4', basis: 'basis-full md:basis-[74%]' },
  { value: '2/3', label: '2/3', basis: 'basis-full md:basis-[65.6%]' },
  { value: '1/2', label: '1/2', basis: 'basis-full sm:basis-[48.5%]' },
  { value: '1/3', label: '1/3', basis: 'basis-full sm:basis-[48.5%] md:basis-[32%]' },
  { value: '1/4', label: '1/4', basis: 'basis-[48%] md:basis-[23.5%]' },
];

export function footerWidthClass(w?: FooterBlockWidth): string {
  return FOOTER_WIDTHS.find((x) => x.value === w)?.basis ?? 'basis-full';
}

export const FOOTER_GAP_CLASS: Record<string, string> = {
  sm: 'gap-3',
  md: 'gap-6 lg:gap-10',
  lg: 'gap-10 lg:gap-16',
};

export function uid(prefix = 'b'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function makeFooterBlock(type: FooterBlockType, width: FooterBlockWidth = 'full'): FooterBlock {
  const base: FooterBlock = { id: uid(), type, width, visible: true };
  if (type === 'text') base.props = { title: 'Titre', text: 'Votre texte ici.' };
  if (type === 'image') base.props = { url: '', alt: '', imgWidth: 160 };
  if (type === 'spacer') base.props = { height: 24 };
  return base;
}

export function makeFooterRow(blocks: FooterBlock[] = []): FooterRow {
  return { id: uid('row'), blocks, gap: 'md', valign: 'start' };
}

const LEGACY_ORDER: FooterSectionKey[] = [
  'brand', 'columns', 'socials', 'newsletter', 'payments', 'reviews', 'legal', 'trustpilot', 'bottom',
];

const VISIBILITY_FLAG: Record<string, string> = {
  brand: 'showBrand',
  columns: 'showColumns',
  socials: 'showSocials',
  newsletter: 'showNewsletter',
  payments: 'showPayments',
  reviews: 'showReviews',
  legal: 'showLegalLinks',
  trustpilot: 'showTrustpilot',
  bottom: 'showBottomBar',
  installApp: 'showInstallApp',
};

export function footerBlockVisible(cfg: FooterConfig, block: FooterBlock): boolean {
  if (block.visible === false) return false;
  const flag = VISIBILITY_FLAG[block.type];
  if (!flag) return true;
  return (cfg as any)[flag] !== false;
}

/**
 * Construit les lignes à partir de la configuration.
 * Migre automatiquement l'ancien `sectionOrder` (un bloc par ligne) quand
 * aucune ligne n'a encore été créée.
 */
export function resolveFooterRows(cfg: FooterConfig): FooterRow[] {
  if (cfg.rows?.length) return cfg.rows;
  const stored = (cfg.sectionOrder ?? []).filter((k) => LEGACY_ORDER.includes(k));
  const order = [...stored, ...LEGACY_ORDER.filter((k) => !stored.includes(k))];
  return order.map((key) => ({
    id: `row_${key}`,
    gap: 'md',
    valign: 'start',
    blocks: [
      {
        id: `b_${key}`,
        type: key as FooterBlockType,
        width: 'full',
        align: cfg.sectionAlign?.[key] as FooterBlock['align'],
        visible: true,
      },
    ],
  }));
}
