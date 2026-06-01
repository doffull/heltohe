import { useApp } from '@/context/AppContext';
import { useVisualEditor } from './VisualEditorProvider';
import { InlineEditable } from './InlineEditable';

/**
 * Inline-editable text that persists into `designSettings.homeTexts[key]`.
 * Falls back to `defaultValue` when not customized. When the Live Editor
 * is closed, renders a plain element (zero overhead for visitors).
 */
export function EditableText({
  textKey,
  defaultValue,
  as = 'span',
  className,
  multiline = false,
}: {
  textKey: string;
  defaultValue: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p' | 'div';
  className?: string;
  multiline?: boolean;
}) {
  const { designSettings, updateDesignSettings } = useApp();
  const { setIsDirty } = useVisualEditor();
  const map = ((designSettings as any).homeTexts || {}) as Record<string, string>;
  const value = map[textKey] ?? defaultValue;

  function onChange(v: string) {
    updateDesignSettings({ homeTexts: { ...map, [textKey]: v } } as any);
    setIsDirty(true);
  }

  return (
    <InlineEditable
      fieldKey={`text:${textKey}`}
      value={value}
      onChange={onChange}
      as={as}
      className={className}
      multiline={multiline}
    />
  );
}
