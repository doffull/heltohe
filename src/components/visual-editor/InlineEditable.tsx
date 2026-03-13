import { useRef, useEffect, useState } from 'react';
import { useVisualEditor } from './VisualEditorProvider';
import { cn } from '@/lib/utils';

interface InlineEditableProps {
  /** Unique key to track which field is being edited */
  fieldKey: string;
  /** Current text value */
  value: string;
  /** Called when value changes */
  onChange: (val: string) => void;
  /** The rendered element type: span | h1 | h2 | p | button */
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
  /** Extra classes applied to the wrapper */
  className?: string;
  /** Style passthrough */
  style?: React.CSSProperties;
  /** Placeholder shown when empty */
  placeholder?: string;
  /** If true, uses textarea instead of single-line input */
  multiline?: boolean;
  children?: React.ReactNode;
}

/**
 * Wraps any text element so that when the Visual Editor is open,
 * clicking on it turns it into an inline input.
 */
export function InlineEditable({
  fieldKey,
  value,
  onChange,
  as: Tag = 'span',
  className,
  style,
  placeholder = 'Cliquez pour éditer…',
  multiline = false,
  children,
}: InlineEditableProps) {
  const { isOpen, editingKey, setEditingKey, setIsDirty } = useVisualEditor();
  const isEditing = editingKey === fieldKey;
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [localVal, setLocalVal] = useState(value);

  // Sync external value changes when not editing
  useEffect(() => {
    if (!isEditing) setLocalVal(value);
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleClick(e: React.MouseEvent) {
    if (!isOpen) return;
    e.stopPropagation();
    e.preventDefault();
    setEditingKey(fieldKey);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setLocalVal(e.target.value);
    onChange(e.target.value);
    setIsDirty(true);
  }

  function handleBlur() {
    setEditingKey(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      setEditingKey(null);
    }
    if (e.key === 'Escape') {
      setEditingKey(null);
    }
  }

  if (!isOpen) {
    // Normal rendering, no editing UI
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
      className
    );

    return multiline ? (
      <textarea
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        value={localVal}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(sharedInputClass, 'resize-none overflow-hidden')}
        style={{ ...style, caretColor: 'hsl(var(--primary))' }}
        rows={2}
      />
    ) : (
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        value={localVal}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={sharedInputClass}
        style={{ ...style, caretColor: 'hsl(var(--primary))' }}
        placeholder={placeholder}
      />
    );
  }

  // Editor open but not editing this field — show hover hint
  return (
    <Tag
      className={cn(
        className,
        'cursor-text group/editable relative',
        // Subtle ring on hover indicating it's editable
        'hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 rounded-sm transition-all duration-150'
      )}
      style={style}
      onClick={handleClick}
      title="Cliquer pour modifier"
    >
      {children ?? value}
      {/* Floating "Éditer" tooltip on hover */}
      <span className="absolute -top-5 left-0 z-[200] hidden group-hover/editable:flex items-center gap-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
        ✏️ Éditer
      </span>
    </Tag>
  );
}
