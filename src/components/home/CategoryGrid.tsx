import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useCategories, useUpdateCategory, isCategoryOnSite } from '@/hooks/useCategories';
import CategoryIcon from '@/components/categories/CategoryIcon';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import { Check, Pencil, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useBoutiques } from '@/hooks/useBoutiques';
import { isMarketplaceCategory } from '@/lib/shopVisibility';
import { categoryImageStyle, categoryImageBackground } from '@/lib/categoryImageStyle';

const CATEGORY_PLACEHOLDER = '/placeholder.svg';

function keepCategoryFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  if (!event.currentTarget.src.endsWith(CATEGORY_PLACEHOLDER)) {
    event.currentTarget.src = CATEGORY_PLACEHOLDER;
  }
}

type CategoryShape = 'square' | 'rounded' | 'circle' | 'triangle' | 'chamfer' | 'pill';
type CategoryOrientation = 'vertical' | 'horizontal';
type CategoryHover = 'zoom' | 'brightness' | 'none';

function shapeClasses(shape: CategoryShape): string {
  switch (shape) {
    case 'rounded': return 'rounded-2xl';
    case 'circle': return 'rounded-full aspect-square';
    case 'pill': return 'rounded-full';
    case 'triangle': return ''; // handled via clipPath inline style
    case 'chamfer': return 'chamfer-hud';
    case 'square':
    default: return '';
  }
}

function hoverImageClasses(effect: CategoryHover): string {
  switch (effect) {
    case 'brightness': return 'transition-all duration-700 group-hover:brightness-125';
    case 'none': return '';
    case 'zoom':
    default: return 'transition-transform duration-700 group-hover:scale-110';
  }
}

