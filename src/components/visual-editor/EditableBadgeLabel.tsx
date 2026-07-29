import { useRef, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { getProductTrustBadges, DEFAULT_TRUST_BADGES } from '@/lib/productTrustBadges';
import type { ProductTrustBadge, ProductTrustBadgesConfig } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  productCategory?: string;
  badgeId: string;
  currentLabel: string;
  className?: string;
}

/** Inline double-click editor for a single trust-badge label. Writes back to
 *  designSettings.productTrustBadges — respecting the resolver used by the
 *  page (per-category override wins over default). */
export function EditableBadgeLabel({ productCategory, badgeId, currentLabel, className }: Props) {
  const { isOpen, editingKey, setEditingKey, setIsDirty } = useVisualEditor();
  const { isAdmin } = useAuth();
  const { designSettings, updateDesignSettings } = useApp();
  const isActive = isOpen && isAdmin;
  const key = `badge:${productCategory || 'default'}:${badgeId}`;
  const isEditing = isActive && editingKey === key;
  const inputRef = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(currentLabel);

  useEffect(() => { if (!isEditing) setLocal(currentLabel); }, [currentLabel, isEditing]);
  useEffect(() => {
    if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [isEditing]);

  function commit() {
    const cfg: ProductTrustBadgesConfig = designSettings?.productTrustBadges
      || { enabled: true, default: DEFAULT_TRUST_BADGES, byCategory: {} };
    const { badges: resolved } = getProductTrustBadges(designSettings, productCategory);
    // Determine which list to write into: byCategory match or default.
    const byCategory = { ...(cfg.byCategory || {}) };
    let listKey: string | null = null;
    const normCat = (productCategory || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (normCat) {
      for (const k of Object.keys(byCategory)) {
        const nk = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (nk === normCat && Array.isArray(byCategory[k])) { listKey = k; break; }
      }
    }
    const nextList: ProductTrustBadge[] = (listKey ? byCategory[listKey] : (cfg.default ?? DEFAULT_TRUST_BADGES))
      .map(b => b.id === badgeId ? { ...b, label: local } : b);
    // If the current shown badge id doesn't exist in list (mismatch), fall back to matching by original label.
    if (!nextList.some(b => b.id === badgeId)) {
      const source = (listKey ? byCategory[listKey] : (cfg.default ?? DEFAULT_TRUST_BADGES));
      const patched = source.map(b => b.label === currentLabel ? { ...b, label: local } : b);
      if (listKey) byCategory[listKey] = patched;
      updateDesignSettings({
        productTrustBadges: { ...cfg, byCategory, default: listKey ? cfg.default : patched },
      } as any);
    } else if (listKey) {
      byCategory[listKey] = nextList;
      updateDesignSettings({ productTrustBadges: { ...cfg, byCategory } } as any);
    } else {
      updateDesignSettings({ productTrustBadges: { ...cfg, default: nextList } } as any);
    }
    setIsDirty(true);
    setEditingKey(null);
  }
  function cancel() { setLocal(currentLabel); setEditingKey(null); }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  }

  if (!isActive) return <p className={className}>{currentLabel}</p>;
  if (isEditing) {
    return (
      <span className="relative inline-block">
        <input
          ref={inputRef}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onKeyDown={onKey}
          className={cn('bg-background border border-primary outline-none px-1 rounded text-inherit w-full', className)}
        />
        <span
          className="absolute -top-8 right-0 z-[300] flex items-center gap-1 rounded-md border border-border bg-background/95 backdrop-blur px-1 py-1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button type="button" onClick={commit}
            className="h-5 w-5 inline-flex items-center justify-center rounded bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </button>
          <button type="button" onClick={cancel}
            className="h-5 w-5 inline-flex items-center justify-center rounded bg-muted text-muted-foreground">
            <X className="h-3 w-3" />
          </button>
        </span>
      </span>
    );
  }
  return (
    <p
      className={cn(className, 'cursor-text hover:ring-2 hover:ring-primary/50 rounded-sm')}
      onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditingKey(key); }}
      title="Double-clic pour modifier"
    >
      {currentLabel}
    </p>
  );
}
