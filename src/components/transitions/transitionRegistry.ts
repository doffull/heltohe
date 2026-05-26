import type { ComponentType } from 'react';
import { PageShatterTransition } from './PageShatterTransition';
import { FadeTransition } from './FadeTransition';

export type TransitionId = 'shatter' | 'fade' | 'none';

interface TransitionDef {
  id: TransitionId;
  label: string;
  description: string;
  Component: ComponentType<{ k: string }> | null;
}

export const TRANSITIONS: TransitionDef[] = [
  {
    id: 'shatter',
    label: 'Shatter (recommandé)',
    description: '12 cellules se brisent et se reconstruisent — effet premium industriel.',
    Component: PageShatterTransition,
  },
  {
    id: 'fade',
    label: 'Fade doux',
    description: 'Fondu sobre — idéal pour un rendu minimaliste.',
    Component: FadeTransition,
  },
  {
    id: 'none',
    label: 'Aucune',
    description: 'Désactive la transition de page.',
    Component: null,
  },
];

export function getTransition(id?: string): TransitionDef {
  return TRANSITIONS.find((t) => t.id === id) || TRANSITIONS[0];
}