export function CategoryGrid() {
  const { navigateToCategory, language, designSettings } = useApp();
  const { data: dbCategories = [] } = useCategories();
  const { data: boutiques = [] } = useBoutiques();
  const updateCategory = useUpdateCategory();
  const { isOpen: isEditorOpen } = useVisualEditor();
  const navigate = useNavigate();

  // Read inline-editor settings stored on the "categories" home block
  const blocks = ((designSettings as any).homePageBlocks || []) as Array<{ id: string; settings?: any }>;
  const blockSettings = blocks.find((b) => b.id === 'categories')?.settings || {};
  const shape: CategoryShape = blockSettings.shape || 'chamfer';
  const orientation: CategoryOrientation = blockSettings.orientation || 'vertical';
  const columns: number = blockSettings.columns || 3;
  const hoverEffect: CategoryHover = blockSettings.hoverEffect || 'zoom';
  const titleAlign: 'left' | 'center' | 'right' = blockSettings.titleAlign || 'left';
  const alignText = titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : 'text-left';
  const alignRow =
    titleAlign === 'center' ? 'justify-center' : titleAlign === 'right' ? 'justify-end' : 'justify-start';

  // Editing state: categoryId → local title value
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const categories = dbCategories
    .filter(c => !c.parentId && !isMarketplaceCategory(c.title) && isCategoryOnSite(c))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => ({ id: c.id, title: c.title, image: c.image || CATEGORY_PLACEHOLDER, sortOrder: c.sortOrder, ...c }));

  function startEdit(id: string, title: string, e: React.MouseEvent) {
    if (!isEditorOpen) return;
    e.stopPropagation();
    e.preventDefault();
    setEditingId(id);
    setEditValue(title);
  }

  function commitEdit(cat: typeof categories[0]) {
    if (!editValue.trim() || editValue === cat.title) {
      setEditingId(null);
      return;
    }
    updateCategory.mutate(
      { ...cat, title: editValue.trim() },
      {
        onSuccess: () => toast.success('Titre mis à jour'),
        onError: () => toast.error('Erreur de mise à jour'),
      }
    );
    setEditingId(null);
  }

  return (
    <section className="py-16">
      <div className="px-6 lg:px-12 mb-8">
        <h2 className="hud-text text-xs text-primary tracking-[0.3em] mb-2">
          // {language === 'FR' ? 'CATÉGORIES' : 'CATEGORIES'}
        </h2>
        <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-32" />
      </div>

      <div
        className={cn(
          'px-6 lg:px-12 grid gap-4',
          orientation === 'horizontal'
            ? 'grid-cols-1'
            : columns === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : columns === 4
                ? 'grid-cols-2 md:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-3'
        )}
      >
        {categories.map((category, index) => {
          const isEditing = isEditorOpen && editingId === category.id;
          const isHorizontal = orientation === 'horizontal';
          const shapeCls = shapeClasses(shape);
          const triangleStyle = shape === 'triangle'
            ? { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' } as React.CSSProperties
            : undefined;
          return (
            <div
              key={category.id}
              className={cn(
                'group relative overflow-hidden transition-all duration-500 hover:shadow-hud animate-slide-in-up',
                isHorizontal ? 'h-40 lg:h-48' : 'h-64 lg:h-80',
                shapeCls,
                isEditorOpen ? 'cursor-text' : 'cursor-pointer'
              )}
              style={{ animationDelay: `${index * 100}ms`, ...triangleStyle }}
              onClick={(e) => {
                if (isEditorOpen) startEdit(category.id, category.title, e);
                else navigateToCategory(category.title);
              }}
            >
              {/* Background image */}
              <div className="absolute inset-0 overflow-hidden" style={categoryImageBackground(category)}>
                <img
                  src={category.image}
                  alt={category.title}
                  className={cn('w-full h-full', hoverImageClasses(hoverEffect))}
                  style={categoryImageStyle(category)}
                  loading="lazy"
                  decoding="async"
                  onError={keepCategoryFallback}
                />
              </div>

              {/* Overlay */}
              <div
                className={cn(
                  'absolute inset-0',
                  isHorizontal
                    ? 'bg-gradient-to-r from-background via-background/60 to-transparent'
                    : 'bg-gradient-to-t from-background via-background/50 to-transparent'
                )}
              />

              {/* Border effect */}
              {shape !== 'triangle' && (
                <div className={cn(
                  'absolute inset-0 border-2 transition-colors duration-300',
                  shapeCls,
                  isEditorOpen
                    ? 'border-primary/40 ring-1 ring-primary/20'
                    : 'border-transparent group-hover:border-primary/50'
                )} />
              )}

              {/* Editor badge */}
              {isEditorOpen && (
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded pointer-events-none">
                  <Pencil className="h-2.5 w-2.5" /> Éditer
                </div>
              )}

              {/* Content */}
              <div
                className={cn(
                  'absolute p-6',
                  isHorizontal ? 'top-1/2 -translate-y-1/2 left-0 right-1/2' : 'bottom-0 left-0 right-0'
                )}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit(category);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => commitEdit(category)}
                      className="flex-1 bg-background/80 border border-primary text-foreground font-bold text-xl px-2 py-1 rounded outline-none hud-text tracking-wider"
                    />
                    <button
                      onMouseDown={e => { e.preventDefault(); commitEdit(category); }}
                      className="bg-primary text-primary-foreground rounded p-1"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <h3 className="hud-text text-xl font-bold tracking-wider text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                    <CategoryIcon icon={category.icon} iconImage={category.iconImage} size="md" className="text-primary" />
                    <span className="truncate">{category.title}</span>
                  </h3>
                )}
                <div className="mt-2 h-0.5 w-0 bg-primary group-hover:w-16 transition-all duration-500" />
              </div>

              {/* Corner accent */}
              {shape !== 'triangle' && shape !== 'circle' && shape !== 'pill' && (
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/0 group-hover:border-primary/50 transition-colors duration-300" />
              )}
            </div>
          );
        })}
      </div>


      {/* Elongated "Les Boutiques" card */}
      <div className="px-6 lg:px-12 mt-4">
        <button
          type="button"
          onClick={() => navigate('/trouver-une-boutique')}
          className="group relative w-full h-40 lg:h-52 overflow-hidden chamfer-hud transition-all duration-500 hover:shadow-hud animate-slide-in-up text-left"
          style={{ animationDelay: `${categories.length * 100}ms` }}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/95 via-foreground/85 to-foreground/70" />
          {/* Subtle map texture */}
          <div
            className="absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, hsl(var(--primary)) 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, hsl(var(--primary)) 1px, transparent 1.5px), radial-gradient(circle at 45% 80%, hsl(var(--primary)) 1px, transparent 1.5px)',
              backgroundSize: '120px 120px, 180px 180px, 90px 90px',
            }}
          />
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/50 transition-colors duration-300 chamfer-hud" />
          {/* Content */}
          <div className="relative h-full flex items-center justify-between px-8 lg:px-12">
            <div>
              <div className="hud-text text-[10px] text-primary tracking-[0.3em] mb-2">
                // {language === 'FR' ? 'NOS POINTS DE VENTE' : 'OUR STORES'}
              </div>
              <h3 className="hud-text text-2xl lg:text-4xl font-bold tracking-wider uppercase text-background">
                {language === 'FR' ? 'Les Boutiques' : 'Our Boutiques'}
              </h3>
              <p className="text-xs lg:text-sm text-background/70 mt-2 max-w-md">
                {boutiques.length > 0
                  ? `${boutiques.length} ${boutiques.length > 1 ? 'boutiques' : 'boutique'} ${language === 'FR' ? 'en France — permanentes et éphémères' : 'across France'}`
                  : language === 'FR' ? 'Magasins permanents et boutiques éphémères dans toute la France' : 'Permanent stores and pop-ups across France'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 lg:h-12 lg:w-12 text-primary group-hover:scale-110 transition-transform" />
              <div className="hud-text text-[10px] text-background/60 tracking-widest hidden sm:block">
                {language === 'FR' ? 'VOIR LA CARTE →' : 'VIEW MAP →'}
              </div>
            </div>
          </div>
          {/* Corner accents */}
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/60" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/60" />
        </button>
      </div>
    </section>
  );
}
