/**
 * Verrou de domaine + licence (protection du code livré à un tiers).
 *
 * Le build protégé (`bun run build:protected`) injecte la liste des domaines
 * autorisés via `VITE_LICENSE_DOMAINS` et une clé de licence via
 * `VITE_LICENSE_KEY`. Si l'application est déployée sur un domaine non
 * autorisé, elle refuse de démarrer.
 *
 * En développement (localhost, previews Lovable) le verrou est inactif.
 */

const ALWAYS_ALLOWED = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '.lovable.app',
  '.lovableproject.com',
  '.lovable.dev',
];

function hostMatches(host: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!p) return false;
  if (p.startsWith('.')) return host === p.slice(1) || host.endsWith(p);
  if (p.startsWith('*.')) return host === p.slice(2) || host.endsWith(p.slice(1));
  return host === p;
}

export function getAllowedDomains(): string[] {
  const raw = (import.meta.env.VITE_LICENSE_DOMAINS as string | undefined) || '';
  return raw.split(',').map((d) => d.trim()).filter(Boolean);
}

export function isLicensedHost(host = window.location.hostname.toLowerCase()): boolean {
  if (ALWAYS_ALLOWED.some((p) => hostMatches(host, p))) return true;
  const allowed = getAllowedDomains();
  // Aucun domaine configuré → build non protégé, on n'entrave rien.
  if (allowed.length === 0) return true;
  return allowed.some((p) => hostMatches(host, p));
}

/** Affiche un écran de blocage et empêche le montage de l'application. */
export function renderLicenseBlock(root: HTMLElement) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:Helvetica,Arial,sans-serif;padding:24px;text-align:center">
      <div style="max-width:520px">
        <p style="font-size:11px;letter-spacing:.35em;text-transform:uppercase;opacity:.6;margin:0 0 12px">Licence</p>
        <h1 style="font-size:22px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 12px">Déploiement non autorisé</h1>
        <p style="font-size:13px;line-height:1.6;opacity:.75;margin:0">
          Cette application est protégée. Le domaine <strong>${window.location.hostname}</strong>
          ne figure pas dans la licence d'exploitation. Contactez le titulaire des droits
          pour obtenir une autorisation de déploiement.
        </p>
      </div>
    </div>`;
}

/** À appeler avant le montage de React. Retourne false si le montage doit être annulé. */
export function enforceLicense(root: HTMLElement): boolean {
  if (isLicensedHost()) return true;
  renderLicenseBlock(root);
  return false;
}
