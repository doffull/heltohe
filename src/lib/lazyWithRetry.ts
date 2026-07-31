import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk-reload-ts";

/**
 * React.lazy wrapper that survives stale chunk hashes after a new deploy.
 * On a dynamic-import failure it retries once, then reloads the page (max once per minute).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      // Second chance: the network may have blipped.
      try {
        return await factory();
      } catch {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // Keep Suspense pending while the reload happens.
          return new Promise<{ default: T }>(() => {});
        }
        throw error;
      }
    }
  });
}
