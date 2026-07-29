import { useRef, useEffect, useState } from 'react';
import { Check, X, Loader2, Trash2 } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';
import { useUpdateProduct } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { toast } from 'sonner';

type Field = keyof Product;

interface Props {
  product: Product;
  /** Array-typed product column (e.g. "sizes"). */
  field: Field;
  /** Index of the item inside the array. */
  index: number;
  /** How to render the read-only value. Defaults to the string value. */
  children?: React.ReactNode;
  className?: string;
  as?: 'span' | 'div' | 'button';
  /** If provided, replaces the default array-item update logic (used for
   *  non-primitive arrays like colorOptions where we edit a sub-field). */
  onCommit?: (raw: string) => Promise<void> | void;
  /** Same as onCommit but for delete. */
  onDelete?: () => Promise<void> | void;
  placeholder?: string;
  /** Disable delete button. */
  allowDelete?: boolean;
}

/**
 * Double-click editor for an entry inside a product array column.
 * Default behavior edits `product[field][index]` as a string; override with
 * `onCommit`/`onDelete` for structured arrays.
 */
export function EditableProductArrayField({
  product,
  field,
  index,
  children,
  className,
  as: Tag = 'span',
  onCommit,
  onDelete,
  placeholder = 'Éditer…',
  allowDelete = true,
}: Props) {
  const { isOpen, editingKey, setEditingKey, setIsDirty } = useVisualEditor();
  const { isAdmin } = useAuth();
  const updateProduct = useUpdateProduct();
  const isActive = isOpen && isAdmin;
  const key = `product:${product.id}:${String(field)}:${index}`;
  const isEditing = isActive && editingKey === key;
  const inputRef = useRef<HTMLInputElement>(null);

  const arr = ((product as any)[field] as any[]) || [];
  const raw = arr[index];
  const asString = raw == null ? '' : String(raw);
  const [local, setLocal] = useState(asString);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) setLocal(asString);
  }, [asString, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  async function commit() {
    if (local === asString) { setEditingKey(null); return; }
    try {
      setSaving(true);
      if (onCommit) {
        await onCommit(local);
      } else {
        const next = [...arr];
        next[index] = local;
        await updateProduct.mutateAsync({ id: product.id, [field]: next } as any);
      }
      setIsDirty(true);
      toast.success('✓ Enregistré');
      setEditingKey(null);
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message || 'échec'}`);
    } finally {
      setSaving(false);
    }
  }
  function cancel() { setLocal(asString); setEditingKey(null); }
  async function remove() {
    try {
      setSaving(true);
      if (onDelete) {
        await onDelete();
      } else {
        const next = arr.filter((_, i) => i !== index);
        await updateProduct.mutateAsync({ id: product.id, [field]: next } as any);
      }
      setIsDirty(true);
      toast.success('✓ Supprimé');
      setEditingKey(null);
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message || 'échec'}`);
    } finally {
      setSaving(false);
    }
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  }

  if (!isActive) return <Tag className={className}>{children ?? asString}</Tag>;

  if (isEditing) {
    return (
      <span className="relative inline-block">
        <input
          ref={inputRef}
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder={placeholder}

          className={cn(
            'bg-background border border-primary outline-none px-2 py-1 rounded text-inherit font-inherit min-w-[60px]',
            className,
          )}
          style={{ caretColor: 'hsl(var(--primary))' }}
        />
        <span
          className="absolute -top-9 right-0 z-[300] flex items-center gap-1 rounded-md border border-border bg-background/95 backdrop-blur px-1 py-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button type="button" onClick={commit} disabled={saving}
            className="h-6 w-6 inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            title="Valider (Entrée)">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={cancel} disabled={saving}
            className="h-6 w-6 inline-flex items-center justify-center rounded bg-muted text-muted-foreground hover:bg-muted/80"
            title="Annuler (Échap)">
            <X className="h-3.5 w-3.5" />
          </button>
          {allowDelete && (
            <button type="button" onClick={remove} disabled={saving}
              className="h-6 w-6 inline-flex items-center justify-center rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              title="Supprimer cet élément">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </span>
    );
  }

  return (
    <Tag
      className={cn(className, 'cursor-text hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 rounded-sm transition-all')}
      onDoubleClick={(e: any) => { e.stopPropagation(); e.preventDefault(); setEditingKey(key); }}
      title="Double-clic pour modifier"
    >
      {children ?? asString}
    </Tag>
  );
}
