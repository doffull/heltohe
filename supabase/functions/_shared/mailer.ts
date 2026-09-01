/**
 * Expéditeur e-mail centralisé.
 *
 * Toutes les fonctions qui envoient un e-mail transactionnel lisent leur
 * expéditeur ICI, jamais en dur. Trois secrets Edge Functions pilotent l'ensemble :
 *
 *   MAIL_FROM       adresse d'expédition        ex. commandes@site.helvetica-mp.com
 *   MAIL_FROM_NAME  nom affiché (optionnel)     ex. HELVETICA-MP
 *   MAIL_REPLY_TO   adresse de réponse          ex. contact@helvetica-mp.com
 *                   → si absente, on retombe sur MAIL_FROM
 *
 * ⚠️ Le domaine de MAIL_FROM doit être vérifié dans Resend (SPF + DKIM), sinon
 *    l'envoi est refusé. Le domaine de MAIL_REPLY_TO, lui, n'a rien à prouver :
 *    c'est une boîte de réception ordinaire.
 *
 * Le repli sur `onboarding@resend.dev` n'est pas un défaut acceptable en
 * production — c'est un filet pour que les e-mails ne cessent pas de partir si
 * le secret n'a pas encore été posé. Il journalise un avertissement.
 */

const FALLBACK_FROM_EMAIL = 'onboarding@resend.dev';
const FALLBACK_FROM_NAME = 'HELVETICA-MP';

let fallbackWarned = false;

/** Adresse d'expédition nue, sans nom affiché. */
export function mailFromAddress(): string {
  const configured = (Deno.env.get('MAIL_FROM') || '').trim();
  if (configured) return configured;

  if (!fallbackWarned) {
    console.warn(
      `[mailer] MAIL_FROM absent — repli sur ${FALLBACK_FROM_EMAIL} ` +
      `(domaine de test Resend, sans DKIM au nom du domaine).`,
    );
    fallbackWarned = true;
  }
  return FALLBACK_FROM_EMAIL;
}

/** Nom affiché de l'expéditeur. */
export function mailFromName(): string {
  return (Deno.env.get('MAIL_FROM_NAME') || '').trim() || FALLBACK_FROM_NAME;
}

/** En-tête `From` complet, prêt pour l'API : `Nom <adresse>`. */
export function mailFrom(): string {
  return `${mailFromName()} <${mailFromAddress()}>`;
}

/** Adresse de réponse. MAIL_REPLY_TO si définie, sinon l'adresse d'expédition. */
export function mailReplyTo(): string {
  return (Deno.env.get('MAIL_REPLY_TO') || '').trim() || mailFromAddress();
}

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
  /** Version texte brut. Fortement recommandée : son absence pénalise la délivrabilité. */
  text?: string;
  /** Surcharge ponctuelle du `From` complet (`Nom <adresse>`). Rare. */
  from?: string;
  /** Surcharge ponctuelle de l'adresse de réponse. Rare. */
  replyTo?: string;
  /** En-têtes additionnels (List-Unsubscribe, etc.). */
  headers?: Record<string, string>;
}

/** Version texte brut dérivée du HTML : évite les e-mails « HTML seul » filtrés en spam. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
    .trim();
}


export interface SendMailResult {
  ok: boolean;
  /** Identifiant Resend du message, présent seulement si l'envoi a réussi. */
  id?: string;
  /** Code HTTP renvoyé par Resend ; 0 si la requête n'a même pas abouti. */
  status: number;
  /** Message d'erreur lisible, présent seulement en cas d'échec. */
  error?: string;
}

/**
 * Envoi via l'API Resend, en direct (`api.resend.com`).
 * Ne lève jamais : renvoie toujours un SendMailResult, à l'appelant de décider
 * si l'échec est bloquant ou non.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return { ok: false, status: 0, error: 'RESEND_API_KEY non configurée' };
  }

  const body = {
    from: input.from || mailFrom(),
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    reply_to: input.replyTo || mailReplyTo(),
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`[mailer] Resend a refusé l'envoi [${res.status}]: ${text}`);
      return { ok: false, status: res.status, error: text };
    }

    let id: string | undefined;
    try {
      id = JSON.parse(text)?.id;
    } catch {
      // Resend renvoie du JSON ; si ce n'est pas le cas, l'envoi reste valide.
    }
    return { ok: true, status: res.status, id };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[mailer] Envoi impossible : ${error}`);
    return { ok: false, status: 0, error };
  }
}

/**
 * Traduit un échec Resend en message actionnable pour l'admin.
 * Le cas le plus fréquent : aucun domaine vérifié dans Resend, donc l'API
 * n'autorise l'envoi qu'à l'adresse du propriétaire du compte.
 */
export function explainSendFailure(result: SendMailResult): string {
  const raw = result.error || '';
  if (result.status === 0 && /RESEND_API_KEY/.test(raw)) {
    return "Clé Resend absente : impossible d'envoyer des e-mails.";
  }
  if (result.status === 403 && /your own email address|verify a domain/i.test(raw)) {
    return (
      "Aucun domaine d'expédition vérifié : Resend n'accepte que l'adresse du " +
      "propriétaire du compte. Vérifiez un domaine sur resend.com/domains " +
      "(ex. mail.helvetica-mp.com), puis renseignez le secret MAIL_FROM " +
      "(ex. commandes@mail.helvetica-mp.com)."
    );
  }
  if (result.status === 422) {
    return "Adresse d'expédition refusée : le domaine de MAIL_FROM n'est pas vérifié dans Resend.";
  }
  return raw || "Envoi e-mail refusé par Resend.";
}
