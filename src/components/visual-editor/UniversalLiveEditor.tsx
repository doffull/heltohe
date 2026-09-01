import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { EyeOff, Image as ImageIcon, Pencil, RotateCcw, Type } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useVisualEditor } from './VisualEditorProvider';
import { MediaLibraryDialog } from './MediaLibraryDialog';
import {
  applyOverrides,
  elementPath,
  isEditorChrome,
  isTextLeaf,
  routeKey,
  type PageOverride,
  type PageOverridesMap,
} from '@/lib/pageOverrides';

/**
 * Universal inline editor — works on 100% of the site's pages.
 *
 * Behaviour when an admin opens the Live Editor:
 *  - hovering any text/image shows an outline
 *  - clicking a text makes it editable in place (blur/Enter saves)
 *  - clicking an image opens the media library
 *  - a floating toolbar allows hiding the selected element or resetting the page
 *
 * All edits persist immediately in `designSettings.pageOverrides` keyed by route,
 * so they apply identically on mobile and desktop, preview and published site.
 */
export default function UniversalLiveEditor() {
  const { isOpen } = useVisualEditor();
  const { isAdmin } = useAuth();
  const { designSettings, updateDesignSettings } = useApp();
  const location = useLocation();
  const key = routeKey(location.pathname);

  const overridesMap = ((designSettings as any).pageOverrides || {}) as PageOverridesMap;
  const override: PageOverride | undefined = overridesMap[key];

  // La page d'accueil possède ses propres onglets dédiés dans le panneau.
  const active = isOpen && isAdmin && key !== '/';
  const [selected, setSelected] = useState<{ path: string; kind: 'text' | 'image' | 'other' } | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const editingRef = useRef<HTMLElement | null>(null);

  const persist = useCallback(
    (mutate: (draft: PageOverride) => PageOverride) => {
      const current: PageOverride = overridesMap[key] || {};
      const next = mutate({ ...current });
      updateDesignSettings(
        { pageOverrides: { ...overridesMap, [key]: next } } as any,
        { immediate: true },
      );
    },
    [key, overridesMap, updateDesignSettings],
  );

  // Re-apply overrides after each render / DOM change.
  useEffect(() => {
    applyOverrides(override);
    const observer = new MutationObserver(() => applyOverrides(override));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [override, location.pathname]);

  // Hover outline + click handling.
  useEffect(() => {
    if (!active) return;
    document.body.classList.add('lve-active');

    const over = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!el || isEditorChrome(el)) return;
      el.classList.add('lve-hover');
    };
    const out = (e: Event) => (e.target as HTMLElement)?.classList?.remove('lve-hover');

    const click = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el || isEditorChrome(el)) return;
      if (el.isContentEditable) return;

      if (el instanceof HTMLImageElement) {
        e.preventDefault();
        e.stopPropagation();
        setSelected({ path: elementPath(el), kind: 'image' });
        setMediaOpen(true);
        return;
      }

      if (isTextLeaf(el)) {
        e.preventDefault();
        e.stopPropagation();
        const path = elementPath(el);
        setSelected({ path, kind: 'text' });
        el.setAttribute('contenteditable', 'plaintext-only');
        el.classList.add('lve-editing');
        editingRef.current = el;
        el.focus();
        return;
      }

      setSelected({ path: elementPath(el), kind: 'other' });
    };

    const commit = () => {
      const el = editingRef.current;
      if (!el) return;
      const path = elementPath(el);
      const value = el.textContent || '';
      el.removeAttribute('contenteditable');
      el.classList.remove('lve-editing');
      editingRef.current = null;
      persist((draft) => ({ ...draft, texts: { ...(draft.texts || {}), [path]: value } }));
      toast.success('Texte enregistré');
    };

    const keydown = (e: KeyboardEvent) => {
      if (!editingRef.current) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        (editingRef.current as HTMLElement).blur();
      }
      if (e.key === 'Escape') {
        const el = editingRef.current;
        el.removeAttribute('contenteditable');
        el.classList.remove('lve-editing');
        editingRef.current = null;
        applyOverrides(override);
      }
    };

    document.addEventListener('mouseover', over, true);
    document.addEventListener('mouseout', out, true);
    document.addEventListener('click', click, true);
    document.addEventListener('focusout', commit, true);
    document.addEventListener('keydown', keydown, true);

    return () => {
      document.body.classList.remove('lve-active');
      document.removeEventListener('mouseover', over, true);
      document.removeEventListener('mouseout', out, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('focusout', commit, true);
      document.removeEventListener('keydown', keydown, true);
    };
  }, [active, override, persist]);

  if (!active) return null;

  const hideSelected = () => {
    if (!selected) return;
    persist((draft) => ({
      ...draft,
      hidden: Array.from(new Set([...(draft.hidden || []), selected.path])),
    }));
    setSelected(null);
    toast.success('Élément masqué');
  };

  const resetPage = () => {
    const next = { ...overridesMap };
    delete next[key];
    updateDesignSettings({ pageOverrides: next } as any, { immediate: true });
    toast.success('Page réinitialisée');
    setTimeout(() => window.location.reload(), 300);
  };

  return createPortal(
    <div data-editor-chrome="true">
      <div className="fixed bottom-4 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 shadow-2xl backdrop-blur">
        <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Pencil className="mr-1 inline h-3 w-3" />
          Édition live · {key}
        </span>
        <span className="text-[10px] text-muted-foreground">
          <Type className="mr-1 inline h-3 w-3" />
          Cliquez un texte
          <ImageIcon className="ml-2 mr-1 inline h-3 w-3" />
          ou une image
        </span>
        <button
          onClick={hideSelected}
          disabled={!selected}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
        >
          <EyeOff className="h-3 w-3" />
          Masquer
        </button>
        <button
          onClick={resetPage}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-destructive/40 px-2 text-[10px] font-bold uppercase tracking-wider text-destructive"
        >
          <RotateCcw className="h-3 w-3" />
          Réinitialiser
        </button>
      </div>

      <MediaLibraryDialog
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        title="Remplacer l'image"
        onSelect={(url: string) => {
          if (!selected) return;
          persist((draft) => ({ ...draft, images: { ...(draft.images || {}), [selected.path]: url } }));
          setMediaOpen(false);
          toast.success('Image remplacée');
        }}
      />
    </div>,
    document.body,
  );
}
