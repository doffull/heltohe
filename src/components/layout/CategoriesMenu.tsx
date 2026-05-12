import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Menu,
  Search,
  Heart,
  Scale,
  ShoppingCart,
  User,
  Shirt,
  Sparkles,
  Baby,
  Watch,
  Tag,
  Star,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

const FALLBACK_CATEGORIES = [
  { title: 'Homme', slug: 'homme', icon: Shirt },
  { title: 'Femme', slug: 'femme', icon: Sparkles },
  { title: 'Enfant', slug: 'enfant', icon: Baby },
  { title: 'Accessoires', slug: 'accessoires', icon: Watch },
  { title: 'Promos', slug: 'promos', icon: Tag },
  { title: 'Nouveautés', slug: 'nouveautes', icon: Star },
];

export function CategoriesMenu({ compact = false }: { compact?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { data: dbCategories = [] } = useCategories();

  const rootCats = dbCategories.filter((c: any) => !c.parentId);
  const categories =
    rootCats.length > 0
      ? rootCats.slice(0, 8).map((c: any, i) => ({
          title: c.title,
          slug: c.slug || encodeURIComponent(c.title.toLowerCase()),
          icon: FALLBACK_CATEGORIES[i % FALLBACK_CATEGORIES.length].icon,
        }))
      : FALLBACK_CATEGORIES;

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/boutique?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery('');
    }
  };

  const navItems = [
    { icon: Heart, label: 'Favoris', href: '/account', count: 0 },
    { icon: Scale, label: 'Comparer', href: '/boutique', count: 0 },
    { icon: ShoppingCart, label: 'Panier', href: '/cart', count: itemCount },
    { icon: User, label: 'Compte', href: '/account' },
  ];

  return (
    <>
      {/* Trigger button + nav icons */}
      <div className="flex items-center gap-2 lg:gap-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 hover:bg-secondary text-foreground hud-text text-xs uppercase tracking-wider transition-colors chamfer-hud-sm"
          aria-label="Ouvrir le menu des catégories"
        >
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">Catégories</span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                className="relative flex flex-col items-center px-2 py-1 text-muted-foreground hover:text-primary transition-colors"
                aria-label={item.label}
              >
                <Icon className="h-4 w-4" />
                <span className="hud-text text-[9px] uppercase tracking-wider mt-0.5">
                  {item.label}
                </span>
                {!!item.count && item.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="hud-text uppercase tracking-widest text-sm">
              <span className="text-primary">//</span> Catégories
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Rechercher des produits..."
              className="pl-9"
            />
          </div>

          {/* Category grid */}
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/${cat.slug}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group flex flex-col items-center justify-center gap-2 p-4 border border-border',
                    'hover:border-primary hover:bg-secondary/50 transition-all chamfer-hud-sm'
                  )}
                >
                  <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="hud-text text-[10px] uppercase tracking-wider text-center">
                    {cat.title}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center pt-2 border-t border-border">
            <p className="hud-text text-xs text-muted-foreground uppercase tracking-widest mb-3">
              Découvrez nos collections
            </p>
            <Button
              onClick={() => {
                navigate('/boutique');
                setOpen(false);
              }}
              className="w-full uppercase tracking-wider"
            >
              Voir toutes les collections
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
