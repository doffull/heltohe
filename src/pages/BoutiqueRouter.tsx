import { useParams } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import Shop from './Shop';
import ProductDetail from './ProductDetail';

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BoutiqueRouter() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { data: categories = [] } = useCategories();

  if (!slugOrId) return <Shop />;

  // If it looks like a UUID, render product detail
  if (UUID_REGEX.test(slugOrId)) {
    return <ProductDetail />;
  }

  // Otherwise treat as category slug
  const category = categories.find(c => c.slug === slugOrId);
  const categoryTitle = category?.title || slugOrId;

  return <Shop categoryFromSlug={categoryTitle} />;
}

