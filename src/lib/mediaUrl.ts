/**
 * Media URL validation helpers.
 *
 * Any URL beginning with `blob:`, `data:` or `file:` is a temporary
 * browser-only reference. Writing one to the database produces the classic
 * "works in preview, broken after publish / after refresh" bug — the URL is
 * unreachable to any other visitor and eventually becomes unreachable to the
 * uploader too.
 *
 * Use `isPersistableUrl` right before persisting a user-supplied media URL,
 * and `sanitizePersistableUrl` to drop offending values without throwing.
 */
export function isPersistableUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0) return false;
  const lower = url.toLowerCase().trim();
  if (lower.startsWith('blob:')) return false;
  if (lower.startsWith('data:')) return false;
  if (lower.startsWith('file:')) return false;
  return true;
}

/** Returns the URL when persistable, otherwise `null`. */
export function sanitizePersistableUrl(url: unknown): string | null {
  return isPersistableUrl(url) ? url : null;
}

/** Filter an array of URLs, keeping only persistable ones. */
export function sanitizePersistableUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter(isPersistableUrl) as string[];
}
