import { useApp } from '@/context/AppContext';

/**
 * Typed get/set for a single key inside `designSettings`.
 * Used by EditableImage / EditableCta / EditableText to mutate the global
 * design store from anywhere in the tree.
 */
export function useEditableSetting<T = any>(key: string): [T | undefined, (value: T) => void] {
  const { designSettings, updateDesignSettings } = useApp();
  const value = (designSettings as any)?.[key] as T | undefined;
  const setValue = (v: T) => updateDesignSettings({ [key]: v } as any);
  return [value, setValue];
}

/**
 * Helper to read/update a nested value in `designSettings` using dot path
 * (e.g. "heroSlides.0.cta.label"). Returns [value, setValue].
 */
export function useEditablePath<T = any>(path: string): [T | undefined, (value: T) => void] {
  const { designSettings, updateDesignSettings } = useApp();
  const parts = path.split('.');
  let cur: any = designSettings;
  for (const p of parts) cur = cur?.[Array.isArray(cur) ? Number(p) : p];

  const setValue = (v: T) => {
    const next: any = Array.isArray(designSettings) ? [...(designSettings as any)] : { ...(designSettings as any) };
    let node: any = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const k: any = Array.isArray(node) ? Number(parts[i]) : parts[i];
      const child = node[k];
      node[k] = Array.isArray(child) ? [...child] : { ...(child || {}) };
      node = node[k];
    }
    const last: any = Array.isArray(node) ? Number(parts[parts.length - 1]) : parts[parts.length - 1];
    node[last] = v;
    // Only push the first-level key we mutated to the store.
    const rootKey = parts[0];
    updateDesignSettings({ [rootKey]: next[rootKey] } as any);
  };

  return [cur as T, setValue];
}
