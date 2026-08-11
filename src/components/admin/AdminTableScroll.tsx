import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Zone de défilement horizontale confinée pour les tableaux admin.
 * Évite que les tableaux larges (min-w-[...]) élargissent tout le layout :
 * le contenu scrolle à l'intérieur, avec inertie tactile et ombres de bord.
 */
export function AdminTableScroll({
  children,
  className,
  stickyFirstCol = false,
}: {
  children: ReactNode;
  className?: string;
  /** Fige la 2e colonne (généralement « Produit ») sur mobile/tablette. */
  stickyFirstCol?: boolean;
}) {
  return (
    <div
      className={cn(
        'admin-scroll-x admin-scroll-shadow w-full min-w-0',
        stickyFirstCol && 'admin-sticky-col',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default AdminTableScroll;
