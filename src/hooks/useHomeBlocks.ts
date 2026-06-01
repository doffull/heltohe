import { useApp } from '@/context/AppContext';

export interface HomeBlock {
  id: string;
  visible: boolean;
  label?: string;
  settings?: Record<string, any>;
}

/**
 * Single source of truth for the home page blocks order/visibility.
 * Both the desktop admin (`HomeBlocksEditor`) and the inline Live Editor
 * mutate the SAME key (`designSettings.homePageBlocks`) so changes are
 * strictly identical on mobile and desktop.
 */
export function useHomeBlocks() {
  const { designSettings, updateDesignSettings } = useApp();
  const blocks: HomeBlock[] = ((designSettings as any).homePageBlocks || []) as HomeBlock[];

  function setBlocks(next: HomeBlock[]) {
    updateDesignSettings({ homePageBlocks: next } as any);
  }

  function moveBlock(id: string, dir: -1 | 1) {
    const list = [...blocks];
    const idx = list.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    setBlocks(list);
  }

  function toggleVisible(id: string) {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));
  }

  return { blocks, setBlocks, moveBlock, toggleVisible };
}
