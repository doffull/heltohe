/**
 * Récupère le message d'erreur réel d'une edge function.
 *
 * `supabase.functions.invoke()` ne met PAS le corps de la réponse dans `data`
 * quand le statut n'est pas 2xx : il renvoie un `FunctionsHttpError` dont le
 * `.message` vaut toujours « Edge Function returned a non-2xx status code ».
 * Le JSON utile — `{ error: "…" }` — se trouve dans `error.context`, qui est la
 * `Response` d'origine.
 *
 * Sans ce déballage, toutes les fonctions ont beau renvoyer des messages
 * explicites, l'utilisateur ne voit que le message générique. C'est
 * précisément ce que le client a remonté sur l'essai virtuel (ANO-001).
 *
 * Usage :
 *   const { data, error } = await supabase.functions.invoke('ma-fonction', {...});
 *   if (error) throw new Error(await edgeErrorMessage(error));
 */
export async function edgeErrorMessage(error: unknown, fallback = 'Erreur inconnue'): Promise<string> {
  const err = error as { message?: string; context?: unknown };

  const ctx = err?.context as Response | undefined;
  if (ctx && typeof (ctx as Response).text === 'function') {
    try {
      // `context` n'est lisible qu'une fois : on passe par le texte brut pour
      // rester tolérant si la réponse n'est pas du JSON.
      const raw = await (ctx as Response).clone().text();
      if (raw) {
        try {
          const body = JSON.parse(raw) as { error?: unknown; message?: unknown };
          const msg = body?.error ?? body?.message;
          if (typeof msg === 'string' && msg.trim()) return msg.trim();
        } catch {
          if (raw.trim() && raw.length < 300) return raw.trim();
        }
      }
    } catch {
      /* corps illisible → on retombe sur le message générique */
    }
  }

  if (typeof err?.message === 'string' && err.message.trim()) return err.message.trim();
  return fallback;
}
