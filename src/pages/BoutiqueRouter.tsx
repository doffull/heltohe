import { useParams } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { usePage } from '@/hooks/usePages';
import Shop from './Shop';
import ProductDetail from './ProductDetail';
import PageRenderer from '@/components/page/PageRenderer';
import { useEffect } from 'react';

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BoutiqueRouter() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { data: categories = [] } = useCategories();
  const { data: customPage } = usePage(slugOrId || '');

  // SEO for custom pages
  useEffect(() => {
    if (customPage?.metaTitle) document.title = customPage.metaTitle;
    return () => { document.title = 'LVTK6 Concept'; };
  }, [customPage]);

  if (!slugOrId) return <Shop />;

  // If it looks like a UUID, render product detail
  if (UUID_REGEX.test(slugOrId)) {
    return <ProductDetail />;
  }

  // Check if there's a custom page with sections for this slug
  if (customPage && customPage.sections.length > 0) {
    return (
      <div className="min-h-screen">
        <PageRenderer sections={customPage.sections} />
        {/* If it's a category page, also show products below */}
        {customPage.type === 'category' && (
          <Shop categoryFromSlug={customPage.title} />
        )}
      </div>
    );
  }

  // Otherwise treat as category slug
  const category = categories.find(c => c.slug === slugOrId);
  const categoryTitle = category?.title || slugOrId;

  return <Shop categoryFromSlug={categoryTitle} />;
}

