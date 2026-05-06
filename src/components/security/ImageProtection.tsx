import { useEffect } from 'react';

/**
 * Site-wide image and content protection.
 * - Disables right-click, drag, selection, copy on images
 * - Blocks DevTools shortcuts (dissuasive only)
 * - Combines with global CSS rules in index.css
 */
export function ImageProtection() {
  useEffect(() => {
    const isInteractive = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      return !!el.closest('input, textarea, [contenteditable="true"], [data-allow-interact]');
    };

    const onContextMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'IMG' || t.closest('.protected-image-wrap') || !isInteractive(t)) {
        e.preventDefault();
      }
    };
    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'IMG' || t.closest('.protected-image-wrap')) e.preventDefault();
    };
    const onCopy = (e: ClipboardEvent) => {
      if (!isInteractive(e.target)) e.preventDefault();
    };
    const onSelectStart = (e: Event) => {
      if (!isInteractive(e.target)) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // F12
      if (e.key === 'F12') { e.preventDefault(); return; }
      // Ctrl/Cmd+U (view source) or Ctrl/Cmd+S (save page)
      if ((e.ctrlKey || e.metaKey) && (k === 'u' || k === 's')) { e.preventDefault(); return; }
      // Ctrl+Shift+I/J/C  or  Cmd+Opt+I/J/C
      if ((e.ctrlKey && e.shiftKey) || (e.metaKey && e.altKey)) {
        if (['i', 'j', 'c'].includes(k)) e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('copy', onCopy);
    document.addEventListener('selectstart', onSelectStart);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('selectstart', onSelectStart);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return null;
}
