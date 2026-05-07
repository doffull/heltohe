import type { FabPos } from '@/lib/fabPosition';

export type RoulettePresetId = 'neon' | 'glass' | 'mono' | 'industrial';

export interface RoulettePreset {
  id: RoulettePresetId;
  name: string;
  description: string;
  emoji: string;
  /** Patch applied to design_settings.unifiedFab.rouletteFab */
  fab: {
    variant: 'neon' | 'glass' | 'glossy' | 'metal' | 'minimal' | 'outline';
    shape: 'pill' | 'round' | 'rect-bevel';
    size: 'sm' | 'md' | 'lg' | 'xl';
    accentColor: string;
    label: string;
    icon: string;
    pulse: boolean;
    position_desktop?: FabPos;
    position_mobile?: FabPos;
  };
  /** Patch applied to roulette_config */
  config: {
    title: string;
    subtitle: string;
    fab_label: string;
    button_label: string;
  };
  /** Replaces all segments with this set */
  segments: Array<{
    label: string;
    description: string;
    reward_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'nothing';
    reward_value: number;
    probability_weight: number;
    color: string;
    text_color: string;
    icon: string;
    code_prefix: string;
    min_purchase: number;
  }>;
  gameType: 'roulette' | 'scratch' | 'mystery' | 'flash';
}

