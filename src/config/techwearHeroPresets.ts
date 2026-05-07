export type HeroPresetId = 'compact' | 'extended' | 'vertical-luxe' | 'minimal';
export type TitleAnimation = 'none' | 'fade-up' | 'typewriter' | 'glitch' | 'neon' | 'slide-in';

export interface HeroPreset {
  id: HeroPresetId;
  name: string;
  description: string;
  emoji: string;
  patch: {
    /** Side panel anchor preset */
    sidePanelPos?: { corner: 'tl' | 'tr' | 'bl' | 'br'; x: number; y: number };
    modelBadgePos?: { corner: 'tl' | 'tr' | 'bl' | 'br'; x: number; y: number };
    cardSize?: 'sm' | 'md' | 'lg';
    titleAnimation: TitleAnimation;
    titleIcon?: string;
    statsStyle: 'bars-thin' | 'bars-thick' | 'dials' | 'text-only';
    skinTokens: {
      panelBg?: string;
      panelFg?: string;
      accent?: string;
    };
  };
}

export const HERO_PRESETS: HeroPreset[] = [
  {
    id: 'compact',
    name: 'Compact',
    description: 'Panneau bas-droite, mono noir/blanc, fade-up',
    emoji: '◾',
    patch: {
      sidePanelPos: { corner: 'br', x: 24, y: 24 },
      modelBadgePos: { corner: 'tr', x: 24, y: 24 },
      cardSize: 'md',
      titleAnimation: 'fade-up',
      titleIcon: 'Sparkles',
      statsStyle: 'bars-thin',
      skinTokens: { panelBg: 'rgba(255,255,255,0.85)', panelFg: '#000000', accent: '#000000' },
    },
  },
  {
    id: 'extended',
    name: 'Étendu',
    description: 'Panneau large à gauche, gradient bleu-violet, typewriter',
    emoji: '🟣',
    patch: {
      sidePanelPos: { corner: 'bl', x: 24, y: 24 },
      modelBadgePos: { corner: 'tl', x: 24, y: 24 },
      cardSize: 'lg',
      titleAnimation: 'typewriter',
      titleIcon: 'Rocket',
      statsStyle: 'bars-thick',
      skinTokens: { panelBg: 'linear-gradient(135deg,#312e81,#7c3aed)', panelFg: '#ffffff', accent: '#a78bfa' },
    },
  },
  {
    id: 'vertical-luxe',
    name: 'Vertical Luxe',
    description: 'Colonne gauche pleine hauteur, noir/or biseauté, glitch',
    emoji: '🏛',
    patch: {
      sidePanelPos: { corner: 'tl', x: 24, y: 80 },
      modelBadgePos: { corner: 'tr', x: 24, y: 24 },
      cardSize: 'lg',
      titleAnimation: 'glitch',
      titleIcon: 'Crown',
      statsStyle: 'dials',
      skinTokens: { panelBg: '#0a0a0a', panelFg: '#fbbf24', accent: '#fbbf24' },
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Overlay discret coin droit, transparent + outline, neon flicker',
    emoji: '◻',
    patch: {
      sidePanelPos: { corner: 'tr', x: 24, y: 96 },
      modelBadgePos: { corner: 'bl', x: 24, y: 24 },
      cardSize: 'sm',
      titleAnimation: 'neon',
      titleIcon: 'Star',
      statsStyle: 'text-only',
      skinTokens: { panelBg: 'transparent', panelFg: '#ffffff', accent: '#ffffff' },
    },
  },
];
