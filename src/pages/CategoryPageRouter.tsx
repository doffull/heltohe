import { useParams, useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { usePage } from '@/hooks/usePages';
import { useEffect } from 'react';
import Shop from './Shop';
import PageRenderer from '@/components/page/PageRenderer';
import NotFound from './NotFound';

export default function CategoryPageRouter() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: customPage, isLoading: pageLoading } = usePage(categorySlug || '');

  // Find matching category
  const category = categories.find(c => c.slug === categorySlug);

  // SEO
  useEffect(() => {
    if (customPage?.metaTitle) {
      document.title = customPage.metaTitle;
    } else if (category?.metaTitle) {
      document.title = category.metaTitle;
    } else if (category) {
      document.title = `${category.title} — LVTK6`;
    }
    return () => { document.title = 'LVTK6 Concept'; };
  }, [customPage, category]);

  // Still loading
  if (catsLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // No category found → 404
  if (!category) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Custom page sections (hero, text blocks, etc.) if configured in admin */}
      {customPage && customPage.sections.length > 0 && (
        <PageRenderer sections={customPage.sections} />
      )}

      {/* Category product listing */}
      <Shop categoryFromSlug={category.title} />
    </div>
  );
}
