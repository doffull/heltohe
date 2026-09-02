/**
 * Expéditeur e-mail centralisé — envoi direct via l'API Resend.
 *
 * Secrets Edge Functions utilisés :
 *   RESEND_API_KEY   la clé d'API Resend — sans elle, aucun envoi
 *   MAIL_FROM        ex. shop@helvetica-mp.com (ou « Nom <adresse> »)
 *   MAIL_FROM_NAME   nom affiché de l'expéditeur
 *   MAIL_REPLY_TO    adresse de réponse, à défaut MAIL_FROM
 *   ADMIN_EMAIL      destinataire des alertes internes
 *
 * ⚠️ Le domaine de `MAIL_FROM` doit être VÉRIFIÉ chez Resend (SPF + DKIM),
 * sinon l'API refuse l'envoi avec un 403. C'est la première chose à regarder
 * si tout part en erreur d'un coup.
 *
 * Historique — ce module est passé par trois transports :
 *   1. la passerelle Lovable, retirée le 30/08 (dépendance externe inutile) ;
 *   2. SMTP direct o2switch (denomailer), introduit par Lovable début 09 ;
 *   3. Resend, rétabli le 02/09 — décision produit, cf. §19 de PROJECT.md.
 * Les `SMTP_*` ne sont plus lues NULLE PART : elles peuvent être supprimées
 * des secrets Supabase.
 */

const FALLBACK_FROM_EMAIL = 'onboarding@resend.dev';
const FALLBACK_FROM_NAME = 'HELVETICA-MP';

let fallbackWarned = false;

function env(name: string): string {
  return (Deno.env.get(name) || '').trim();
}

/**
 * Adresse d'expédition nue, sans nom affiché.
 *
 * `MAIL_FROM` accepte les deux formes : `adresse` ou `Nom <adresse>`.
 *
 * ⚠️ Absente, on retombe sur le domaine de test de Resend — l'envoi aboutit,
 * mais sans DKIM au nom du domaine, et Resend ne le délivre qu'aux adresses du
 * compte propriétaire. C'est un filet de dev, pas un mode de production : d'où
 * l'avertissement en logs.
 */
export function mailFromAddress(): string {
  const raw = env('MAIL_FROM');
  if (!raw) {
    if (!fallbackWarned) {
      console.warn(
        `[mailer] MAIL_FROM absent — repli sur ${FALLBACK_FROM_EMAIL} ` +
        `(domaine de test Resend, sans DKIM au nom du domaine).`,
      );
      fallbackWarned = true;
    }
    return FALLBACK_FROM_EMAIL;
  }
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

/** Nom affiché de l'expéditeur. */
export function mailFromName(): string {
  const explicit = env('MAIL_FROM_NAME');
  if (explicit) return explicit;
  // `MAIL_FROM` peut porter la forme complète « Nom <adresse> » : on en tire
  // le nom plutôt que de retomber bêtement sur la constante.
  const match = env('MAIL_FROM').match(/^\s*"?([^"<]+?)"?\s*</);
  return (match ? match[1] : FALLBACK_FROM_NAME).trim();
}

/** En-tête `From` complet : `Nom <adresse>`. */
export function mailFrom(): string {
  return `${mailFromName()} <${mailFromAddress()}>`;
}

/** Adresse de réponse. */
export function mailReplyTo(): string {
  return env('MAIL_REPLY_TO') || mailFromAddress();
}

/** Adresse e-mail de l'administrateur (alertes internes). */
export function adminEmailAddress(): string {
  return env('ADMIN_EMAIL') || mailFromAddress();
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
  /** Identifiant local du message (Message-ID), présent si l'envoi a réussi. */
  id?: string;
  /** Code HTTP renvoyé par Resend ; 0 si la requête n'a même pas abouti. */
  status: number;
  /** Message d'erreur lisible, présent seulement en cas d'échec. */
  error?: string;
}

/**
 * Seule `RESEND_API_KEY` est indispensable : `MAIL_FROM` a son propre repli
 * (cf. `mailFromAddress`), qui laisse l'envoi aboutir en dev.
 */
function missingConfig(): string | null {
  return env('RESEND_API_KEY') ? null : 'Configuration e-mail incomplète : RESEND_API_KEY';
}

/**
 * Envoi via l'API Resend, en direct (`api.resend.com`).
 * Ne lève jamais : renvoie toujours un SendMailResult, à l'appelant de décider
 * si l'échec est bloquant ou non.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const configError = missingConfig();
  if (configError) return { ok: false, status: 0, error: configError };

  // `text` est fourni à chaque fois, dérivé du HTML au besoin : un e-mail
  // « HTML seul » est nettement plus filtré en spam.
  const body: Record<string, unknown> = {
    from: input.from || mailFrom(),
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text || htmlToText(input.html),
    reply_to: input.replyTo || mailReplyTo(),
  };
  // Resend rejette `headers: {}` — on ne l'ajoute que s'il porte quelque chose.
  if (input.headers && Object.keys(input.headers).length > 0) {
    body.headers = input.headers;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env('RESEND_API_KEY')}`,
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

/** Traduit un échec Resend en message actionnable pour l'admin. */
export function explainSendFailure(result: SendMailResult): string {
  const raw = result.error || '';
  if (/Configuration e-mail incomplète/.test(raw)) return raw;
  if (result.status === 401 || result.status === 403) {
    // 403 = le plus souvent un domaine non vérifié, pas une clé invalide.
    return `Resend a refusé l'envoi [${result.status}] : vérifiez RESEND_API_KEY, et que le domaine de ${mailFromAddress() || 'MAIL_FROM'} est bien validé (SPF/DKIM) dans Resend.`;
  }
  if (result.status === 422) {
    return `Resend a rejeté le message [422] : adresse destinataire ou expéditeur invalide. ${raw}`;
  }
  if (result.status === 429) {
    return "Resend limite le débit [429] : trop d'envois par seconde. Réessayez dans un instant.";
  }
  if (result.status === 0) {
    return `Contact impossible avec Resend : ${raw || 'erreur réseau'}.`;
  }
  return raw || "Envoi e-mail refusé par Resend.";
}
