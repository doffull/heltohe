// Renderer for admin-customized auth emails.
// Keep in sync with supabase/functions/_shared/auth-email-custom.ts (same output).

export interface AuthEmailBrand {
  primary?: string;
  primaryText?: string;
  headingColor?: string;
  textColor?: string;
  background?: string;
  radius?: string;
  fontFamily?: string;
  logoUrl?: string;
  logoWidth?: number;
}

export interface AuthEmailContent {
  subject?: string;
  preheader?: string;
  heading?: string;
  body?: string;
  buttonLabel?: string;
  showButton?: boolean;
  footer?: string;
  brand?: AuthEmailBrand;
}

export interface AuthEmailVars {
  siteName?: string;
  siteUrl?: string;
  recipient?: string;
  confirmationUrl?: string;
  token?: string;
  newEmail?: string;
}

export const AUTH_EMAIL_KEYS = [
  'signup',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
  'reauthentication',
] as const;

export type AuthEmailKey = (typeof AUTH_EMAIL_KEYS)[number];

export const AUTH_EMAIL_LABELS: Record<AuthEmailKey, string> = {
  signup: "Confirmation d'inscription",
  magiclink: 'Lien de connexion (magic link)',
  recovery: 'Réinitialisation du mot de passe',
  invite: 'Invitation',
  email_change: "Changement d'adresse e-mail",
  reauthentication: 'Code de vérification',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function interpolate(input: string, vars: AuthEmailVars): string {
  return (input || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const val = (vars as Record<string, string | undefined>)[key];
    return val == null ? '' : String(val);
  });
}

