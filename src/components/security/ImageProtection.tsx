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
      if (!e.key || typeof e.key !== 'string') return;
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

    // Anti-screenshot dissuasion : uniquement sur PrintScreen desktop
    // (le floutage sur perte de focus a été retiré : il gênait les vidéos,
    // le password manager, l'autofill et les iframes.)
    const applyBlur = () => document.body.classList.add('screenshot-blur');
    const removeBlur = () => document.body.classList.remove('screenshot-blur');

    // Détection PrintScreen (desktop) : vide le presse-papier
    const onScreenshotKey = (e: KeyboardEvent) => {
      if (!e.key) return;
      const k = e.key.toLowerCase();
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(k))) {
        try { navigator.clipboard?.writeText(''); } catch { /* noop */ }
        applyBlur();
        setTimeout(removeBlur, 800);
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('copy', onCopy);
    document.addEventListener('selectstart', onSelectStart);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onScreenshotKey);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('selectstart', onSelectStart);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onScreenshotKey);
      removeBlur();
    };
  }, []);

  return null;
}

