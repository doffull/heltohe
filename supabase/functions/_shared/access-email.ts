/**
 * Gabarit unique des e-mails « Accès & mot de passe ».
 * Utilisé par admin-team (création de rôle / lien admin) et par
 * password-reset-request (mot de passe oublié côté client).
 *
 * Règles anti-spam appliquées :
 *  - sujet court, sans majuscules ni ponctuation excessive
 *  - version texte brut complète
 *  - une seule URL cliquable, aucune image distante
 */

export type AccessEmailKind = 'new_access' | 'reset' | 'customer_reset';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  stock_manager: 'Responsable stock',
  preparator: 'Préparateur',
  auditor: 'Auditeur',
  order_validator: 'Valideur commandes',
};

export interface AccessEmailInput {
  email: string;
  link: string;
  kind: AccessEmailKind;
  role?: string;
  siteUrl?: string;
}

export interface AccessEmailOutput {
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

export function accessEmail(input: AccessEmailInput): AccessEmailOutput {
  const site = input.siteUrl || 'helvetica-mp.com';
  const isNew = input.kind === 'new_access';

  const subject = isNew
    ? 'Activez votre accès Helvetica MP'
    : 'Réinitialisation de votre mot de passe Helvetica MP';

  const title = isNew ? 'Votre accès est prêt' : 'Nouveau mot de passe';

  const intro = isNew
    ? "Un accès à l'espace Helvetica MP a été créé pour vous. Définissez votre mot de passe pour l'activer."
    : input.kind === 'customer_reset'
      ? 'Vous avez demandé à réinitialiser le mot de passe de votre compte Helvetica MP. Choisissez un nouveau mot de passe en suivant le lien ci-dessous.'
      : 'Vous pouvez définir un nouveau mot de passe pour votre accès Helvetica MP.';

  const roleLine = input.role
    ? `<p style="margin:0 0 16px;font-size:14px;color:#555;">Rôle attribué : <strong>${ROLE_LABELS[input.role] || input.role}</strong></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;">
<tr><td style="background:#111111;padding:28px 32px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">Helvetica MP</h1>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 12px;font-size:18px;color:#111111;">${title}</h2>
  <p style="margin:0 0 16px;font-size:14px;color:#555555;line-height:1.7;">${intro}</p>
  ${roleLine}
  <p style="margin:24px 0;text-align:center;">
    <a href="${input.link}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">Définir mon mot de passe</a>
  </p>
  <p style="margin:0 0 16px;font-size:13px;color:#555555;line-height:1.7;">Ce lien est valable 24 heures et ne peut être utilisé qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message : votre mot de passe actuel reste inchangé.</p>
  <p style="margin:0;font-size:12px;color:#888888;line-height:1.7;">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>
  <span style="word-break:break-all;color:#555555;">${input.link}</span></p>
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #f0f0f0;">
  <p style="margin:0;font-size:12px;color:#aaaaaa;text-align:center;line-height:1.8;">Message envoyé à ${input.email} par ${site}.</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    title,
    '',
    intro,
    input.role ? `Rôle attribué : ${ROLE_LABELS[input.role] || input.role}` : '',
    '',
    'Définissez votre mot de passe ici (lien valable 24 heures, usage unique) :',
    input.link,
    '',
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste inchangé.",
    '',
    `Message envoyé à ${input.email} par ${site}.`,
  ].filter(Boolean).join('\n');

  return {
    subject,
    html,
    text,
    headers: {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
    },
  };
}
