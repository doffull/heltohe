import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, Eye, EyeOff, Settings2 } from 'lucide-react';
import { useVisualEditor } from './VisualEditorProvider';
import { useHomeBlocks } from '@/hooks/useHomeBlocks';

const EDIT_ROUTE: Record<string, string> = {
  hero: '/admin/design#techwear-hero',
  categories: '/admin/categories',
  storeFinder: '/admin/boutiques',
  featured: '/admin/products',
  newArrivals: '/admin/products',
  flash: '/admin/marketing#flash',
  loyalty: '/admin/marketing#fidelite',
  newsletter: '/admin/marketing#newsletter',
  voiceBanner: '/admin/home-icons#unified-fab',
};

/**
 * Floating per-section controls (↑ ↓ 👁 ⚙) shown only when the
 * Live Visual Editor is open. Operates directly on `homePageBlocks`
 * so changes apply to BOTH mobile and desktop simultaneously.
 */
export function SectionControls({ blockId, isFirst, isLast }: { blockId: string; isFirst: boolean; isLast: boolean }) {
  const { isOpen } = useVisualEditor();
  const { moveBlock, toggleVisible, blocks } = useHomeBlocks();
  const navigate = useNavigate();
  if (!isOpen) return null;

  const block = blocks.find((b) => b.id === blockId);
  const visible = block?.visible ?? true;

  const settingsRoute = EDIT_ROUTE[blockId.startsWith('custom:') ? '' : blockId];

  function go(route?: string) {
    if (!route) return;
    if (route.includes('#')) {
      const [path, hash] = route.split('#');
      navigate(path);
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    } else navigate(route);
  }

  const btn =
    'w-7 h-7 flex items-center justify-center bg-background/95 backdrop-blur border border-border hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div
      className="absolute top-2 right-2 z-[60] flex items-center gap-1 shadow-lg rounded-sm overflow-hidden pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <button className={btn} onClick={() => moveBlock(blockId, -1)} disabled={isFirst} title="Monter">
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button className={btn} onClick={() => moveBlock(blockId, 1)} disabled={isLast} title="Descendre">
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <button className={btn} onClick={() => toggleVisible(blockId)} title={visible ? 'Masquer' : 'Afficher'}>
        {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
      {settingsRoute && (
        <button className={btn} onClick={() => go(settingsRoute)} title="Réglages avancés">
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
