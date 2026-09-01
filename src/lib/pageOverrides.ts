/**
 * Universal live-edit overrides.
 *
 * Every page of the site (except the Home page, which has its own dedicated
 * editor tabs) can be edited inline by an admin. Edits are stored per route in
 * `designSettings.pageOverrides` and re-applied to the DOM on every render.
 *
 * A target is identified by a stable structural path computed from the document
 * root (tag + sibling index chain), which survives re-renders because React
 * keeps element order stable for a given route.
 */

export interface PageOverride {
  /** structural path → replacement text */
  texts?: Record<string, string>;
  /** structural path → replacement image url */
  images?: Record<string, string>;
  /** structural paths of elements hidden by the admin */
  hidden?: string[];
  /** extra blocks appended at the end of the page main content */
  blocks?: { id: string; kind: 'text' | 'heading' | 'image'; value: string }[];
}

export type PageOverridesMap = Record<string, PageOverride>;

/** Normalizes a location pathname into an override key. */
export function routeKey(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

/** Elements belonging to the editor chrome must never be targeted. */
export function isEditorChrome(el: Element | null): boolean {
  return !!el?.closest('[data-editor-chrome="true"]');
}

/** Computes a stable structural path for an element. */
export function elementPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.body) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((c) => !SKIP.has(c.tagName));
    const idx = siblings.indexOf(node);
    parts.unshift(`${node.tagName.toLowerCase()}:${idx}`);
    node = parent;
  }
  return parts.join('/');
}

/** Resolves a structural path back to an element, or null when absent. */
export function pathToElement(path: string): Element | null {
  if (!path) return null;
  let node: Element | null = document.body;
  for (const part of path.split('/')) {
    if (!node) return null;
    const [tag, rawIdx] = part.split(':');
    const idx = Number(rawIdx);
    const siblings = Array.from(node.children).filter((c) => !SKIP.has(c.tagName));
    const candidate = siblings[idx];
    if (!candidate || candidate.tagName.toLowerCase() !== tag) return null;
    node = candidate;
  }
  return node === document.body ? null : node;
}

/** True when the element holds simple editable text (no element children). */
export function isTextLeaf(el: Element): boolean {
  if (!el.textContent?.trim()) return false;
  return !Array.from(el.children).some((c) => !SKIP.has(c.tagName));
}

/** Applies stored overrides to the current DOM. Safe to call repeatedly. */
export function applyOverrides(override: PageOverride | undefined) {
  if (!override) return;
  Object.entries(override.texts || {}).forEach(([path, value]) => {
    const el = pathToElement(path);
    if (el && !isEditorChrome(el) && el.textContent !== value) el.textContent = value;
  });
  Object.entries(override.images || {}).forEach(([path, value]) => {
    const el = pathToElement(path);
    if (el instanceof HTMLImageElement && value && el.getAttribute('src') !== value) {
      el.setAttribute('src', value);
    }
  });
  (override.hidden || []).forEach((path) => {
    const el = pathToElement(path);
    if (el instanceof HTMLElement && !isEditorChrome(el)) el.style.display = 'none';
  });
}

export function countEdits(override: PageOverride | undefined): number {
  if (!override) return 0;
  return (
    Object.keys(override.texts || {}).length +
    Object.keys(override.images || {}).length +
    (override.hidden?.length || 0) +
    (override.blocks?.length || 0)
  );
}
