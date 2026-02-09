import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePage } from '@/hooks/usePages';
import PageRenderer from '@/components/page/PageRenderer';
import Shop from './Shop';

export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading } = usePage(slug || '');

  // SEO
  useEffect(() => {
    if (page?.metaTitle) document.title = page.metaTitle;
    else if (page?.title) document.title = `${page.title} — LVTK6`;
    if (page?.metaDescription) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = document.createElement('meta'); (meta as HTMLMetaElement).name = 'description'; document.head.appendChild(meta); }
      meta.setAttribute('content', page.metaDescription);
    }
    return () => { document.title = 'LVTK6 Concept'; };
  }, [page]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!page) return null; // BoutiqueRouter will handle fallback

  // If category page with no custom sections, show normal shop
  if (page.type === 'category' && page.sections.length === 0) {
    return null; // Let BoutiqueRouter fall through to Shop
  }

  return (
    <div className="min-h-screen">
      <PageRenderer sections={page.sections} />
    </div>
  );
}
