/**
 * Palette d'icônes colorées réutilisable dans tout le site
 * (badges de confiance, avantages, réassurance, footer…).
 * Les couleurs sont volontairement vives : elles servent d'accent
 * fonctionnel et non de couleur de marque.
 */
export interface IconColor {
  /** classe texte de l'icône */
  text: string;
  /** fond de la pastille */
  bg: string;
  /** bordure de la pastille */
  border: string;
}

const PALETTE: Record<string, IconColor> = {
  Truck: { text: 'text-emerald-500', bg: 'bg-emerald-500/12', border: 'border-emerald-500/35' },
  Package: { text: 'text-emerald-500', bg: 'bg-emerald-500/12', border: 'border-emerald-500/35' },
  MapPin: { text: 'text-emerald-500', bg: 'bg-emerald-500/12', border: 'border-emerald-500/35' },
  CreditCard: { text: 'text-sky-500', bg: 'bg-sky-500/12', border: 'border-sky-500/35' },
  Shield: { text: 'text-sky-500', bg: 'bg-sky-500/12', border: 'border-sky-500/35' },
  RotateCcw: { text: 'text-amber-500', bg: 'bg-amber-500/12', border: 'border-amber-500/35' },
  Gift: { text: 'text-pink-500', bg: 'bg-pink-500/12', border: 'border-pink-500/35' },
  Heart: { text: 'text-rose-500', bg: 'bg-rose-500/12', border: 'border-rose-500/35' },
  Star: { text: 'text-yellow-500', bg: 'bg-yellow-500/12', border: 'border-yellow-500/35' },
  Sparkles: { text: 'text-violet-500', bg: 'bg-violet-500/12', border: 'border-violet-500/35' },
  Leaf: { text: 'text-lime-600', bg: 'bg-lime-500/12', border: 'border-lime-500/35' },
  Award: { text: 'text-orange-500', bg: 'bg-orange-500/12', border: 'border-orange-500/35' },
  Headphones: { text: 'text-indigo-500', bg: 'bg-indigo-500/12', border: 'border-indigo-500/35' },
  Zap: { text: 'text-yellow-500', bg: 'bg-yellow-500/12', border: 'border-yellow-500/35' },
  Check: { text: 'text-emerald-500', bg: 'bg-emerald-500/12', border: 'border-emerald-500/35' },
  Clock: { text: 'text-cyan-500', bg: 'bg-cyan-500/12', border: 'border-cyan-500/35' },
  MessageSquare: { text: 'text-indigo-500', bg: 'bg-indigo-500/12', border: 'border-indigo-500/35' },
};

const FALLBACKS: IconColor[] = [
  { text: 'text-emerald-500', bg: 'bg-emerald-500/12', border: 'border-emerald-500/35' },
  { text: 'text-sky-500', bg: 'bg-sky-500/12', border: 'border-sky-500/35' },
  { text: 'text-amber-500', bg: 'bg-amber-500/12', border: 'border-amber-500/35' },
  { text: 'text-violet-500', bg: 'bg-violet-500/12', border: 'border-violet-500/35' },
  { text: 'text-rose-500', bg: 'bg-rose-500/12', border: 'border-rose-500/35' },
];

export function getIconColor(iconName?: string, index = 0): IconColor {
  if (iconName && PALETTE[iconName]) return PALETTE[iconName];
  return FALLBACKS[index % FALLBACKS.length];
}
