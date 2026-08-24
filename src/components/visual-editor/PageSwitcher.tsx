import { useNavigate, useLocation } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisualEditor } from './VisualEditorProvider';
import { usePages } from '@/hooks/usePages';

export type EditorPageKey =
  | 'home'
  | 'shop'
  | 'cart'
  | 'checkout'
  | 'account'
  | 'legal'
  | 'legal:cgv'
  | 'legal:mentions'
  | 'legal:confidentialite'
  | 'legal:cookies'
  | 'legal:retours'
  | `custom:${string}`;

const STATIC_PAGES: { key: EditorPageKey; label: string; route: string }[] = [
  { key: 'home', label: 'Accueil', route: '/' },
  { key: 'shop', label: 'Boutique', route: '/boutique' },
  { key: 'cart', label: 'Panier', route: '/panier' },
  { key: 'checkout', label: 'Checkout', route: '/checkout' },
  { key: 'account', label: 'Compte', route: '/compte' },
  { key: 'legal:cgv', label: 'CGV', route: '/cgv' },
  { key: 'legal:mentions', label: 'Mentions légales', route: '/mentions-legales' },
  { key: 'legal:confidentialite', label: 'Confidentialité', route: '/confidentialite' },
  { key: 'legal:cookies', label: 'Cookies', route: '/cookies' },
  { key: 'legal:retours', label: 'Retours & Échanges', route: '/retours' },
];

export function PageSwitcher() {
  const { currentPageKey, setCurrentPageKey } = useVisualEditor();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: pages = [] } = usePages();

  const customPages = (pages || []).filter((p: any) => p.isPublished !== false);

  const handleChange = (val: string) => {
    setCurrentPageKey(val as EditorPageKey);
    const staticHit = STATIC_PAGES.find((p) => p.key === val);
    if (staticHit) {
      if (location.pathname !== staticHit.route) navigate(staticHit.route);
      return;
    }
    if (val.startsWith('custom:')) {
      const slug = val.slice('custom:'.length);
      navigate(`/${slug}`);
    }
  };

  return (
    <div className="px-3 pt-3 pb-2 border-b border-border bg-muted/10">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Page éditée</label>
      <Select value={currentPageKey} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATIC_PAGES.map((p) => (
            <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
          ))}
          {customPages.length > 0 && (
            <div className="px-2 py-1 text-[9px] uppercase text-muted-foreground tracking-widest">Pages custom</div>
          )}
          {customPages.map((p: any) => (
            <SelectItem key={p.slug} value={`custom:${p.slug}`}>{p.title || p.slug}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
