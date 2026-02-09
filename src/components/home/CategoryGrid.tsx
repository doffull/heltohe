import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useCategories } from '@/hooks/useCategories';

export function CategoryGrid() {
  const { designSettings, navigateToCategory, language } = useApp();
  const { data: dbCategories = [] } = useCategories();
  
  // Use DB categories if available, fallback to design settings
  const categories = dbCategories.length > 0 
    ? dbCategories.filter(c => !c.parentId).map(c => ({
        id: c.id,
        title: c.title,
        image: c.image || '/placeholder.svg',
      }))
    : designSettings.categories;
  
  return (
    <section className="py-16">
      <div className="px-6 lg:px-12 mb-8">
        <h2 className="hud-text text-xs text-primary tracking-[0.3em] mb-2">
          // {language === 'FR' ? 'CATÉGORIES' : 'CATEGORIES'}
        </h2>
        <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-32" />
      </div>
      
      <div className="px-6 lg:px-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <button
            key={category.id}
            onClick={() => navigateToCategory(category.title)}
            className={cn(
              "group relative h-64 lg:h-80 overflow-hidden cursor-pointer",
              "transition-all duration-500 hover:shadow-hud",
              "animate-slide-in-up",
              "chamfer-hud"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background image */}
            <img 
              src={category.image}
              alt={category.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            {/* Border effect on hover */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/50 transition-colors duration-300 chamfer-hud" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="hud-text text-xl font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
                {category.title}
              </h3>
              <div className="mt-2 h-0.5 w-0 bg-primary group-hover:w-16 transition-all duration-500" />
            </div>
            
            {/* Corner accent */}
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/0 group-hover:border-primary/50 transition-colors duration-300" />
          </button>
        ))}
      </div>
    </section>
  );
}