const DEFAULT_BRAND: Required<Omit<AuthEmailBrand, 'logoUrl' | 'logoWidth'>> = {
  primary: '#000000',
  primaryText: '#ffffff',
  headingColor: '#000000',
  textColor: '#55575d',
  background: '#ffffff',
  radius: '8px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

export function renderAuthEmailHtml(content: AuthEmailContent, vars: AuthEmailVars): string {
  const b = { ...DEFAULT_BRAND, ...(content.brand || {}) };
  const heading = escapeHtml(interpolate(content.heading || '', vars));
  const preheader = escapeHtml(interpolate(content.preheader || '', vars));
  const footer = escapeHtml(interpolate(content.footer || '', vars));
  const buttonLabel = escapeHtml(interpolate(content.buttonLabel || '', vars));
  const url = interpolate(content.showButton === false ? '' : vars.confirmationUrl || '', vars);

  const paragraphs = interpolate(content.body || '', vars)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="font-size:14px;line-height:1.6;color:${b.textColor};margin:0 0 20px;">${escapeHtml(
          p,
        ).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  const logo = content.brand?.logoUrl
    ? `<img src="${escapeHtml(content.brand.logoUrl)}" width="${
        content.brand.logoWidth || 120
      }" alt="${escapeHtml(vars.siteName || '')}" style="display:block;margin:0 0 24px;border:0;" />`
    : '';

  const button =
    content.showButton === false || !url
      ? ''
      : `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-radius:${b.radius};background:${b.primary};"><a href="${escapeHtml(
          url,
        )}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:bold;color:${b.primaryText};text-decoration:none;border-radius:${b.radius};">${
          buttonLabel || 'Continuer'
        }</a></td></tr></table>`;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${heading}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${b.fontFamily};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${b.background};border-radius:${b.radius};"><tr><td style="padding:28px 26px;">
${logo}
<h1 style="font-size:22px;font-weight:bold;color:${b.headingColor};margin:0 0 20px;">${heading}</h1>
${paragraphs}
${button}
${footer ? `<p style="font-size:12px;color:#999999;margin:28px 0 0;line-height:1.5;">${footer}</p>` : ''}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

export function renderAuthEmailText(content: AuthEmailContent, vars: AuthEmailVars): string {
  const lines = [interpolate(content.heading || '', vars), '', interpolate(content.body || '', vars)];
  if (content.showButton !== false && vars.confirmationUrl) {
    lines.push('', `${interpolate(content.buttonLabel || 'Continuer', vars)}: ${vars.confirmationUrl}`);
  }
  if (content.footer) lines.push('', interpolate(content.footer, vars));
  return lines.join('\n').trim();
}

const BASE_BRAND: AuthEmailBrand = {
  primary: '#000000',
  primaryText: '#ffffff',
  headingColor: '#000000',
  textColor: '#55575d',
  background: '#ffffff',
  radius: '2px',
  fontFamily: 'Helvetica, Arial, sans-serif',
};

export const DEFAULT_AUTH_EMAIL_CONTENT: Record<AuthEmailKey, AuthEmailContent> = {
  signup: {
    subject: 'Confirmez votre adresse e-mail',
    preheader: 'Activez votre compte {{siteName}}',
    heading: 'Confirmez votre e-mail',
    body: 'Merci de votre inscription sur {{siteName}}.\n\nConfirmez votre adresse ({{recipient}}) en cliquant sur le bouton ci-dessous.',
    buttonLabel: 'Confirmer mon e-mail',
    footer: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.",
    showButton: true,
    brand: BASE_BRAND,
  },
  magiclink: {
    subject: 'Votre lien de connexion',
    preheader: 'Connectez-vous à {{siteName}}',
    heading: 'Votre lien de connexion',
    body: 'Cliquez sur le bouton ci-dessous pour vous connecter à {{siteName}}. Ce lien est valable une seule fois.',
    buttonLabel: 'Se connecter',
    footer: "Si vous n'avez pas demandé ce lien, ignorez cet e-mail.",
    showButton: true,
    brand: BASE_BRAND,
  },
  recovery: {
    subject: 'Réinitialisez votre mot de passe',
    preheader: 'Nouveau mot de passe {{siteName}}',
    heading: 'Réinitialisez votre mot de passe',
    body: 'Vous avez demandé la réinitialisation de votre mot de passe sur {{siteName}}.\n\nCliquez sur le bouton ci-dessous pour en choisir un nouveau.',
    buttonLabel: 'Choisir un nouveau mot de passe',
    footer: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    showButton: true,
    brand: BASE_BRAND,
  },
  invite: {
    subject: 'Vous êtes invité(e)',
    preheader: 'Rejoignez {{siteName}}',
    heading: 'Vous êtes invité(e)',
    body: 'Vous avez été invité(e) à rejoindre {{siteName}}.\n\nAcceptez l’invitation en cliquant ci-dessous.',
    buttonLabel: "Accepter l'invitation",
    footer: 'Cette invitation est personnelle et à usage unique.',
    showButton: true,
    brand: BASE_BRAND,
  },
  email_change: {
    subject: 'Confirmez votre nouvelle adresse e-mail',
    preheader: 'Validation du changement d’e-mail',
    heading: 'Confirmez votre nouvelle adresse',
    body: 'Vous avez demandé à remplacer votre adresse e-mail par {{newEmail}}.\n\nConfirmez ce changement en cliquant ci-dessous.',
    buttonLabel: 'Confirmer le changement',
    footer: "Si vous n'êtes pas à l'origine de cette demande, contactez-nous.",
    showButton: true,
    brand: BASE_BRAND,
  },
  reauthentication: {
    subject: 'Votre code de vérification',
    preheader: 'Code de sécurité {{siteName}}',
    heading: 'Votre code de vérification',
    body: 'Saisissez ce code pour confirmer votre identité :\n\n{{token}}',
    buttonLabel: '',
    footer: 'Ce code expire dans quelques minutes.',
    showButton: false,
    brand: BASE_BRAND,
  },
};

export const AUTH_EMAIL_SAMPLE_VARS: AuthEmailVars = {
  siteName: 'HELVETICA-MP',
  siteUrl: 'https://helvetica-mp.com',
  recipient: 'client@example.com',
  confirmationUrl: 'https://helvetica-mp.com/auth/confirm?token=exemple',
  token: '123456',
  newEmail: 'nouvelle@example.com',
};
