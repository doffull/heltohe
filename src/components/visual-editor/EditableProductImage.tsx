import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';
import { useUpdateProduct } from '@/hooks/useProducts';
import { MediaLibraryDialog } from './MediaLibraryDialog';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { toast } from 'sonner';

interface Props {
  product: Product;
  /** Which image slot: cover (main) or a gallery index. */
  target: 'cover' | { galleryIndex: number };
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrap any image (or block containing an image) so admins can swap it in-place
 * via double-click → Media Library.
 */
export function EditableProductImage({ product, target, children, className }: Props) {
  const { isOpen } = useVisualEditor();
  const { isAdmin } = useAuth();
  const updateProduct = useUpdateProduct();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isActive = isOpen && isAdmin;

  async function handleSelect(url: string) {
    try {
      if (target === 'cover') {
        await updateProduct.mutateAsync({ id: product.id, image: url } as any);
      } else {
        const gallery = [...(product.galleryImages || [])];
        gallery[target.galleryIndex] = url;
        await updateProduct.mutateAsync({ id: product.id, galleryImages: gallery } as any);
      }
      toast.success('✓ Image mise à jour');
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message || 'échec de la mise à jour'}`);
    }
  }

  if (!isActive) return <>{children}</>;

  return (
    <>
      <div
        className={cn(
          'relative group/editable-img rounded-sm',
          'hover:ring-2 hover:ring-primary/60 hover:ring-offset-1 transition-all cursor-pointer',
          className,
        )}
        onDoubleClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setDialogOpen(true);
        }}
        title="Double-clic pour remplacer l'image"
      >
        {children}
        <span className="pointer-events-none absolute top-2 right-2 z-[200] hidden group-hover/editable-img:flex items-center gap-1 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded shadow-lg">
          <ImagePlus className="h-3 w-3" /> Double-clic
        </span>
      </div>
      <MediaLibraryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleSelect}
        title="Remplacer l'image du produit"
      />
    </>
  );
}
