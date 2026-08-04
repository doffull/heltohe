export interface TemplateVarDef {
  key: string;
  label: string;
  example: string;
}

/** Variables disponibles dans les modèles de réponse de la messagerie. */
export const TEMPLATE_VARS: TemplateVarDef[] = [
  { key: 'prenom', label: 'Prénom du contact', example: 'Jean' },
  { key: 'nom_complet', label: 'Nom complet du contact', example: 'Jean Dupont' },
  { key: 'email', label: 'Email du contact', example: 'jean@exemple.fr' },
  { key: 'telephone', label: 'Téléphone du contact', example: '+33 6 12 34 56 78' },
  { key: 'objet', label: 'Objet de la conversation', example: 'Question sur ma commande' },
  { key: 'numero_commande', label: 'Numéro de commande', example: 'CMD-1042' },
  { key: 'statut_commande', label: 'Statut de la commande', example: 'Shipped' },
  { key: 'total_commande', label: 'Total de la commande', example: '149,00 €' },
  { key: 'numero_suivi', label: 'Numéro de suivi', example: '6A12345678901' },
  { key: 'transporteur', label: 'Transporteur', example: 'Colissimo' },
  { key: 'boutique', label: 'Nom de la boutique', example: 'LVTK6' },
  { key: 'signature', label: 'Signature configurée', example: 'Service client' },
  { key: 'date', label: "Date du jour", example: '04/08/2026' },
];

export type TemplateContext = Record<string, string | null | undefined>;

/** Remplace les {{variables}} par leur valeur ; laisse un placeholder lisible si vide. */
export function renderTemplate(text: string, ctx: TemplateContext): string {
  return (text || '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, key: string) => {
    const value = ctx[key.toLowerCase()];
    if (value === undefined || value === null || value === '') return `[${key}]`;
    return String(value);
  });
}

/** Liste les variables utilisées dans un texte. */
export function extractVars(text: string): string[] {
  const found = new Set<string>();
  for (const m of (text || '').matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
    found.add(m[1].toLowerCase());
  }
  return [...found];
}

/** Variables présentes dans le texte mais sans valeur dans le contexte. */
export function missingVars(text: string, ctx: TemplateContext): string[] {
  return extractVars(text).filter((k) => {
    const v = ctx[k];
    return v === undefined || v === null || v === '';
  });
}

/** Contexte d'exemple pour l'aperçu des modèles hors conversation. */
export function sampleContext(): TemplateContext {
  return Object.fromEntries(TEMPLATE_VARS.map((v) => [v.key, v.example]));
}
