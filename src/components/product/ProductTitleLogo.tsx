interface ProductTitleLogoProps {
  /** URL du logo (médiathèque ou externe). */
  src?: string | null;
  alt?: string;
  /** Taille du logo : vignette (sm) ou fiche produit (md). */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Petit logo affiché à côté du titre d'un produit.
 * Ne rend rien si aucun logo n'est défini.
 */
export default function ProductTitleLogo({ src, alt = 'Logo', size = 'md', className }: ProductTitleLogoProps) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={[
        'shrink-0 object-contain',
        size === 'sm' ? 'h-4 w-auto max-w-[48px]' : 'h-7 sm:h-8 lg:h-9 w-auto max-w-[110px]',
        className || '',
      ].join(' ')}
    />
  );
}
