import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useCategories, useUpdateCategory } from '@/hooks/useCategories';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import { Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export function CategoryGrid() {
  const { navigateToCategory, language } = useApp();
  const { data: dbCategories = [] } = useCategories();
  const updateCategory = useUpdateCategory();
  const { isOpen: isEditorOpen } = useVisualEditor();

  // Editing state: categoryId → local title value
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const categories = dbCategories
    .filter(c => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => ({ id: c.id, title: c.title, image: c.image || '/placeholder.svg', sortOrder: c.sortOrder, ...c }));

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

      <div className="px-6 lg:px-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category, index) => {
          const isEditing = isEditorOpen && editingId === category.id;
          return (
            <div
              key={category.id}
              className={cn(
                "group relative h-64 lg:h-80 overflow-hidden",
                "transition-all duration-500 hover:shadow-hud",
                "animate-slide-in-up chamfer-hud",
                isEditorOpen ? "cursor-text" : "cursor-pointer"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={(e) => {
                if (isEditorOpen) startEdit(category.id, category.title, e);
                else navigateToCategory(category.title);
              }}
            >
              {/* Background image */}
              <img
                src={category.image}
                alt={category.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

              {/* Border effect */}
              <div className={cn(
                "absolute inset-0 border-2 transition-colors duration-300 chamfer-hud",
                isEditorOpen
                  ? "border-primary/40 ring-1 ring-primary/20"
                  : "border-transparent group-hover:border-primary/50"
              )} />

              {/* Editor badge */}
              {isEditorOpen && (
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded pointer-events-none">
                  <Pencil className="h-2.5 w-2.5" /> Éditer
                </div>
              )}

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
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
                  <h3 className="hud-text text-xl font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                )}
                <div className="mt-2 h-0.5 w-0 bg-primary group-hover:w-16 transition-all duration-500" />
              </div>

              {/* Corner accent */}
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/0 group-hover:border-primary/50 transition-colors duration-300" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
