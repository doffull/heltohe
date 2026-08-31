/**
 * Formatage des prix — le catalogue est stocké TTC (TVA 20 % incluse).
 */

export function formatPrice(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n.toFixed(2)}€`;
}

/** Prix avec la mention légale « TTC » (à utiliser sur le prix payé). */
export function formatPriceTTC(value: number | null | undefined): string {
  return `${formatPrice(value)} TTC`;
}

/** Suffixe réutilisable quand le montant est déjà rendu séparément. */
export const TTC_LABEL = 'TTC';
