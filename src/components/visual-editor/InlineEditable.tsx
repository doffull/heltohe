import { useRef, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface InlineEditableProps {
  fieldKey: string;
  value: string;
  /** Called only when the user validates (via ✓ button or Enter). */
  onCommit?: (val: string) => void;
  /** Legacy live-update callback (kept for existing EditableText usage). */
  onChange?: (val: string) => void;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  multiline?: boolean;
  children?: React.ReactNode;
}

/**
 * Double-click to edit any text element. Shows a floating ✓ / ✕ toolbar.
 * - Gated to admins + Visual Editor open.
 * - `onCommit` fires on validate; `onChange` (if provided) still fires live for
 *   legacy compatibility with `EditableText` which auto-saves via designSettings.
 */
export function InlineEditable({
  fieldKey,
  value,
  onCommit,
  onChange,
  as: Tag = 'span',
  className,
  style,
  placeholder = 'Double-cliquez pour éditer…',
  multiline = false,
  children,
}: InlineEditableProps) {
  const { isOpen, editingKey, setEditingKey, setIsDirty } = useVisualEditor();
  const { isAdmin } = useAuth();
  const isActive = isOpen && isAdmin;
  const isEditing = isActive && editingKey === fieldKey;
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    if (!isEditing) setLocalVal(value);
  }, [value, isEditing]);

  function autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 72)}px`;
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (multiline) autoGrow(inputRef.current);
    }
  }, [isEditing, multiline]);


  function handleActivate(e: React.MouseEvent) {
    if (!isActive) return;
    e.stopPropagation();
    e.preventDefault();
    setEditingKey(fieldKey);
  }

  function commit() {
    onCommit?.(localVal);
    setEditingKey(null);
    setIsDirty(true);
  }
  function cancel() {
    setLocalVal(value);
    setEditingKey(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setLocalVal(e.target.value);
    if (multiline) autoGrow(e.target as HTMLTextAreaElement);
    // Legacy: some callers rely on live updates.
    onChange?.(e.target.value);
    setIsDirty(true);
  }


  function handleKeyDown(e: React.KeyboardEvent) {
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
    return (
      <Tag className={className} style={style}>
        {children ?? value}
      </Tag>
    );
  }

  if (isEditing) {
    const sharedInputClass = cn(
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
            value={localVal}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={cn(sharedInputClass, 'resize-none overflow-hidden')}
            style={{ ...style, caretColor: 'hsl(var(--primary))' }}
            rows={3}
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            type="text"
            value={localVal}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={sharedInputClass}
            style={{ ...style, caretColor: 'hsl(var(--primary))' }}
            placeholder={placeholder}
          />
        )}
        {/* Validate / Cancel toolbar */}
        <span
          className="absolute -top-9 right-0 z-[300] flex items-center gap-1 rounded-md border border-border bg-background/95 backdrop-blur px-1 py-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={commit}
            className="h-6 w-6 inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90"
            title="Valider (Entrée)"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={cancel}
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
      style={style}
      onClick={handleActivate}
      title="Cliquez pour modifier"
    >
      {children ?? value}
      <span className="absolute -top-5 left-0 z-[200] hidden group-hover/editable:flex items-center gap-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
        ✏️ Cliquez pour modifier
      </span>
    </Tag>
  );
}
