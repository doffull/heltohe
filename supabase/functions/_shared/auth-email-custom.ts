// Renderer for admin-customized auth emails.
// Keep in sync with src/lib/authEmailTemplate.ts (same output).

export interface AuthEmailBrand {
  primary?: string
  primaryText?: string
  headingColor?: string
  textColor?: string
  background?: string
  radius?: string
  fontFamily?: string
  logoUrl?: string
  logoWidth?: number
}

export interface AuthEmailContent {
  subject?: string
  preheader?: string
  heading?: string
  body?: string
  buttonLabel?: string
  showButton?: boolean
  footer?: string
  brand?: AuthEmailBrand
}

export interface AuthEmailVars {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
  token?: string
  newEmail?: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function interpolate(input: string, vars: AuthEmailVars): string {
  return (input || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const val = (vars as Record<string, string | undefined>)[key]
    return val == null ? '' : String(val)
  })
}

const DEFAULT_BRAND: Required<Omit<AuthEmailBrand, 'logoUrl' | 'logoWidth'>> = {
  primary: '#000000',
  primaryText: '#ffffff',
  headingColor: '#000000',
  textColor: '#55575d',
  background: '#ffffff',
  radius: '8px',
  fontFamily: 'Arial, Helvetica, sans-serif',
}

export function renderAuthEmailHtml(content: AuthEmailContent, vars: AuthEmailVars): string {
  const b = { ...DEFAULT_BRAND, ...(content.brand || {}) }
  const heading = escapeHtml(interpolate(content.heading || '', vars))
  const preheader = escapeHtml(interpolate(content.preheader || '', vars))
  const footer = escapeHtml(interpolate(content.footer || '', vars))
  const buttonLabel = escapeHtml(interpolate(content.buttonLabel || '', vars))
  const url = interpolate(content.showButton === false ? '' : vars.confirmationUrl || '', vars)

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
    .join('')

  const logo = content.brand?.logoUrl
    ? `<img src="${escapeHtml(content.brand.logoUrl)}" width="${
        content.brand.logoWidth || 120
      }" alt="${escapeHtml(vars.siteName || '')}" style="display:block;margin:0 0 24px;border:0;" />`
    : ''

  const button =
    content.showButton === false || !url
      ? ''
      : `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-radius:${b.radius};background:${b.primary};"><a href="${escapeHtml(
          url,
        )}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:bold;color:${b.primaryText};text-decoration:none;border-radius:${b.radius};">${
          buttonLabel || 'Continuer'
        }</a></td></tr></table>`

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
</body></html>`
}

export function renderAuthEmailText(content: AuthEmailContent, vars: AuthEmailVars): string {
  const lines = [
    interpolate(content.heading || '', vars),
    '',
    interpolate(content.body || '', vars),
  ]
  if (content.showButton !== false && vars.confirmationUrl) {
    lines.push('', `${interpolate(content.buttonLabel || 'Continuer', vars)}: ${vars.confirmationUrl}`)
  }
  if (content.footer) lines.push('', interpolate(content.footer, vars))
  return lines.join('\n').trim()
}
