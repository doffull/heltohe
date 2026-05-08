let activeHud: HTMLDivElement | null = null;
let backdrop: HTMLDivElement | null = null;

export interface ValidationHUDOpts {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Lightweight DOM-based validation HUD.
 * Zero React re-renders — created once, removed on choice or manual hide.
 */
export function showValidationHUD(opts: ValidationHUDOpts) {
  hideValidationHUD();

  backdrop = document.createElement('div');
  backdrop.style.cssText =
    'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.12);pointer-events:none;transition:opacity 120ms ease;';
  document.body.appendChild(backdrop);

  activeHud = document.createElement('div');
  activeHud.style.cssText =
    'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:9999;' +
    'display:flex;align-items:center;gap:8px;' +
    'background:hsl(var(--background));border:2px solid hsl(var(--primary));' +
    'padding:6px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.25);' +
    'font:bold 10px/1 ui-monospace,monospace;letter-spacing:.05em;' +
    'pointer-events:auto;border-radius:2px;will-change:transform;';

  const label = document.createElement('span');
  label.textContent = opts.label;
  label.style.cssText = 'text-transform:uppercase;white-space:nowrap;';

  const ok = document.createElement('button');
  ok.textContent = '\u2713';
  ok.style.cssText =
    'background:hsl(var(--foreground));color:hsl(var(--background));border:none;' +
    'padding:3px 10px;font-size:12px;cursor:pointer;font-weight:bold;border-radius:2px;';
  ok.addEventListener('click', () => { hideValidationHUD(); opts.onConfirm(); });

  const ko = document.createElement('button');
  ko.textContent = '\u2715';
  ko.style.cssText =
    'background:transparent;color:hsl(var(--foreground));border:1px solid hsl(var(--foreground));' +
    'padding:3px 10px;font-size:12px;cursor:pointer;font-weight:bold;border-radius:2px;';
  ko.addEventListener('click', () => { hideValidationHUD(); opts.onCancel(); });

  activeHud.appendChild(label);
  activeHud.appendChild(ok);
  activeHud.appendChild(ko);
  document.body.appendChild(activeHud);

  // Animate in
  requestAnimationFrame(() => {
    if (activeHud) {
      activeHud.style.transition = 'transform 180ms cubic-bezier(.18,.89,.32,1.18), opacity 120ms ease';
      activeHud.style.opacity = '1';
      activeHud.style.transform = 'translateX(-50%) translateY(0)';
    }
  });
}

export function hideValidationHUD() {
  if (activeHud) { activeHud.remove(); activeHud = null; }
  if (backdrop) { backdrop.remove(); backdrop = null; }
}