export const ROULETTE_PRESETS: RoulettePreset[] = [
  {
    id: 'neon',
    name: 'Neon Wheel',
    description: 'Roulette néon vibrante avec halo pulsant — réductions en %',
    emoji: '⚡',
    gameType: 'roulette',
    fab: {
      variant: 'neon', shape: 'pill', size: 'lg',
      accentColor: '#ff00aa', label: 'JEU NÉON', icon: 'Zap', pulse: true,
      position_desktop: { corner: 'br', x: 24, y: 24 },
      position_mobile: { corner: 'br', x: 16, y: 16 },
    },
    config: {
      title: 'ROUE NÉON',
      subtitle: 'Tente ta chance pour des réductions exclusives',
      fab_label: 'JEU NÉON',
      button_label: 'TOURNER',
    },
    segments: [
      { label: '-10%', description: '10% de réduction', reward_type: 'percentage', reward_value: 10, probability_weight: 30, color: '#ff00aa', text_color: '#ffffff', icon: '⚡', code_prefix: 'NEON10', min_purchase: 0 },
      { label: '-20%', description: '20% de réduction', reward_type: 'percentage', reward_value: 20, probability_weight: 15, color: '#00f0ff', text_color: '#000000', icon: '✨', code_prefix: 'NEON20', min_purchase: 50 },
      { label: '-30%', description: '30% de réduction', reward_type: 'percentage', reward_value: 30, probability_weight: 5, color: '#ff3300', text_color: '#ffffff', icon: '🔥', code_prefix: 'NEON30', min_purchase: 100 },
      { label: 'Réessaie', description: 'Pas de chance cette fois', reward_type: 'nothing', reward_value: 0, probability_weight: 50, color: '#1a1a1a', text_color: '#999999', icon: '😶', code_prefix: 'NONE', min_purchase: 0 },
    ],
  },
  {
    id: 'glass',
    name: 'Glass Scratch',
    description: 'Carte à gratter glassmorphism — montants fixes en €',
    emoji: '💎',
    gameType: 'scratch',
    fab: {
      variant: 'glass', shape: 'rect-bevel', size: 'md',
      accentColor: '#a78bfa', label: 'GRATTE & GAGNE', icon: 'Sparkles', pulse: true,
      position_desktop: { corner: 'br', x: 24, y: 24 },
      position_mobile: { corner: 'br', x: 16, y: 16 },
    },
    config: {
      title: 'GRATTE & GAGNE',
      subtitle: 'Découvre ton bon de réduction',
      fab_label: 'GRATTE & GAGNE',
      button_label: 'GRATTER',
    },
    segments: [
      { label: '5€', description: '5€ offerts', reward_type: 'fixed_amount', reward_value: 5, probability_weight: 40, color: '#e0e7ff', text_color: '#1e1b4b', icon: '💎', code_prefix: 'CASH5', min_purchase: 30 },
      { label: '10€', description: '10€ offerts', reward_type: 'fixed_amount', reward_value: 10, probability_weight: 20, color: '#c4b5fd', text_color: '#1e1b4b', icon: '✨', code_prefix: 'CASH10', min_purchase: 60 },
      { label: '20€', description: '20€ offerts', reward_type: 'fixed_amount', reward_value: 20, probability_weight: 5, color: '#a78bfa', text_color: '#ffffff', icon: '👑', code_prefix: 'CASH20', min_purchase: 120 },
      { label: 'Réessaie', description: 'Pas gagné', reward_type: 'nothing', reward_value: 0, probability_weight: 35, color: '#f3f4f6', text_color: '#6b7280', icon: '🍀', code_prefix: 'NONE', min_purchase: 0 },
    ],
  },
  {
    id: 'mono',
    name: 'Mono Mystery',
    description: 'Mystery box minimaliste mono — livraison gratuite + cadeau',
    emoji: '📦',
    gameType: 'mystery',
    fab: {
      variant: 'minimal', shape: 'rect-bevel', size: 'md',
      accentColor: '#000000', label: 'BOÎTE MYSTÈRE', icon: 'Package', pulse: false,
      position_desktop: { corner: 'br', x: 24, y: 24 },
      position_mobile: { corner: 'br', x: 16, y: 16 },
    },
    config: {
      title: 'BOÎTE MYSTÈRE',
      subtitle: 'Ouvre ta boîte du jour',
      fab_label: 'MYSTÈRE',
      button_label: 'OUVRIR',
    },
    segments: [
      { label: 'Livraison offerte', description: 'Frais de port offerts', reward_type: 'free_shipping', reward_value: 0, probability_weight: 40, color: '#000000', text_color: '#ffffff', icon: '🚚', code_prefix: 'FREESHIP', min_purchase: 0 },
      { label: 'Cadeau surprise', description: 'Cadeau ajouté à ta prochaine commande', reward_type: 'fixed_amount', reward_value: 15, probability_weight: 20, color: '#1f1f1f', text_color: '#ffffff', icon: '🎁', code_prefix: 'GIFT', min_purchase: 50 },
      { label: '-15%', description: '15% de réduction', reward_type: 'percentage', reward_value: 15, probability_weight: 25, color: '#ffffff', text_color: '#000000', icon: '◼', code_prefix: 'MONO15', min_purchase: 0 },
      { label: 'Réessaie', description: 'Pas cette fois', reward_type: 'nothing', reward_value: 0, probability_weight: 15, color: '#e5e5e5', text_color: '#666666', icon: '◻', code_prefix: 'NONE', min_purchase: 0 },
    ],
  },
  {
    id: 'industrial',
    name: 'Industrial Flash',
    description: 'Flash promo industriel biseauté — réductions limitées',
    emoji: '🏭',
    gameType: 'flash',
    fab: {
      variant: 'metal', shape: 'rect-bevel', size: 'lg',
      accentColor: '#fbbf24', label: 'FLASH PROMO', icon: 'Flame', pulse: true,
      position_desktop: { corner: 'tr', x: 24, y: 80 },
      position_mobile: { corner: 'tr', x: 16, y: 64 },
    },
    config: {
      title: 'FLASH PROMO',
      subtitle: 'Promo éclair limitée dans le temps',
      fab_label: 'FLASH',
      button_label: 'DÉCROCHER',
    },
    segments: [
      { label: '-25%', description: 'Code flash 25%', reward_type: 'percentage', reward_value: 25, probability_weight: 20, color: '#fbbf24', text_color: '#000000', icon: '🔥', code_prefix: 'FLASH25', min_purchase: 80 },
      { label: '-40%', description: 'Code flash 40%', reward_type: 'percentage', reward_value: 40, probability_weight: 5, color: '#dc2626', text_color: '#ffffff', icon: '⚡', code_prefix: 'FLASH40', min_purchase: 150 },
      { label: '-15%', description: 'Code flash 15%', reward_type: 'percentage', reward_value: 15, probability_weight: 35, color: '#404040', text_color: '#fbbf24', icon: '🛠', code_prefix: 'FLASH15', min_purchase: 0 },
      { label: 'Réessaie', description: 'Promo épuisée', reward_type: 'nothing', reward_value: 0, probability_weight: 40, color: '#1a1a1a', text_color: '#666666', icon: '⛓', code_prefix: 'NONE', min_purchase: 0 },
    ],
  },
];
