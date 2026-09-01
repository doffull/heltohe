/** Gabarits e-mail newsletter (confirmation double opt-in + campagne). */

const BRAND = 'HELVETICA MOUNTAIN PIONEERS';

function shell(inner: string, footer: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#111111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #e5e5e5;">
        <tr><td style="padding:24px;border-bottom:1px solid #e5e5e5;text-align:center;">
          <span style="font-size:13px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">${BRAND}</span>
        </td></tr>
        <tr><td style="padding:28px 24px;font-size:15px;line-height:1.6;">${inner}</td></tr>
        <tr><td style="padding:18px 24px;border-top:1px solid #e5e5e5;font-size:11px;color:#777777;line-height:1.6;">${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background-color:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${label}</a></p>`;
}

export function confirmEmail(confirmUrl: string): { subject: string; html: string; text: string } {
  const inner = `
    <p style="margin:0 0 12px;font-size:18px;font-weight:bold;">Confirmez votre inscription</p>
    <p style="margin:0;">Merci de votre intérêt. Cliquez sur le bouton ci-dessous pour confirmer votre inscription à notre newsletter.</p>
    ${button('Je confirme', confirmUrl)}
    <p style="margin:0;font-size:12px;color:#777777;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>`;
  return {
    subject: 'Confirmez votre inscription à la newsletter',
    html: shell(inner, `Lien de confirmation : ${confirmUrl}`),
    text: `Confirmez votre inscription à la newsletter : ${confirmUrl}`,
  };
}

export interface CampaignContent {
  subject: string;
  preheader?: string | null;
  content: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export function campaignEmail(c: CampaignContent, unsubscribeUrl: string) {
  const paragraphs = String(c.content || '')
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
  const inner = `
    ${c.preheader ? `<p style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#777777;">${c.preheader}</p>` : ''}
    ${c.imageUrl ? `<p style="margin:0 0 18px;"><img src="${c.imageUrl}" alt="" width="512" style="max-width:100%;height:auto;display:block;" /></p>` : ''}
    ${paragraphs}
    ${c.ctaLabel && c.ctaUrl ? button(c.ctaLabel, c.ctaUrl) : ''}`;
  const footer = `Vous recevez cet e-mail car vous êtes inscrit à notre newsletter.<br/>
    <a href="${unsubscribeUrl}" style="color:#777777;">Se désabonner en un clic</a>`;
  return {
    subject: c.subject,
    html: shell(inner, footer),
    text: `${c.content}\n\n${c.ctaUrl ? `${c.ctaLabel}: ${c.ctaUrl}\n\n` : ''}Se désabonner : ${unsubscribeUrl}`,
  };
}
