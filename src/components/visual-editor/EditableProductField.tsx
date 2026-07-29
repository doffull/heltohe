import { useRef, useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';
import { useUpdateProduct } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { toast } from 'sonner';

type Field = keyof Product;

interface Props {
  product: Product;
  field: Field;
  /** How to render the read value. Defaults to plain text. */
  children?: React.ReactNode;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
  multiline?: boolean;
  /** Coerce input string → stored value (e.g. Number for price). */
  parse?: (raw: string) => any;
  /** Format stored value → input string. */
  format?: (val: any) => string;
  placeholder?: string;
}

/** Inline editor bound to a product row column. Double-click → input + ✓/✕. */
export function EditableProductField({
  product,
  field,
  children,
  className,
  as: Tag = 'span',
  multiline = false,
  parse,
  format,
  placeholder = 'Double-cliquez pour éditer…',
}: Props) {
  const { isOpen, editingKey, setEditingKey, setIsDirty } = useVisualEditor();
  const { isAdmin } = useAuth();
  const updateProduct = useUpdateProduct();
  const isActive = isOpen && isAdmin;
  const key = `product:${product.id}:${String(field)}`;
  const isEditing = isActive && editingKey === key;
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const currentRaw = (product as any)[field];
  const asString = format ? format(currentRaw) : currentRaw == null ? '' : String(currentRaw);
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
    const parsed = parse ? parse(local) : local;
    // No-op if unchanged
    if (parsed === currentRaw || (parsed === '' && currentRaw == null)) {
      setEditingKey(null);
      return;
    }
    try {
      setSaving(true);
      await updateProduct.mutateAsync({ id: product.id, [field]: parsed } as any);
      setIsDirty(true);
      toast.success('✓ Enregistré');
      setEditingKey(null);
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message || 'échec de la sauvegarde'}`);
    } finally {
      setSaving(false);
    }
  }
  function cancel() {
    setLocal(asString);
    setEditingKey(null);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  if (!isActive) {
    return <Tag className={className}>{children ?? asString}</Tag>;
  }

  if (isEditing) {
    const inputClass = cn(
      'inline-editable-input bg-transparent border-0 outline-none p-0 m-0 w-full',
      'underline decoration-dashed decoration-primary/60 underline-offset-4',
      'text-inherit font-inherit leading-inherit',
      className,
    );
    return (
      <span className="relative inline-block w-full">
        {multiline ? (
          <textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onKeyDown={onKeyDown}
            className={cn(inputClass, 'resize-none overflow-hidden min-h-[4rem]')}
            style={{ caretColor: 'hsl(var(--primary))' }}
            rows={3}
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onKeyDown={onKeyDown}
            className={inputClass}
            style={{ caretColor: 'hsl(var(--primary))' }}
            placeholder={placeholder}
          />
        )}
        <span
          className="absolute -top-9 right-0 z-[300] flex items-center gap-1 rounded-md border border-border bg-background/95 backdrop-blur px-1 py-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={commit}
            disabled={saving}
            className="h-6 w-6 inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            title="Valider (Entrée)"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="h-6 w-6 inline-flex items-center justify-center rounded bg-muted text-muted-foreground hover:bg-muted/80"
            title="Annuler (Échap)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </span>
    );
  }

  return (
    <Tag
      className={cn(
        className,
        'cursor-text group/editable relative',
        'hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 rounded-sm transition-all duration-150',
      )}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setEditingKey(key);
      }}
      title="Double-clic pour modifier"
    >
      {children ?? asString}
      <span className="absolute -top-5 left-0 z-[200] hidden group-hover/editable:flex items-center gap-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
        ✏️ {String(field)}
      </span>
    </Tag>
  );
}
