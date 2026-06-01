import { ReactNode, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';
import { MediaLibraryDialog } from './MediaLibraryDialog';
import { cn } from '@/lib/utils';

interface Props {
  /** Current image URL */
  value?: string;
  /** Called with the new URL when the admin picks one */
  onChange: (url: string) => void;
  /** Visual wrapper (the image itself, usually) */
  children: ReactNode;
  /** Wrapper className */
  className?: string;
  /** Optional label shown on the overlay button */
  label?: string;
  /** Accepts 'image' | 'video' | 'all' */
  accept?: 'image' | 'video' | 'all';
}

/**
 * Wrap any image in the home page with <EditableImage>:
 * - For visitors / customers: renders children as-is.
 * - For admins with the Live Editor open: adds a "Changer" overlay that
 *   opens the media library and updates `designSettings` via `onChange`.
 */
export function EditableImage({ value, onChange, children, className, label = 'Changer', accept = 'image' }: Props) {
  const { isAdmin } = useAuth();
  const { isOpen, setIsDirty } = useVisualEditor();
  const [dialogOpen, setDialogOpen] = useState(false);

  const active = isAdmin && isOpen;

  if (!active) return <>{children}</>;

  return (
    <div className={cn('relative group/editable-image', className)}>
      {children}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDialogOpen(true); }}
        className="absolute top-2 right-2 z-20 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1.5 rounded shadow-lg opacity-0 group-hover/editable-image:opacity-100 transition-opacity"
      >
        <ImagePlus className="h-3 w-3" />
        {label}
      </button>
      <div className="pointer-events-none absolute inset-0 z-10 border-2 border-dashed border-primary/0 group-hover/editable-image:border-primary/60 transition-colors" />

      <MediaLibraryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accept={accept}
        title="Choisir une image"
        onSelect={(url) => { onChange(url); setIsDirty(true); }}
      />
    </div>
  );
}
