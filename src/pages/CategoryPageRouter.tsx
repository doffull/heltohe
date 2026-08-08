import { useParams, Link } from 'react-router-dom';
import CategoryIcon from '@/components/categories/CategoryIcon';
import { useCategories } from '@/hooks/useCategories';
import { usePage } from '@/hooks/usePages';
import { useEffect } from 'react';
import Shop from './Shop';
import PageRenderer from '@/components/page/PageRenderer';
import NotFound from './NotFound';
import { ChevronRight } from 'lucide-react';

// Normalize accented characters + whitespace → kebab — must match MainLayout normalizeSlug
const normalizeSlug = (s: string) =>
  s.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[àâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/ç/g, 'c');

function CategoryHeader({ category }: { category: { title: string; image?: string; metaDescription?: string; seoKeywords?: string } }) {
  const hasImage = !!category.image;

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: hasImage ? '420px' : '200px' }}>
      {/* Background image */}
      {hasImage && (
        <>
          <img
            src={category.image}
            alt={category.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        </>
      )}

      {/* No image fallback — subtle pattern */}
      {!hasImage && (
        <div className="absolute inset-0 bg-secondary/20" />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full px-6 lg:px-12 py-10" style={{ minHeight: hasImage ? '420px' : '200px' }}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs font-mono tracking-wider text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground transition-colors">ACCUEIL</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/boutique" className="hover:text-foreground transition-colors">BOUTIQUE</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary inline-flex items-center gap-1.5">
            <CategoryIcon icon={(category as any).icon} iconImage={(category as any).iconImage} size="xs" />
            {category.title.toUpperCase()}
          </span>
        </nav>

        {/* Label */}
        <p className="hud-text text-xs text-primary tracking-[0.3em] mb-3">
          // COLLECTION
        </p>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-bold uppercase tracking-tight text-foreground leading-none mb-4 flex items-center gap-3">
          <CategoryIcon icon={(category as any).icon} iconImage={(category as any).iconImage} size="lg" className="text-primary" />
          {category.title}
        </h1>

        {/* Description SEO */}
        {category.metaDescription && (
          <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
            {category.metaDescription}
          </p>
        )}

        {/* Decorative line */}
        <div className="mt-6 h-px w-24 bg-primary" />
      </div>

      {/* Corner accents */}
      <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-primary/40" />
      <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-primary/20" />
    </div>
  );
}

export default function CategoryPageRouter() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: customPage, isLoading: pageLoading } = usePage(categorySlug || '');

  // Robust matching: exact slug → normalized title fallback
  const category = categories.find(c =>
    c.slug === categorySlug ||
    normalizeSlug(c.title) === normalizeSlug(categorySlug || '')
  );

  // SEO — title + meta description + keywords
  useEffect(() => {
    if (!category) return;

    // Title
    if (customPage?.metaTitle) {
      document.title = customPage.metaTitle;
    } else if (category.metaTitle) {
      document.title = category.metaTitle;
    } else {
      document.title = `${category.title} — HELVETICA-MP`;
    }

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const description = customPage?.metaDescription || category.metaDescription;
    if (description) {
      if (metaDesc) {
        metaDesc.content = description;
      } else {
        const m = document.createElement('meta');
        m.name = 'description';
        m.content = description;
        document.head.appendChild(m);
      }
    }

    // Keywords
    const keywords = category.seoKeywords;
    if (keywords) {
      let metaKw = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
      if (metaKw) {
        metaKw.content = keywords;
      } else {
        const m = document.createElement('meta');
        m.name = 'keywords';
        m.content = keywords;
        document.head.appendChild(m);
      }
    }

    return () => {
      document.title = 'HELVETICA-MP Concept';
      const md = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (md) md.content = '';
    };
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
      {/* Category hero header */}
      <CategoryHeader category={category} />

      {/* Custom page sections (hero, text blocks, etc.) if configured in admin */}
      {customPage && customPage.sections.length > 0 && (
        <div className="mt-0">
          <PageRenderer sections={customPage.sections} />
        </div>
      )}

      {/* Category product listing — hide the generic Shop header since we have our own */}
      <Shop categoryFromSlug={category.title} hideHeader />
    </div>
  );
}
