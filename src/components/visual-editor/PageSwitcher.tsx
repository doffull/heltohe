import { useNavigate, useLocation } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisualEditor } from './VisualEditorProvider';
import { usePages } from '@/hooks/usePages';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';

export type EditorPageKey =
  | 'home'
  | 'shop'
  | 'cart'
  | 'checkout'
  | 'account'
  | 'about'
  | 'contact'
  | 'sizeguide'
  | 'loyalty'
  | 'boutiques'
  | 'storelocator'
  | 'legal'
  | 'legal:cgv'
  | 'legal:mentions'
  | 'legal:confidentialite'
  | 'legal:cookies'
  | 'legal:retours'
  | `custom:${string}`
  | `cat:${string}`
  | `product:${string}`;

const STATIC_PAGES: { key: EditorPageKey; label: string; route: string }[] = [
  { key: 'home', label: 'Accueil', route: '/' },
  { key: 'shop', label: 'Boutique', route: '/boutique' },
  { key: 'cart', label: 'Panier', route: '/panier' },
  { key: 'checkout', label: 'Checkout', route: '/checkout' },
  { key: 'account', label: 'Compte', route: '/compte' },
  { key: 'about', label: 'À propos', route: '/a-propos' },
  { key: 'contact', label: 'Contact & FAQ', route: '/contact' },
  { key: 'sizeguide', label: 'Guide des tailles', route: '/guide-des-tailles' },
  { key: 'loyalty', label: 'Fidélité', route: '/fidelite' },
  { key: 'boutiques', label: 'Nos boutiques', route: '/boutiques' },
  { key: 'storelocator', label: 'Trouver une boutique', route: '/trouver-une-boutique' },
  { key: 'legal:cgv', label: 'CGV', route: '/cgv' },
  { key: 'legal:mentions', label: 'Mentions légales', route: '/mentions-legales' },
  { key: 'legal:confidentialite', label: 'Confidentialité', route: '/confidentialite' },
  { key: 'legal:cookies', label: 'Cookies', route: '/cookies' },
  { key: 'legal:retours', label: 'Retours & Échanges', route: '/retours' },
];

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-2 py-1 text-[9px] uppercase text-muted-foreground tracking-widest">{children}</div>
);

export function PageSwitcher() {
  const { currentPageKey, setCurrentPageKey } = useVisualEditor();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: pages = [] } = usePages();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();

  const customPages = (pages || []).filter((p: any) => p.isPublished !== false);
  const cats = (categories || []).filter((c: any) => c.slug);
  const prods = (products || []).slice(0, 60);

  const handleChange = (val: string) => {
    setCurrentPageKey(val as EditorPageKey);
    const staticHit = STATIC_PAGES.find((p) => p.key === val);
    if (staticHit) {
      if (location.pathname !== staticHit.route) navigate(staticHit.route);
      return;
    }
    if (val.startsWith('custom:')) return navigate(`/${val.slice('custom:'.length)}`);
    if (val.startsWith('cat:')) return navigate(`/${val.slice('cat:'.length)}`);
    if (val.startsWith('product:')) return navigate(`/boutique/${val.slice('product:'.length)}`);
  };

  return (
    <div className="px-3 pt-3 pb-2 border-b border-border bg-muted/10">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Page éditée</label>
      <Select value={currentPageKey} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-[60vh]">
          <GroupLabel>Pages du site</GroupLabel>
          {STATIC_PAGES.map((p) => (
            <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
          ))}

          {customPages.length > 0 && <GroupLabel>Pages custom</GroupLabel>}
          {customPages.map((p: any) => (
            <SelectItem key={p.slug} value={`custom:${p.slug}`}>{p.title || p.slug}</SelectItem>
          ))}

          {cats.length > 0 && <GroupLabel>Catégories</GroupLabel>}
          {cats.map((c: any) => (
            <SelectItem key={c.id} value={`cat:${c.slug}`}>{c.name || c.slug}</SelectItem>
          ))}

          {prods.length > 0 && <GroupLabel>Pages produits</GroupLabel>}
          {prods.map((p: any) => (
            <SelectItem key={p.id} value={`product:${p.slug || p.id}`}>{p.name || p.slug}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
