/**
 * Confirmation de paiement — e-mail à la cliente et alerte à l'administration.
 *
 * ⚠️ Pourquoi ce module existe.
 * Jusqu'au 15/09/2026, les e-mails de commande n'étaient déclenchés que par le
 * bouton « Commander » du checkout (`handlePlaceOrder` → `send-order-confirmation`).
 * Les deux parcours de paiement en ligne — PayPal et PayPlug — avaient leur
 * propre chemin serveur et n'envoyaient rien : la cliente payait 169 € et ne
 * recevait aucun accusé, l'administration n'était pas prévenue non plus. Seul
 * l'e-mail « expédié » finissait par partir, plus tard, à l'étiquetage.
 *
 * La confirmation est désormais déclenchée là où le paiement devient certain,
 * côté serveur, donc quel que soit le chemin emprunté : webhook du prestataire,
 * retour du navigateur, ou régularisation manuelle.
 */

/** Client Supabase en clé de service (typage volontairement souple, comme ailleurs). */
// deno-lint-ignore no-explicit-any
type Db = any;

export interface ConfirmationResult {
  sent: boolean;
  reason?: 'already_sent' | 'order_not_found' | 'no_email' | 'send_failed';
  error?: string;
}

/**
 * Envoie la confirmation de paiement — **une seule fois par commande**.
 *
 * L'unicité ne repose pas sur une lecture préalable : deux appels simultanés
 * (le webhook et le navigateur de la cliente arrivent souvent dans la même
 * seconde) liraient tous deux « pas encore envoyé » et enverraient chacun leur
 * e-mail. On réserve donc la place par une INSERT, que l'index unique
 * `notification_log_payment_confirmation_once` fait échouer pour le perdant.
 *
 * N'échoue jamais bruyamment : un paiement encaissé ne doit pas être mis en
 * défaut parce qu'un e-mail n'est pas parti.
 */
export async function sendPaymentConfirmationOnce(
  db: Db,
  orderId: string,
): Promise<ConfirmationResult> {
  try {
    // 1. Relecture de la commande : les montants et les articles viennent de la
    //    base, jamais de l'appelant. C'est la même exigence que pour
    //    l'étiquetage Colissimo (COLISSIMO_ARBITRAGE.md §27.5).
    //
    //    Cette lecture précède la réservation parce que `notification_log`
    //    impose `recipient NOT NULL` : impossible de réserver la place sans
    //    connaître d'abord l'adresse de la cliente.
    const { data: order } = await db
      .from('orders')
      .select(
        'id, order_number, customer_name, customer_email, customer_address, items, subtotal, shipping_cost, total',
      )
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return { sent: false, reason: 'order_not_found' };

    const recipient = String(order.customer_email || '').trim();
    if (!recipient) return { sent: false, reason: 'no_email' };

    // 2. Réservation. Le premier arrivé gagne ; les autres reçoivent une
    //    violation d'unicité et s'arrêtent là. C'est l'INSERT qui fait office
    //    de verrou — une lecture « est-ce déjà envoyé ? » laisserait passer
    //    deux appels simultanés.
    const { error: claimError } = await db.from('notification_log').insert({
      order_id: orderId,
      channel: 'email',
      notification_type: 'payment_confirmation',
      status: 'pending',
      recipient,
      sent_at: null,
    });

    if (claimError) {
      // 23505 = unique_violation : quelqu'un d'autre s'en occupe déjà.
      if (String(claimError.code) === '23505') return { sent: false, reason: 'already_sent' };
      // Toute autre erreur (droits, contrainte) ne doit pas faire échouer le
      // paiement, mais doit rester visible dans les journaux.
      console.error('[payment-confirmation] réservation impossible', claimError.message);
      return { sent: false, reason: 'send_failed', error: claimError.message };
    }

    // L'adresse de notification de l'administration prime sur la valeur par
    // défaut de `_shared/mailer.ts`.
    const { data: adminCfg } = await db
      .from('admin_config')
      .select('admin_notification_email')
      .eq('config_key', 'main')
      .maybeSingle();

    // Le mode de livraison n'est pas stocké en clair : le checkout préfixe
    // l'adresse par « Point Relais: » quand la cliente en a choisi un.
    const deliveryMode = String(order.customer_address || '')
      .toLowerCase()
      .includes('point relais')
      ? 'relay'
      : 'home';

    const items = Array.isArray(order.items) ? order.items : [];

    const { error: invokeError } = await db.functions.invoke('send-order-confirmation', {
      body: {
        orderNumber: String(order.order_number || ''),
        customerName: String(order.customer_name || 'Client'),
        customerEmail: recipient,
        // deno-lint-ignore no-explicit-any
        items: items.map((it: any) => ({
          name: String(it?.name ?? ''),
          price: Number(it?.price) || 0,
          quantity: Number(it?.quantity) || 1,
          size: it?.size ?? undefined,
          color: it?.color ?? undefined,
          image: it?.image ?? undefined,
        })),
        subtotal: Number(order.subtotal) || 0,
        shippingCost: Number(order.shipping_cost) || 0,
        total: Number(order.total) || 0,
        deliveryMode,
        adminEmail: adminCfg?.admin_notification_email || undefined,
        // Déclenche l'objet « 💳 Commande payée … — à préparer » côté
        // administration, et le message « paiement confirmé » côté cliente.
        emailType: 'payment_confirmation',
      },
    });

    if (invokeError) {
      await markLog(db, orderId, 'failed', recipient, invokeError.message);
      console.error('[payment-confirmation] envoi échoué', order.order_number, invokeError.message);
      return { sent: false, reason: 'send_failed', error: invokeError.message };
    }

    await markLog(db, orderId, 'sent', recipient, null);
    return { sent: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[payment-confirmation]', message);
    return { sent: false, reason: 'send_failed', error: message };
  }
}

/**
 * Met à jour la ligne de réservation.
 *
 * ⚠️ On ne supprime pas la ligne en cas d'échec : la garder évite qu'un webhook
 * qui rejoue en boucle ne renvoie l'e-mail à chaque tentative. L'échec reste
 * visible dans l'écran Notifications, et un renvoi manuel reste possible depuis
 * la fiche commande.
 */
async function markLog(
  db: Db,
  orderId: string,
  status: 'sent' | 'failed',
  recipient: string,
  errorMessage: string | null,
) {
  try {
    await db
      .from('notification_log')
      .update({
        status,
        recipient,
        error_message: errorMessage,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .eq('order_id', orderId)
      .eq('notification_type', 'payment_confirmation');
  } catch (e) {
    console.error('[payment-confirmation] journalisation', e);
  }
}
