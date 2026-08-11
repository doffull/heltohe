import { useParams, Navigate } from 'react-router-dom';
import { usePage } from '@/hooks/usePages';
import { useCategories } from '@/hooks/useCategories';
import { catKey } from '@/lib/productCategories';
import Shop from './Shop';
import ProductDetail from './ProductDetail';
import PageRenderer from '@/components/page/PageRenderer';
import { useEffect } from 'react';

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BoutiqueRouter() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { data: customPage } = usePage(slugOrId || '');
  const { data: categories = [] } = useCategories();

  // SEO for custom pages
  useEffect(() => {
    if (customPage?.metaTitle) document.title = customPage.metaTitle;
    return () => { document.title = 'HELVETICA-MP Concept'; };
  }, [customPage]);

  if (!slugOrId) return <Shop />;

  // If it looks like a UUID, render product detail
  if (UUID_REGEX.test(slugOrId)) {
    return <ProductDetail />;
  }

  // Slug de catégorie → page catégorie canonique (/slug)
  const matchedCategory = categories.find(
    (c) => catKey(c.slug) === catKey(slugOrId) || catKey(c.title) === catKey(slugOrId),
  );
  if (matchedCategory) {
    return <Navigate to={`/${matchedCategory.slug || slugOrId}`} replace />;
  }

  // Check if there's a custom page with sections for this slug (non-category custom pages)
  if (customPage && customPage.sections.length > 0 && customPage.type !== 'category') {
    return (
      <div className="min-h-screen">
        <PageRenderer sections={customPage.sections} />
      </div>
    );
  }

  // Fallback: show full shop
  return <Shop />;
}

