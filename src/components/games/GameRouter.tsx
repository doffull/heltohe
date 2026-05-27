import { useRouletteConfig } from '@/hooks/useRoulette';
import { RouletteFab } from '@/components/home/RouletteFab';
import { GameScratchFab } from './GameScratchFab';

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
}

/**
 * Picks the active mini-game based on `roulette_config.game_type`.
 * Defaults to `scratch` (the new card-scratch design).
 *
 * Server-side `spin_roulette` RPC stays the same — only the visual
 * presentation changes between game types.
 */
export function GameRouter(props: Props = {}) {
  const { data: config } = useRouletteConfig();
  const gameType = (config as any)?.game_type || 'scratch';
  switch (gameType) {
    case 'wheel':
      return <RouletteFab {...props} />;
    case 'scratch':
    case 'mystery':
    case 'flash':
    default:
      return <GameScratchFab {...props} />;
  }
}
