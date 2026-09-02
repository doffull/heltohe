/**
 * Send Email Hook de Supabase Auth.
 *
 * Supabase délègue ici les 6 e-mails d'authentification (inscription, mot de passe
 * oublié, magic link, invitation, changement d'adresse, réauthentification) plutôt
 * que de les envoyer lui-même avec ses gabarits par défaut et son SMTP bridé.
 * L'envoi passe ensuite par Resend (cf. _shared/mailer.ts).
 *
 * ⚠️ Cette fonction n'est appelée QUE si le hook est activé dans le dashboard :
 *    Authentication → Hooks → Send Email Hook, URI
 *    https://<ref>.supabase.co/functions/v1/auth-email-hook
 *    Tant qu'il est éteint, ce code ne s'exécute jamais et Supabase reprend la main.
 *    C'est le moyen de revenir en arrière en cas de problème : désactiver le hook.
 *
 * Secrets nécessaires :
 *   SEND_EMAIL_HOOK_SECRET   fourni par le dashboard à la création du hook,
 *                            au format `v1,whsec_…`. Signe chaque requête entrante.
 *   RESEND_API_KEY           l'envoi lui-même (cf. _shared/mailer.ts)
 *   MAIL_FROM / MAIL_FROM_NAME / MAIL_REPLY_TO  l'expéditeur, commun à tout le site
 *
 * Le contenu vient des gabarits React Email de `_shared/email-templates/`, sauf si
 * l'admin a publié une version dans `auth_email_templates` (page /admin/emails-auth),
 * qui l'emporte alors.
 */

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'npm:standardwebhooks@1.0.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import {
  renderAuthEmailHtml,
  type AuthEmailContent,
} from '../_shared/auth-email-custom.ts'
import { sendMail } from '../_shared/mailer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

const SITE_NAME = 'HELVETICA-MP-OFFICIEL'
const ROOT_DOMAIN = 'helvetica-mp.com'

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirmez votre adresse e-mail',
  invite: 'Vous êtes invité',
  magiclink: 'Votre lien de connexion',
  recovery: 'Réinitialisation de votre mot de passe',
  email_change: 'Confirmez votre nouvelle adresse e-mail',
  reauthentication: 'Votre code de vérification',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

/**
 * Supabase émet plusieurs variantes d'un même e-mail (`email_change_current`,
 * `email_change_new`…). On les ramène au gabarit correspondant.
 */
function templateKey(actionType: string): string {
  if (actionType.startsWith('email_change')) return 'email_change'
  return actionType
}

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface HookPayload {
  user: {
    email: string
    new_email?: string | null
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

/**
 * Supabase ne transmet pas d'URL toute faite : il envoie un `token_hash` qu'il faut
 * assembler avec l'endpoint de vérification. Se tromper ici casse tous les liens de
 * confirmation sans que l'envoi n'échoue — d'où le soin apporté à l'encodage.
 */
function buildConfirmationUrl(
  tokenHash: string,
  actionType: string,
  redirectTo: string,
): string {
  const base = Deno.env.get('SUPABASE_URL')!
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo || `https://${ROOT_DOMAIN}`,
  })
  return `${base}/auth/v1/verify?${params.toString()}`
}

async function handleWebhook(req: Request): Promise<Response> {
  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  if (!hookSecret) {
    console.error('SEND_EMAIL_HOOK_SECRET non configuré')
    return jsonResponse(500, { error: 'Server configuration error' })
  }

  const rawBody = await req.text()
  const headers = Object.fromEntries(req.headers)

  // Le dashboard fournit le secret préfixé `v1,whsec_` ; la librairie attend la
  // partie base64 seule.
  const wh = new Webhook(hookSecret.replace('v1,whsec_', ''))

  let payload: HookPayload
  try {
    payload = wh.verify(rawBody, headers) as HookPayload
  } catch (error) {
    console.error('Signature de webhook invalide', {
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonResponse(401, { error: 'Invalid signature' })
  }

  const actionType = payload.email_data?.email_action_type || ''
  const key = templateKey(actionType)
  const EmailTemplate = EMAIL_TEMPLATES[key]
  if (!EmailTemplate) {
    console.error("Type d'e-mail inconnu", { actionType })
    return jsonResponse(400, { error: `Unknown email type: ${actionType}` })
  }

  // Sur la confirmation de la NOUVELLE adresse, le destinataire et le jeton
  // diffèrent : Supabase fournit un second couple `*_new`.
  const targetsNewAddress = actionType.endsWith('_new')
  const recipient = targetsNewAddress
    ? payload.user.new_email || payload.user.email
    : payload.user.email
  const tokenHash = targetsNewAddress
    ? payload.email_data.token_hash_new || payload.email_data.token_hash
    : payload.email_data.token_hash
  const token = targetsNewAddress
    ? payload.email_data.token_new || payload.email_data.token
    : payload.email_data.token

  console.log('Événement auth reçu', {
    actionType,
    email_redacted: redactEmail(recipient),
  })

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient,
    confirmationUrl: buildConfirmationUrl(
      tokenHash,
      actionType,
      payload.email_data.redirect_to,
    ),
    token,
    email: payload.user.email,
    oldEmail: payload.user.email,
    newEmail: payload.user.new_email ?? undefined,
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Version publiée depuis /admin/emails-auth : elle l'emporte sur le gabarit livré.
  let custom: AuthEmailContent | null = null
  try {
    const { data } = await supabase
      .from('auth_email_templates')
      .select('published')
      .eq('key', key)
      .maybeSingle()
    if (data?.published && typeof data.published === 'object') {
      custom = data.published as AuthEmailContent
    }
  } catch {
    console.error('Gabarit personnalisé illisible, repli sur le gabarit livré', { key })
  }

  let html: string
  let subject = EMAIL_SUBJECTS[key] || 'Notification'

  if (custom?.heading || custom?.body) {
    html = renderAuthEmailHtml(custom, templateProps)
    if (custom.subject) subject = custom.subject
  } else {
    html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  }

  const messageId = crypto.randomUUID()
  const sent = await sendMail({ to: recipient, subject, html })

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: key,
    recipient_email: recipient,
    status: sent.ok ? 'sent' : 'failed',
    error_message: sent.ok ? null : (sent.error || '').slice(0, 500),
  })

  if (!sent.ok) {
    console.error("Envoi de l'e-mail d'authentification refusé", {
      actionType,
      status: sent.status,
    })
    // Un 500 fait échouer l'action côté Supabase (l'inscription est annulée), ce qui
    // vaut mieux qu'un compte créé dont le propriétaire ne reçoit jamais le lien.
    return jsonResponse(500, { error: 'Failed to send email' })
  }

  console.log("E-mail d'authentification envoyé", {
    actionType,
    email_redacted: redactEmail(recipient),
    id: sent.id,
  })

  return jsonResponse(200, { success: true, id: sent.id })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})
